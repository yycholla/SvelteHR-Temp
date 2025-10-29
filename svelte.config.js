import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { optimizeImports } from 'carbon-preprocess-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess(), optimizeImports()],

	kit: {
		// Using adapter-node for Docker/Node.js production deployment
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter({
			// Output to build directory (adapter-node default)
			out: 'build'
		})
	}
};

export default config;
