import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Enhanced preprocessing for modern development
	preprocess: [
		vitePreprocess({
			// TypeScript preprocessing with Svelte 5.0 runes
			typescript: {
				tsconfigFile: './tsconfig.json'
			},
			// PostCSS for Tailwind CSS 4.0
			postcss: true
		}), 
		mdsvex({
			// MDSvex configuration for documentation
			extensions: ['.svx'],
			layout: {
				_: './src/lib/components/layouts/MdsvexLayout.svelte'
			}
		})
	],
	
	kit: {
		// Comprehensive path aliases for clean imports
		alias: {
			'@': './src',
			'@/lib': './src/lib',
			'@/components': './src/lib/components',
			'@/stores': './src/lib/stores',
			'@/utils': './src/lib/utils',
			'@/types': './src/lib/types',
			'@/graphql': './src/lib/graphql',
			'@/auth': './src/lib/auth',
			'@/api': './src/lib/api',
			'@/+': './src/lib/+'
		},
		
		adapter: adapter({
			// Enhanced adapter configuration
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: false,
			strict: true
		}),
		
		// Advanced routing configuration
		files: {
			assets: 'static',
			hooks: {
				client: 'src/hooks.client.ts',
				server: 'src/hooks.server.ts',
				universal: 'src/hooks.ts'
			},
			lib: 'src/lib',
			params: 'src/params',
			routes: 'src/routes',
			serviceWorker: 'src/service-worker.ts',
			appTemplate: 'src/app.html',
			errorTemplate: 'src/error.html'
		},
		
		// Enhanced prerendering for SEO and performance
		prerender: {
			entries: [
				'/',
				'/login',
				'/login-simple', 
				'/login-working',
				'/privacy',
				'/terms',
				'/auth/reset-password',
				'/offline'
			],
			handleHttpError: ({ path, referrer, message }) => {
				// Custom error handling for prerendering
				if (path.startsWith('/api/') || path.startsWith('/auth/')) {
					// Skip API routes and auth callbacks
					return;
				}
				console.warn(`Prerender error on ${path}: ${message}`);
			},
			handleMissingId: 'warn',
			concurrency: 5
		},
		
		// Service worker for offline-first experience
		serviceWorker: {
			register: true,
			files: (filepath) => !/\.DS_Store/.test(filepath)
		},
		
		// Production CSP configuration - temporarily disabled during migration
		// csp: {
		// 	mode: 'hash',
		// 	directives: {
		// 		'default-src': ['self'],
		// 		'script-src': ['self', 'strict-dynamic'],
		// 		'style-src': ['self', 'unsafe-inline'],
		// 		'img-src': ['self', 'data:', 'https:'],
		// 		'font-src': ['self', 'https:'],
		// 		'connect-src': ['self', 'wss:', 'https:'],
		// 		'media-src': ['self'],
		// 		'object-src': ['none'],
		// 		'frame-src': ['self'],
		// 		'worker-src': ['self'],
		// 		'manifest-src': ['self'],
		// 		'base-uri': ['self'],
		// 		'form-action': ['self']
		// 	},
		// 	reportOnly: process.env.NODE_ENV === 'development' ? {
		// 		'default-src': ['self'],
		// 		'script-src': ['self', 'strict-dynamic', 'unsafe-eval'],
		// 		'style-src': ['self', 'unsafe-inline'],
		// 		'img-src': ['self', 'data:', 'https:'],
		// 		'font-src': ['self', 'https:'],
		// 		'connect-src': ['self', 'wss:', 'https:'],
		// 		'media-src': ['self'],
		// 		'object-src': ['none'],
		// 		'frame-src': ['self'],
		// 		'worker-src': ['self'],
		// 		'manifest-src': ['self'],
		// 		'base-uri': ['self'],
		// 		'form-action': ['self']
		// 	} : false
		// },
		
		// Advanced output configuration
		output: {
			preloadStrategy: 'modulepreload'
		},
		
		// Environment variable configuration
		env: {
			dir: process.cwd(),
			publicPrefix: 'PUBLIC_',
			privatePrefix: 'PRIVATE_'
		},
		
		// Enhanced version management
		version: {
			name: process.env.npm_package_version || 'dev',
			pollInterval: 60000 // Check for updates every minute
		},
		
		// TypeScript configuration
		typescript: {
			config: (config) => {
				return {
					...config,
					include: [
						...config.include,
						'../src/**/*',
						'../tests/**/*'
					],
					compilerOptions: {
						...config.compilerOptions,
						strict: true,
						noImplicitReturns: true,
						noImplicitOverride: true,
						exactOptionalPropertyTypes: true
					}
				};
			}
		}
	},
	
	// Minimal compiler options for Svelte 5 compatibility
	compilerOptions: {
		// Let Vite and SvelteKit handle optimization
		dev: process.env.NODE_ENV === 'development'
	},
	
	// File extensions for preprocessing
	extensions: ['.svelte', '.svx'],
	
	// Enhanced Vite integration
	vite: {
		define: {
			// Build-time environment variables
			__APP_VERSION__: JSON.stringify(process.env.npm_package_version || 'dev'),
			__BUILD_TIME__: JSON.stringify(new Date().toISOString()),
			__DEV__: process.env.NODE_ENV === 'development'
		},
		optimizeDeps: {
			// Pre-bundle dependencies for faster dev server
			include: [
				'graphql',
				'@graphql-codegen/client-preset',
				'date-fns',
				'zod',
				'clsx',
				'tailwind-merge'
			],
			exclude: ['@sveltejs/kit', 'svelte']
		},
		server: {
			// Development server configuration
			host: '0.0.0.0',
			port: 5173,
			strictPort: false,
			// Proxy API calls to backend during development
			proxy: {
				'/api/v2': {
					target: process.env.PUBLIC_API_URL || 'http://localhost:8080',
					changeOrigin: true,
					secure: false,
					configure: (proxy, options) => {
						// Add authentication forwarding
						proxy.on('proxyReq', (proxyReq, req, res) => {
							// Forward cookies and auth headers
							if (req.headers.cookie) {
								proxyReq.setHeader('Cookie', req.headers.cookie);
							}
							if (req.headers.authorization) {
								proxyReq.setHeader('Authorization', req.headers.authorization);
							}
						});
					}
				}
			}
		},
		build: {
			// Production build optimizations
			target: 'es2022',
			minify: 'terser',
			sourcemap: true,
			rollupOptions: {
				output: {
					// Chunk splitting for better caching
					manualChunks: {
						vendor: ['svelte', '@sveltejs/kit'],
						ui: ['tailwind-merge', 'clsx'],
						graphql: ['graphql', '@urql/svelte'],
						utils: ['date-fns', 'zod']
					}
				}
			}
		}
	}
};

export default config;
