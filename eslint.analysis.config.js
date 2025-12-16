import baseConfig from './eslint.config.js';

export default [
	...baseConfig,
	{
		files: ['src/**/*.{js,ts,svelte}'],
		rules: {
			complexity: ['warn', 10],
			'max-lines': ['warn', 500],
			'max-depth': ['warn', 4],
			'max-params': ['warn', 4],
			// Disable unused vars checking for TypeScript files
			// Per ESLint documentation: "We strongly recommend you do not use the no-unused-vars
			// or @typescript-eslint/no-unused-vars lint rule on TypeScript projects."
			// TypeScript's own compiler (tsc/svelte-check) handles this more accurately.
			// See: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-unused-vars-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'@typescript-eslint/no-unused-vars': 'off'
		}
	}
];
