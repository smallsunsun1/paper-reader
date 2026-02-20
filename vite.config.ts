import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/arxiv': {
        target: 'https://export.arxiv.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/arxiv/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Vite Proxy] error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('[Vite Proxy] sending Request:', req.method, req.url);
            // 设置必要的 headers
            proxyReq.setHeader('Accept', 'application/atom+xml, application/xml, text/xml, */*');
            proxyReq.setHeader('User-Agent', 'PaperReader/1.0 (Academic Paper Reader)');
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[Vite Proxy] Received Response:', proxyRes.statusCode, req.url);
          });
        },
      },
    },
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    },
  },
})
