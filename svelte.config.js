import { mdsvex } from 'mdsvex';
import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), mdsvex()],
	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		alias: {
			'@/+': './src/lib/+'
		},
		adapter: adapter(),
		
		// Performance and SEO optimizations
		prerender: {
			// Prerender static pages for better performance
			entries: ['/login', '/privacy', '/terms'],
			handleHttpError: 'warn'
		},
		
		// Service worker for offline support and caching
		serviceWorker: {
			register: true
		},
		
		// CSP disabled for development (enable in production)
		// csp: {
		// 	mode: 'hash',
		// 	directives: {
		// 		'script-src': ['self', 'strict-dynamic'],
		// 		'object-src': ['none'],
		// 		'base-uri': ['self']
		// 	}
		// },
		
		// Output optimization
		output: {
			preloadStrategy: 'modulepreload'
		}
	},
	
	// Compiler optimizations
	compilerOptions: {
		// Enable hydration optimizations in production
		hydratable: true,
		// CSS optimizations
		css: 'injected'
	},
	
	extensions: ['.svelte', '.svx']
};

export default config;
