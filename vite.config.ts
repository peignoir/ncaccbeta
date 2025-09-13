import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: 'dist',
		sourcemap: false,
	},
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'https://app.socap.ai',
				changeOrigin: true,
				secure: false,
				rewrite: (path) => path,
				configure: (proxy, options) => {
					// Explicitly preserve custom headers
					proxy.on('proxyReq', (proxyReq, req, res) => {
						console.log('[Proxy]', req.method, req.url, '->', 'https://app.socap.ai' + proxyReq.path);

						// Check if X-API-KEY header exists in the original request
						const apiKey = req.headers['x-api-key'];
						if (apiKey) {
							console.log('[Proxy] Setting X-API-KEY header:', apiKey.substring(0, 10) + '...');
							// Explicitly set the header on the proxy request
							proxyReq.setHeader('X-API-KEY', apiKey);
						} else {
							console.log('[Proxy] No X-API-KEY header found in request');
						}

						// Log all headers
						console.log('[Proxy] Request headers:', Object.keys(req.headers));
					});
					proxy.on('proxyRes', (proxyRes, req, res) => {
						console.log('[Proxy] Response:', proxyRes.statusCode, 'from', req.url);
					});
					proxy.on('error', (err, req, res) => {
						console.error('[Proxy] Error:', err);
					});
				}
			}
		}
	}
})


