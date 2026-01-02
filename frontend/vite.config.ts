import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'

// Read package.json for version
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    proxy: {
      '/auth': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/recurring': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
        // Only proxy API calls (paths with subpaths like /recurring/dashboard)
        // Don't proxy the SPA route /recurring itself
        bypass(req) {
          const path = req.url || '';
          // If path is exactly /recurring or /recurring/, don't proxy (return false to skip)
          if (path === '/recurring' || path === '/recurring/') {
            return req.url; // Return the URL to serve it from Vite instead
          }
        },
      },
      '/health': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/security': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
      '/version': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
