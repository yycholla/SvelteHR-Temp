import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'http://localhost:5656/db/main/ext/graphql',
  documents: ['src/**/*.{ts,svelte}', '!src/gql/**/*'],
  ignoreNoDocuments: true,
  generates: {
    './src/gql/': {
      preset: 'client',
      plugins: [],
      config: {
        useTypeImports: true,
        scalars: {
          DateTime: 'string',
          Date: 'string',
          UUID: 'string',
          JSON: 'Record<string, any>',
        },
      },
    },
    './src/gql/schema.json': {
      plugins: ['introspection'],
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;