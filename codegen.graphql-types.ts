import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
	schema: 'http://localhost:8000/graphql',
	documents: ['src/**/*.graphql', 'src/**/*.ts'],
	generates: {
		'src/domain/generated/graphql-types.ts': {
			plugins: ['typescript', 'typescript-operations'],
			config: {
				skipTypename: false,
				withHooks: false,
				withComponent: false,
				withHOC: false,
				enumsAsTypes: true,
				scalars: {
					DateTime: 'string',
					Date: 'string',
					JSON: 'Record<string, unknown>',
					UUID: 'string'
				},
				avoidOptionals: {
					field: false,
					inputValue: false,
					object: false
				},
				maybeValue: 'T | null'
			}
		}
	}
};

export default config;
