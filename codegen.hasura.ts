import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: [
    {
      'http://localhost:8080/v1/graphql': {
        headers: {
          'X-Hasura-Admin-Secret': 'svelteHR-hasura-admin-secret-2024',
        },
      },
    },
  ],
  documents: [
    'src/lib/graphql/hasura-operations.ts'
  ],
  ignoreNoDocuments: true,
  generates: {
    './src/lib/generated/hasura.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-urql'
      ],
      config: {
        withHooks: true,
        withComponent: false,
        scalars: {
          uuid: 'string',
          timestamptz: 'string',
          date: 'string',
          numeric: 'number',
          bigint: 'number',
          smallint: 'number',
          integer: 'number',
          text: 'string',
          jsonb: 'Record<string, any>',
          _text: 'string[]',
          _uuid: 'string[]',
          _timestamptz: 'string[]',
          _date: 'string[]',
          _numeric: 'number[]',
          _bigint: 'number[]',
          _smallint: 'number[]',
          _integer: 'number[]',
          _jsonb: 'Record<string, any>[]',
          onboarding_status: "'PreHire' | 'Onboarding' | 'Active' | 'Terminated'",
          employment_type: "'FullTime' | 'PartTime' | 'Contract' | 'Intern' | 'Consultant'"
        },
        avoidOptionals: false,
        maybeValue: 'T | null | undefined',
        inputMaybeValue: 'T | null | undefined',
        namingConvention: 'keep',
        useTypeImports: true,
        dedupeFragments: true,
        pureMagicComment: true,
      },
    },
    './src/lib/generated/hasura.schema.json': {
      plugins: ['introspection'],
      config: {
        minify: true,
      },
    },
  },
  hooks: {
    afterAllFileWrite: ['prettier --write'],
  },
};

export default config;