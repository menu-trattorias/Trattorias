import { createClient } from '@supabase/supabase-js';

const HEALTH_TABLE = 'restaurant_settings';
const DEFAULT_QUERY_TIMEOUT_MS = 5000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const RATE_LIMIT_MAX_ENTRIES = 1000;

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff'
};

// In-isolate rate-limit state for basic protection against abuse
const defaultRateLimitStore = new Map();

const jsonResponse = (body, status, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...BASE_HEADERS,
      ...extraHeaders
    }
  });

const getClientIdentifier = (request) => {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return 'unknown';
};

const checkRateLimit = (clientId, store, now = Date.now(), maxRequests = RATE_LIMIT_MAX_REQUESTS, windowMs = RATE_LIMIT_WINDOW_MS) => {
  // Prune expired entries if the store grows large
  if (store.size >= RATE_LIMIT_MAX_ENTRIES) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
    // If still at capacity, evict the oldest entry
    if (store.size >= RATE_LIMIT_MAX_ENTRIES) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) {
        store.delete(oldestKey);
      }
    }
  }

  const existing = store.get(clientId);
  if (!existing || existing.resetAt <= now) {
    store.set(clientId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > maxRequests) {
    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
};

/**
 * Constant-time string comparison using Web Crypto SHA-256 digests.
 * Hashing equalizes lengths so timing does not leak secret length or content,
 * and works natively in both Cloudflare Workers and Node.js without Node-specific APIs.
 */
const timingSafeEqualString = async (a, b) => {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b))
  ]);

  const bytesA = new Uint8Array(hashA);
  const bytesB = new Uint8Array(hashB);

  let diff = 0;
  for (let i = 0; i < bytesA.length; i += 1) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
};

const createTimedFetch = (timeoutMs, baseFetch = fetch) => async (input, init = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await baseFetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Core health-check handler compatible with Cloudflare Pages Functions and Vite dev server.
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch, rateLimitStore?: Map<string, { count: number, resetAt: number }>, maxRequests?: number, windowMs?: number }} [options]
 * @returns {Promise<Response>}
 */
export async function handleHealthRequest(request, env = {}, options = {}) {
  try {
    // 1. Enforce GET method only
    if (request.method !== 'GET') {
      return jsonResponse(
        {
          status: 'error',
          message: 'Method not allowed'
        },
        405,
        { Allow: 'GET' }
      );
    }

    // 2. Basic per-IP rate limiting
    const rateLimitStore = options.rateLimitStore ?? defaultRateLimitStore;
    const maxRequests = options.maxRequests ?? RATE_LIMIT_MAX_REQUESTS;
    const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, rateLimitStore, Date.now(), maxRequests, windowMs);

    if (!rateLimit.allowed) {
      return jsonResponse(
        {
          status: 'error',
          message: 'Too many requests'
        },
        429,
        { 'Retry-After': String(rateLimit.retryAfterSeconds) }
      );
    }

    // 3. Validate private health-check token header
    const providedToken = request.headers.get('x-health-token');
    if (!providedToken) {
      return jsonResponse(
        {
          status: 'unauthorized',
          message: 'Invalid health-check token'
        },
        401
      );
    }

    const expectedToken = typeof env?.HEALTH_CHECK_TOKEN === 'string' ? env.HEALTH_CHECK_TOKEN.trim() : '';
    if (!expectedToken) {
      // Fail closed without leaking server configuration details
      return jsonResponse(
        {
          status: 'error',
          database: 'disconnected',
          verified: false,
          timestamp: new Date().toISOString()
        },
        500
      );
    }

    const isTokenValid = await timingSafeEqualString(providedToken, expectedToken);
    if (!isTokenValid) {
      return jsonResponse(
        {
          status: 'unauthorized',
          message: 'Invalid health-check token'
        },
        401
      );
    }

    // 4. Resolve existing Supabase project credentials (prefer server-side env vars, fall back to VITE_* vars)
    const supabaseUrl = typeof (env?.SUPABASE_URL ?? env?.VITE_SUPABASE_URL) === 'string'
      ? (env.SUPABASE_URL || env.VITE_SUPABASE_URL).trim()
      : '';
    const supabaseKey = typeof (env?.SUPABASE_ANON_KEY ?? env?.VITE_SUPABASE_ANON_KEY) === 'string'
      ? (env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY).trim()
      : '';

    if (!supabaseUrl || !supabaseKey || !isValidHttpUrl(supabaseUrl)) {
      return jsonResponse(
        {
          status: 'error',
          database: 'disconnected',
          verified: false,
          timestamp: new Date().toISOString()
        },
        500
      );
    }

    // 5. Execute lightweight, read-only SELECT query with timeout against Supabase
    const timeoutMs = options.timeoutMs ?? DEFAULT_QUERY_TIMEOUT_MS;
    const timedFetch = createTimedFetch(timeoutMs, options.fetchImpl ?? fetch);

    try {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          fetch: timedFetch
        }
      });

      const { data, error } = await supabase
        .from(HEALTH_TABLE)
        .select('id')
        .limit(1);

      if (error || !Array.isArray(data)) {
        return jsonResponse(
          {
            status: 'error',
            database: 'disconnected',
            verified: false,
            timestamp: new Date().toISOString()
          },
          503
        );
      }

      return jsonResponse(
        {
          status: 'ok',
          database: 'connected',
          verified: true,
          timestamp: new Date().toISOString()
        },
        200
      );
    } catch {
      return jsonResponse(
        {
          status: 'error',
          database: 'disconnected',
          verified: false,
          timestamp: new Date().toISOString()
        },
        503
      );
    }
  } catch {
    return jsonResponse(
      {
        status: 'error',
        database: 'disconnected',
        verified: false,
        timestamp: new Date().toISOString()
      },
      500
    );
  }
}

/**
 * Cloudflare Pages Function entry point for /api/health
 */
export async function onRequest(context) {
  return handleHealthRequest(context.request, context.env);
}
