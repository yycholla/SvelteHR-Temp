import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					environment: 'browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						instances: [{ browser: 'chromium' }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				}
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	},
	server: {
		// https: {
		// key: fs.readFileSync('../MountainHR-Backend/certs/server.key'),
		// cert: fs.readFileSync('../MountainHR-Backend/certs/server.crt')
		// },
		host: '0.0.0.0', // Allow external connections (required for Docker)
		port: 5173,
		cors: true,
		watch: {
			usePolling: true, // Better file watching in Docker environments
			interval: 100, // Faster polling for quicker updates
			ignored: ['!**/node_modules/**']
		},
		allowedHosts: [
			'mcp-0085.dropbear-elnath.ts.net',
			'100.71.207.7', // Tailscale IP
			'localhost'
		]
	}
});
