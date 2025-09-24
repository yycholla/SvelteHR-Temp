import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
	schema: [
		{
			'http://localhost:4000/graphql': {
				headers: {
					'Content-Type': 'application/json'
				}
			}
		}
	],
	documents: [
		'src/**/*.{ts,svelte}',
		'!src/lib/generated/**/*',
		'!src/lib/graphql/hasura-operations.ts.old',
		'src/lib/graphql/*-operations.ts',
		'src/lib/components/**/*.svelte'
	],
	ignoreNoDocuments: true,
	generates: {
		'src/lib/generated/': {
			preset: 'client',
			config: {
				useTypeImports: true,
				enumsAsTypes: true,
				scalars: {
					UUID: 'string',
					Datetime: 'string',
					Date: 'string',
					Time: 'string',
					BigFloat: 'number',
					Decimal: 'number',
					JSON: 'any',
					BigInt: 'number',
					Cursor: 'string',
					Timestamptz: 'string'
				},
				avoidOptionals: {
					field: true,
					inputValue: false,
					object: false,
					defaultValue: false
				},
				nonOptionalTypename: true,
				skipTypename: false,
				documentMode: 'string'
			},
			plugins: []
		},
		'src/lib/generated/schema.graphql': {
			plugins: ['schema-ast'],
			config: {
				includeDirectives: true
			}
		},
		'src/lib/generated/types.ts': {
			plugins: [
				'typescript',
				'typescript-operations',
				{
					'typescript-urql': {
						withComponent: false,
						withHooks: true
					}
				}
			],
			config: {
				useTypeImports: true,
				enumsAsTypes: true,
				scalars: {
					UUID: 'string',
					Datetime: 'string',
					Date: 'string',
					Time: 'string',
					BigFloat: 'number',
					Decimal: 'number',
					JSON: 'any',
					BigInt: 'number',
					Cursor: 'string',
					Timestamptz: 'string'
				},
				avoidOptionals: {
					field: true,
					inputValue: false,
					object: false,
					defaultValue: false
				},
				nonOptionalTypename: true,
				skipTypename: false,
				urqlImportFrom: '@urql/svelte',
				documentMode: 'string'
			}
		}
	},
	hooks: {
		afterOneFileWrite: ['prettier --write']
	}
};

export default config;
