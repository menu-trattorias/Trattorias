import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleHealthRequest } from './functions/api/health.js';

const healthCheckDevPlugin = (env) => ({
  name: 'trattorias-health-check-dev',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const urlPath = (req.url || '').split('?')[0];
      if (urlPath !== '/api/health') {
        return next();
      }

      try {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (Array.isArray(value)) {
            value.forEach((entry) => headers.append(key, entry));
          } else if (typeof value === 'string') {
            headers.set(key, value);
          }
        }
        if (!headers.has('x-forwarded-for') && req.socket?.remoteAddress) {
          headers.set('x-forwarded-for', req.socket.remoteAddress);
        }

        const request = new Request(`http://localhost${req.url}`, {
          method: req.method || 'GET',
          headers
        });

        const response = await handleHealthRequest(request, env);
        res.statusCode = response.status;
        response.headers.forEach((value, key) => {
          res.setHeader(key, value);
        });
        res.end(await response.text());
      } catch {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            status: 'error',
            database: 'disconnected',
            verified: false,
            timestamp: new Date().toISOString()
          })
        );
      }
    });
  }
});

export default defineConfig(({ mode }) => {
  // Loaded strictly on the Node.js dev server side; Vite only exposes VITE_* vars to the browser bundle
  const serverEnv = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), healthCheckDevPlugin(serverEnv)],
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-icons': ['lucide-react']
          }
        }
      }
    }
  };
});
