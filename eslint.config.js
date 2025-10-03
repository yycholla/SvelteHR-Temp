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
			'@typescript-eslint/prefer-nullish-coalescing': 'error',
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
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
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
