/**
 * GraphQL Code Generation Configuration for SvelteHR
 *
 * Generates TypeScript types, operations, and introspection data for comprehensive
 * GraphQL testing and validation with Rust GraphQL backend (Sea-ORM + async-graphql).
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
	// Rust GraphQL backend endpoint (Sea-ORM + async-graphql)
	schema: 'http://localhost:4000/graphql',

	// Documents pattern for GraphQL operations
	documents: [
		'src/lib/graphql/**/*.ts',
		'src/routes/**/*.svelte',
		'tests/**/*.{ts,tsx,js,jsx}',
		'!src/lib/generated/**/*',
		'!src/routes/api/**/*' // Exclude API routes with inline GraphQL operations
	],

	// Temporarily disabled - operations need to be updated to match Rust schema
	generates: {},

	// Hooks for custom processing
	hooks: {
		afterOneFileWrite: ['prettier --write']
	},

	// Plugin configuration
	config: {
		// Skip introspection types in main output
		skipTypename: false,

		// Rust GraphQL backend connection pattern
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

	// Verbose output for debugging
	verbose: process.env.NODE_ENV === 'development',

	// Error handling
	silent: false,
	errorsOnly: false,

	// Require introspection to be available
	require: ['dotenv/config'],

	// Custom environment variables
	overwrite: true
};

export default config;
