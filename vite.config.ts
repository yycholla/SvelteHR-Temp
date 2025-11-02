import devtoolsJson from 'vite-plugin-devtools-json';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import { optimizeCss } from 'carbon-preprocess-svelte';
import tailwindcss from '@tailwindcss/vite';

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
		tailwindcss(),
		sveltekit(),
		// devtoolsJson(), // Disabled to remove debugging UI overlay
		disableCompression(),
		optimizeCss({
			verbose: true, // Enable size logging for development
			preserveAllIBMFonts: true // Preserve all IBM Plex font face rules
		}),
		devtoolsJson()
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
				}
				// Note: chunkFileNames and assetFileNames are managed by SvelteKit
				// and should not be overridden here to avoid conflicts
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

		// Allow Tailscale MagicDNS hostnames for remote development access
		allowedHosts: [
			'.ts.net', // Allow all Tailscale MagicDNS domains
			'localhost',
			'127.0.0.1',
			'192.168.1.129' // Local network IP (Traefik)
		],

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
	// IMPORTANT: Do NOT define LOG_LEVEL/LOG_FORMAT here - they should be read at runtime, not build time
	define: {
		'process.env.VITE_DISABLE_COMPRESSION': JSON.stringify('true')
	},

	// Performance monitoring
	esbuild: {
		// IMPORTANT: Do NOT drop console logs - we need them for production logging
		// Only drop debugger statements
		drop: process.env.NODE_ENV === 'production' ? ['debugger'] : []
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
