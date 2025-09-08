import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), devtoolsJson()],
	
	// Performance optimizations
	build: {
		target: 'esnext',
		minify: 'esbuild',
		sourcemap: true,
		rollupOptions: {
			output: {
				// Manual chunk splitting for better caching
				manualChunks: {
					// Vendor chunks
					'vendor-ui': ['@skeletonlabs/skeleton', '@skeletonlabs/skeleton-svelte'],
					'vendor-forms': ['zod', 'sveltekit-superforms'],
					'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
					
					// Feature-based chunks
					'auth': ['src/lib/services/auth.service.ts', 'src/lib/stores/auth.ts'],
					'employees': ['src/lib/services/employee.service.ts'],
					'communications': ['src/lib/services/communication.service.ts'],
					'ui-components': [
						'src/lib/components/ui/Button.svelte',
						'src/lib/components/ui/Input.svelte',
						'src/lib/components/ui/Form.svelte',
						'src/lib/components/ui/DataTable.svelte',
						'src/lib/components/ui/Modal.svelte'
					]
				},
				// Optimize chunk naming
				chunkFileNames: 'chunks/[name]-[hash].js',
				entryFileNames: 'entries/[name]-[hash].js',
				assetFileNames: 'assets/[name]-[hash].[ext]'
			}
		},
		// Enable gzip compression
		cssCodeSplit: true,
		// Optimize dependencies
		commonjsOptions: {
			include: [/node_modules/]
		}
	},
	
	// Development optimizations
	optimizeDeps: {
		include: [
			'zod',
			'date-fns',
			'clsx',
			'tailwind-merge'
		],
		exclude: ['@sveltejs/kit', 'svelte', '@skeletonlabs/skeleton', '@skeletonlabs/skeleton-svelte']
	},
	
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
		host: true, // Listen on all available interfaces (IPv4 and IPv6)
		port: 4000,
		cors: true,
		strictPort: false, // Allow port changes if 5173 is busy
		headers: {
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': '*'
		},
		watch: {
			usePolling: true, // Better file watching in Docker environments
			interval: 100, // Faster polling for quicker updates
			ignored: ['!**/node_modules/**']
		},
		allowedHosts: 'all' // Allow all hosts for development
	}
});
