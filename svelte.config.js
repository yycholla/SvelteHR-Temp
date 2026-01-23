import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess()],

	kit: {
		// Using adapter-node for Docker/Node.js production deployment
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),

		alias: {
			$routes: './src/routes',
			$domain: './src/domain',
			'$domain/*': './src/domain/*',
			$services: './src/services',
			'$services/*': './src/services/*',
			$adapters: './src/adapters',
			'$adapters/*': './src/adapters/*'
		},

		experimental: {
			tracing: {
				server: true
			},

			instrumentation: {
				server: true
			}
		}
	}
};

export default config;
