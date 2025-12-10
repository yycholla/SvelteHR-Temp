import baseConfig from './eslint.config.js';

export default [
	...baseConfig,
	{
		files: ['src/**/*.{js,ts,svelte}'],
		rules: {
			complexity: ['warn', 10],
			'max-lines': ['warn', 500],
			'max-depth': ['warn', 4],
			'max-params': ['warn', 4]
		}
	}
];
