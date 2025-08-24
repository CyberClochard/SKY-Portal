import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/supabase': {
        target: 'http://localhost:54321',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase/, ''),
      },
      '/n8n-webhook': {
        target: 'https://n8n.skylogistics.fr',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/n8n-webhook/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Log des paramètres de requête
            if (req.url) {
              console.log('Original URL:', req.url);
              console.log('Rewritten URL:', proxyReq.path);
            }
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            console.log('Response Headers:', proxyRes.headers);
          });
        },
        // Ajouter des options pour mieux gérer les paramètres
        secure: true,
        timeout: 30000,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react-pdf', 'pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
          pdf: ['react-pdf', 'pdfjs-dist']
        }
      }
    }
  },
  base: './'
});