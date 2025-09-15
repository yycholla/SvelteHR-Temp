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
  documents: ['src/**/*.{ts,svelte}', '!src/lib/generated/**/*'],
  ignoreNoDocuments: true,
  generates: {
    'src/lib/generated/': {
      preset: 'client',
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
        documentMode: 'string',
      },
      plugins: [],
    },
    'src/lib/generated/schema.graphql': {
      plugins: ['schema-ast'],
      config: {
        includeDirectives: true,
      },
    },
    'src/lib/generated/types.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        {
          'typescript-urql': {
            withComponent: false,
            withHooks: true,
          },
        },
      ],
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
        urqlImportFrom: '@urql/svelte',
        documentMode: 'string',
      },
    },
  },
  hooks: {
    afterOneFileWrite: ['prettier --write'],
  },
};

export default config;