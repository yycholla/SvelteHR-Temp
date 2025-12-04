import prettier from 'eslint-config-prettier';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import svelteConfig from './svelte.config.js';

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

export default ts.config(
	includeIgnoreFile(gitignorePath),
	{
		ignores: [
			'.claude/**/*',
			'dist/**/*',
			'build/**/*',
			'.svelte-kit/**/*',
			'scripts/**/*', // Exclude all scripts from linting (utility files)
			'tools/**/*', // Exclude tools directory (schema-validator, etc.)
			'*.config.{js,cjs,mjs,ts}', // Exclude all config files
			'*.{cjs,mjs}',
			'**/*.js', // Exclude all .js files from TypeScript type-aware linting
			'codegen.ts', // GraphQL codegen config
			'playwright.config.ts', // Playwright config
			'vitest*.ts' // Vitest config files
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',

			// HR-specific code quality rules
			'prefer-const': 'error',
			'no-var': 'error',
			'object-shorthand': 'error',
			'prefer-arrow-callback': 'error',

			// TypeScript specific rules for HR domain
			'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-explicit-any': 'warn',
			// TODO: Re-enable after fixing || to ?? conversions across codebase
			'@typescript-eslint/prefer-nullish-coalescing': 'off',
			'@typescript-eslint/prefer-optional-chain': 'error',

			// Import organization for better structure
			'sort-imports': [
				'error',
				{
					ignoreCase: false,
					ignoreDeclarationSort: true,
					ignoreMemberSort: false
				}
			]
		}
	},
	// HR-specific file patterns and rules
	{
		files: ['src/lib/graphql/**/*.ts'],
		rules: {
			// Enforce proper GraphQL operation naming conventions
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'variableLike',
					format: ['camelCase', 'UPPER_CASE'],
					filter: {
						regex: '^(GET_|CREATE_|UPDATE_|DELETE_).*',
						match: true
					}
				}
			]
		}
	},
	{
		files: ['src/lib/components/**/*.svelte'],
		rules: {
			// Component-specific rules
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					varsIgnorePattern: '^(\\$\\$Props|\\$\\$Events|\\$\\$Slots)$'
				}
			]
		}
	},
	// Audit logging modules: Security-critical code with strict rules
	{
		files: ['src/lib/server/audit/**/*.ts', 'src/lib/audit/**/*.ts'],
		rules: {
			// Enforce no 'any' types in security-critical audit code
			'@typescript-eslint/no-explicit-any': 'error',

			// Require explicit return types for audit functions
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					allowExpressions: false,
					allowTypedFunctionExpressions: true
				}
			],

			// Enforce proper error handling patterns
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/promise-function-async': 'error',

			// Naming conventions for audit operations
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'function',
					format: ['camelCase'],
					custom: {
						regex: '^(sign|verify|rollback|archive|export)[A-Z]',
						match: true
					}
				}
			],

			// Prevent console.log in production audit code
			'no-console': 'error',

			// Enforce safe type assertions
			'@typescript-eslint/consistent-type-assertions': [
				'error',
				{
					assertionStyle: 'as',
					objectLiteralTypeAssertions: 'never'
				}
			]
		}
	},
	// Authentication modules: Security-critical code with strict rules
	// NOTE: Excluding auth/config.ts from strictest rules as it contains many utility functions
	{
		files: ['src/lib/stores/auth.ts', 'src/hooks.server.ts'],
		rules: {
			// Enforce no 'any' types in security-critical auth code
			'@typescript-eslint/no-explicit-any': 'error',

			// Require explicit return types for auth functions
			// NOTE: Relaxed to allow type inference for simple utility functions
			'@typescript-eslint/explicit-function-return-type': [
				'error',
				{
					allowExpressions: true, // Allow arrow functions without explicit return types
					allowTypedFunctionExpressions: true,
					allowHigherOrderFunctions: true,
					allowDirectConstAssertionInArrowFunctions: true
				}
			],

			// Enforce proper error handling patterns
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/promise-function-async': 'error',

			// Prevent console.log in production auth code (use proper logging)
			'no-console': 'error',

			// Enforce safe type assertions
			'@typescript-eslint/consistent-type-assertions': [
				'error',
				{
					assertionStyle: 'as',
					objectLiteralTypeAssertions: 'never'
				}
			]

			// NOTE: Removed overly restrictive naming-convention rule that blocked
			// legitimate utility functions like isRateLimited, getCacheKey, etc.
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js', '**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser,
				svelteConfig
			}
		}
	}
);
