import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: [
    {
      'http://localhost:8080/v1/graphql': {
        headers: {
          'X-Hasura-Admin-Secret': process.env.HASURA_ADMIN_SECRET || '',
        },
      },
    },
  ],
  generates: {
    'src/lib/generated/schema.graphql': {
      plugins: ['schema-ast'],
    },
    'src/lib/generated/types.ts': {
      plugins: ['typescript'],
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: {
          uuid: 'string',
          timestamptz: 'string',
          date: 'string',
          numeric: 'number',
          jsonb: 'any',
        },
        avoidOptionals: {
          field: true,
          inputValue: false,
          object: false,
          defaultValue: false,
        },
        nonOptionalTypename: true,
        skipTypename: false,
      },
    },
  },
};

export default config;