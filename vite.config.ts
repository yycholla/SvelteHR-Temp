import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { optimizeCss } from 'carbon-preprocess-svelte';

// Custom plugin to disable compression completely
const disableCompression = () => ({
	name: 'disable-compression',
	configureServer(server) {
		// Disable compression middleware at the server level
		server.middlewares.use((req, res, next) => {
			// Force identity encoding
			req.headers['accept-encoding'] = 'identity';

			// Override write methods to prevent compression
			const originalWrite = res.write;
			const originalEnd = res.end;
			const originalSetHeader = res.setHeader;

			res.setHeader = function (name, value) {
				const lowerName = name.toLowerCase();
				if (lowerName === 'content-encoding' || lowerName === 'transfer-encoding') {
					return this; // Skip compression headers
				}
				return originalSetHeader.call(this, name, value);
			};

			// Ensure no compression flags are set
			res.compress = false;

			next();
		});
	}
});

export default defineConfig({
	plugins: [
		sveltekit(),
		// devtoolsJson(), // Disabled to remove debugging UI overlay
		disableCompression(),
		optimizeCss({
			verbose: true, // Enable size logging for development
			preserveAllIBMFonts: true // Preserve all IBM Plex font face rules
		})
	],

	// Performance optimizations
	build: {
		target: 'esnext',
		minify: 'esbuild',
		sourcemap: true,
		rollupOptions: {
			output: {
				// Manual chunk splitting for optimal loading (simplified for SvelteKit compatibility)
				manualChunks: {
					// Only include packages that are not treated as external by SvelteKit
					vendor: ['svelte']
				},

				// Optimize chunk file names
				chunkFileNames: (chunkInfo) => {
					const facadeModuleId = chunkInfo.facadeModuleId || '';

					if (facadeModuleId.includes('node_modules')) {
						return 'vendor/[name]-[hash].js';
					} else if (facadeModuleId.includes('src/routes')) {
						return 'routes/[name]-[hash].js';
					} else if (facadeModuleId.includes('src/lib/components')) {
						return 'components/[name]-[hash].js';
					}

					return 'chunks/[name]-[hash].js';
				},

				assetFileNames: (assetInfo) => {
					const info = assetInfo.name!.split('.');
					const ext = info[info.length - 1];

					if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
						return 'images/[name]-[hash][extname]';
					} else if (/woff2?|eot|ttf|otf/i.test(ext)) {
						return 'fonts/[name]-[hash][extname]';
					} else if (ext === 'css') {
						return 'styles/[name]-[hash][extname]';
					}

					return 'assets/[name]-[hash][extname]';
				}
			},

			// Optimize tree shaking
			treeshake: {
				moduleSideEffects: false,
				propertyReadSideEffects: false,
				unknownGlobalSideEffects: false
			}
		},

		// Enable compression
		reportCompressedSize: true,
		chunkSizeWarningLimit: 1000,

		// Asset optimization
		assetsInlineLimit: 4096, // Inline assets smaller than 4kb

		// CSS optimization
		cssCodeSplit: true,
		cssMinify: true
	},

	// Optimize dependencies
	optimizeDeps: {
		include: [
			'@urql/svelte',
			'@urql/core',
			'graphql',
			'svelte/store',
			'svelte/animate',
			'svelte/easing',
			'svelte/transition',
			'carbon-components-svelte',
			'carbon-icons-svelte',
			'@vincjo/datatables'
		],
		exclude: ['@sveltejs/kit', 'jsonwebtoken']
	},

	// Prevent server-only packages from being bundled for client
	ssr: {
		noExternal: [],
		external: ['jsonwebtoken', 'crypto']
	},

	// Resolve aliases for cleaner imports
	resolve: {
		alias: {
			$components: resolve('./src/lib/components'),
			$services: resolve('./src/lib/services'),
			$utils: resolve('./src/lib/utils'),
			$stores: resolve('./src/lib/stores'),
			$types: resolve('./src/lib/types'),
			$graphql: resolve('./src/lib/graphql')
		}
	},

	// Development server optimizations
	server: {
		port: 5173, // Fixed port to match Docker mapping

		proxy: {
			// Note: GraphQL requests now handled by SvelteKit API route at /api/graphql
			// No proxy needed as we have a custom GraphQL server implementation
		},

		// Disable compression completely
		middlewareMode: false,
		compression: false,

		// Enable HTTP/2 for development
		https: false, // Set to true with cert/key for HTTPS

		// Optimize HMR
		hmr: {
			overlay: true
		},

		// Faster rebuilds
		fs: {
			allow: ['..']
		}
	},

	// Define custom plugin to disable compression
	define: {
		'process.env.VITE_DISABLE_COMPRESSION': 'true'
	},

	// Performance monitoring
	esbuild: {
		// Remove console logs in production
		drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
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
	}
});
