/**
 * GraphQL Code Generation Configuration for SvelteHR
 *
 * Generates TypeScript types, operations, and introspection data for comprehensive
 * GraphQL testing and validation with PostGraphile 4.14 backend.
 *
 * Features:
 * - Schema introspection for contract testing
 * - TypeScript type generation for type safety
 * - Urql client integration
 * - Performance monitoring types
 * - Security validation types
 */

import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
	// PostGraphile GraphQL endpoint
	schema: 'http://localhost:4000/graphql',

	// Documents pattern for GraphQL operations
	documents: [
		'src/**/*.{ts,tsx,js,jsx,svelte}',
		'src/lib/graphql/**/*.graphql',
		'src/lib/graphql/**/*.gql',
		'tests/**/*.{ts,tsx,js,jsx}',
		'!src/lib/generated/**/*'
	],

	generates: {
		// Main generated GraphQL types and operations
		'src/lib/generated/graphql.ts': {
			plugins: ['typescript', 'typescript-operations', 'typescript-urql'],
			config: {
				// TypeScript configuration
				scalars: {
					UUID: 'string',
					DateTime: 'string',
					Date: 'string',
					JSON: 'any',
					BigInt: 'number',
					Cursor: 'string'
				},
				strictScalars: true,
				enumsAsTypes: true,
				constEnums: false,

				// Urql integration
				withHooks: true,
				withComponent: false,
				withRefetchFn: true,
				withSubscriptionHooks: true,

				// PostGraphile specific
				namingConvention: {
					typeNames: 'pascal-case#pascalCase',
					transformUnderscore: true
				},

				// Performance and security annotations
				addDocBlocks: true,
				declarationKind: 'interface',
				maybeValue: 'T | null',
				inputMaybeValue: 'T | null | undefined',

				// Testing utilities
				exportFragmentSpreadSubTypes: true,
				dedupeFragments: true,

				// Generate operation metadata for testing
				addOperationExport: true,

				// Security validation
				skipTypename: false,

				// Performance monitoring
				addUnderscoreToArgsType: true
			}
		},

		// Schema introspection for contract testing
		'src/lib/generated/introspection.json': {
			plugins: ['introspection'],
			config: {
				minify: false,
				descriptions: true,
				schemaDescription: true,
				directiveIsRepeatable: true,
				specifiedByUrl: true
			}
		},

		// Schema AST for advanced testing
		'src/lib/generated/schema.graphql': {
			plugins: ['schema-ast'],
			config: {
				includeDirectives: true,
				includeIntrospectionTypes: false,
				commentDescriptions: true,
				sort: true
			}
		},

		// Testing utilities and types
		'tests/generated/test-types.ts': {
			plugins: [
				'typescript',
				{
					add: {
						content: `
              // GraphQL Testing Utilities and Types
              // Generated for comprehensive GraphQL testing

              import type { DocumentNode } from 'graphql';
              import type { TypedDocumentNode } from '@urql/core';

              // Query complexity analysis types
              export interface QueryComplexityConfig {
                maximumComplexity: number;
                depthLimit: number;
                scalarCost: number;
                objectCost: number;
                listFactor: number;
                introspectionCost: number;
              }

              // Performance monitoring types
              export interface GraphQLPerformanceMetrics {
                operationName?: string;
                operationType: 'query' | 'mutation' | 'subscription';
                executionTime: number;
                complexity: number;
                depth: number;
                fieldCount: number;
                errorCount: number;
                cacheHitRatio: number;
              }

              // Security validation types
              export interface GraphQLSecurityValidation {
                isAuthorized: boolean;
                requiredPermissions: string[];
                userPermissions: string[];
                fieldAccessDenied: string[];
                rateLimitStatus: {
                  remaining: number;
                  resetTime: number;
                  limit: number;
                };
              }

              // N+1 query detection
              export interface QueryAnalysis {
                operationName?: string;
                resolverCalls: ResolverCall[];
                potentialNPlusOne: boolean;
                duplicateQueries: string[];
                recommendations: string[];
              }

              export interface ResolverCall {
                fieldName: string;
                parentType: string;
                returnType: string;
                executionTime: number;
                callCount: number;
              }

              // Contract testing types
              export interface SchemaContract {
                version: string;
                checksum: string;
                types: string[];
                queries: string[];
                mutations: string[];
                subscriptions: string[];
                deprecatedFields: DeprecatedField[];
              }

              export interface DeprecatedField {
                type: string;
                field: string;
                reason?: string;
                replacementField?: string;
              }

              // Test operation wrapper
              export interface TestOperation<TData = any, TVariables = any> {
                document: TypedDocumentNode<TData, TVariables>;
                variables?: TVariables;
                expectedComplexity: number;
                expectedDepth: number;
                requiredPermissions?: string[];
                cachePolicy?: 'cache-first' | 'cache-and-network' | 'network-only';
                timeout?: number;
              }
            `
					}
				}
			],
			config: {
				scalars: {
					UUID: 'string',
					DateTime: 'string',
					Date: 'string',
					JSON: 'any',
					BigInt: 'number',
					Cursor: 'string'
				}
			}
		}
	},

	// Hooks for custom processing
	hooks: {
		afterOneFileWrite: ['prettier --write']
	},

	// Plugin configuration
	config: {
		// Skip introspection types in main output
		skipTypename: false,

		// PostGraphile connection pattern
		federation: false,

		// Generate JSDoc comments
		addDocBlocks: true,

		// Optimize for testing
		optimizeDocumentNode: true,

		// Error handling
		strictScalars: true,

		// Performance
		preResolveTypes: true
	},

	// Watch mode configuration
	watch: true,
	watchConfig: {
		usePolling: false,
		interval: 1000,
		ignored: ['node_modules/**/*', 'src/lib/generated/**/*', 'tests/generated/**/*']
	},

	// Verbose output for debugging
	verbose: process.env.NODE_ENV === 'development',

	// Error handling
	silent: false,
	errorsOnly: false,

	// Require introspection to be available
	require: ['dotenv/config'],

	// Custom environment variables
	overwrite: true,

	// Experimental features
	experimental: {
		// Enable experimental features for better testing support
	}
};

export default config;
