import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter(),
		alias: {
			'@/*': './src/lib/*',
			'$lib/*': './src/lib/*',
			'$components/*': './src/lib/components/*',
			'$services/*': './src/lib/services/*',
			'$types/*': './src/lib/types/*'
		},
		files: {
			lib: 'src/lib'
		},
		serviceWorker: {
			register: false
		},
		env: {
			publicPrefix: 'VITE_',
			privatePrefix: 'PRIVATE_'
		}
	}
};

export default config;