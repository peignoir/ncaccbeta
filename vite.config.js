import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    build: {
        outDir: 'dist',
        sourcemap: false,
    },
    server: {
        port: 5173,
        proxy: {
            '/api/v1': {
                target: 'https://dev.socap.ai',
                changeOrigin: true,
                secure: false,
                configure: function (proxy, options) {
                    proxy.on('proxyReq', function (proxyReq, req, res) {
                        console.log('[Proxy]', req.method, req.url, '->', options.target + proxyReq.path);
                    });
                    proxy.on('proxyRes', function (proxyRes, req, res) {
                        console.log('[Proxy] Response:', proxyRes.statusCode, 'from', req.url);
                    });
                    proxy.on('error', function (err, req, res) {
                        console.error('[Proxy] Error:', err);
                    });
                }
            }
        }
    }
});
