import { getSupabase } from './supabase.js';

/**
 * Check whether a Supabase user has admin privileges.
 * 
 * 1. Confirms the user is a valid authenticated Supabase auth user.
 * 2. If VITE_ADMIN_EMAILS is configured in environment, verifies the user's
 *    email is in the approved admin list or has an explicit admin role in metadata.
 * 
 * @param {Object} user - Supabase auth user object
 * @returns {boolean}
 */
export const isUserAuthorizedAdmin = (user) => {
  if (!user || (!user.id && !user.email)) {
    return false;
  }

  // Ensure role or audience is authenticated
  const isAuthRole = user.role === 'authenticated' || user.aud === 'authenticated';
  if (!isAuthRole) {
    return false;
  }

  // Explicit role-based check if present in user metadata
  const metaRole = user.app_metadata?.role || user.user_metadata?.role;
  if (metaRole === 'admin') {
    return true;
  }
  if (metaRole && metaRole !== 'admin' && metaRole !== 'authenticated') {
    // If an explicit non-admin role is assigned, deny access
    return false;
  }

  // Optional email allowlist check via environment variable
  const adminEmailsEnv = import.meta.env.VITE_ADMIN_EMAILS;
  if (adminEmailsEnv && adminEmailsEnv.trim()) {
    const allowedEmails = adminEmailsEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (allowedEmails.length > 0) {
      const userEmail = (user.email || '').trim().toLowerCase();
      return allowedEmails.includes(userEmail);
    }
  }

  // Default: Any authenticated Supabase auth user in this project is authorized
  return true;
};

/**
 * Actively verify the current session with the Supabase Auth server.
 * Unlike getSession() (which only reads unverified localStorage),
 * getUser() performs a network verification with the Supabase backend.
 * 
 * @returns {Promise<{ user: Object|null, isAuthorized: boolean, error: Error|null }>}
 */
export const verifyAdminSession = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return { user: null, isAuthorized: false, error: new Error('Supabase is not configured') };
  }

  try {
    // 1. Get the session from storage
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session) {
      return { user: null, isAuthorized: false, error: sessionErr || null };
    }

    // 2. Actively validate with the Supabase Auth server
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      // Session token is invalid, expired, or user deleted: clean up local session
      await supabase.auth.signOut();
      return { user: null, isAuthorized: false, error: userErr || new Error('Invalid user session') };
    }

    // 3. Verify admin authorization
    const authorized = isUserAuthorizedAdmin(userData.user);
    if (!authorized) {
      await supabase.auth.signOut();
      return {
        user: null,
        isAuthorized: false,
        error: new Error('Access denied: Account is not authorized for administration.')
      };
    }

    return { user: userData.user, isAuthorized: true, error: null };
  } catch (err) {
    console.error('Session verification error:', err);
    try {
      await supabase.auth.signOut();
    } catch (_) {}
    return { user: null, isAuthorized: false, error: err };
  }
};
