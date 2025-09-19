import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['./src/lib/test-setup.ts']
	},
	server: {
		host: '0.0.0.0',
		port: 5173,
		proxy: {
			'/api/graphql': {
				target: 'http://localhost:8080/v1/graphql',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/graphql/, '')
			},
			'/api/auth': {
				target: 'http://localhost:3001/auth',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api\/auth/, '')
			}
		}
	},
	define: {
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
	}
});
