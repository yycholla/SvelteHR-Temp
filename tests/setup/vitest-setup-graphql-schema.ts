/**
 * Vitest Setup for GraphQL Schema Testing
 *
 * Setup configuration for GraphQL schema validation and contract testing.
 */

import { afterAll, beforeAll, expect } from 'vitest';
import { getIntrospectionQuery } from 'graphql';
import { createUrqlClient } from '$lib/graphql/client';

// Global schema and client for schema testing
declare global {
	var __GRAPHQL_SCHEMA_TEST_CLIENT__: any;
	var __GRAPHQL_INTROSPECTION_RESULT__: any;
	var __GRAPHQL_SCHEMA_CACHE__: Map<string, any>;
}

beforeAll(async () => {
	// Initialize schema testing client
	const client = createUrqlClient();
	global.__GRAPHQL_SCHEMA_TEST_CLIENT__ = client;

	// Initialize schema cache
	global.__GRAPHQL_SCHEMA_CACHE__ = new Map();

	// Fetch and cache schema introspection
	try {
		const introspectionQuery = getIntrospectionQuery({
			descriptions: true,
			schemaDescription: true,
			directiveIsRepeatable: true,
			specifiedByUrl: true
		});

		const result = await client.query(introspectionQuery, {}).toPromise();

		if (result.data) {
			global.__GRAPHQL_INTROSPECTION_RESULT__ = result.data;
			global.__GRAPHQL_SCHEMA_CACHE__.set('introspection', result.data);
			console.log('GraphQL schema introspection cached successfully');
		} else {
			console.warn('Failed to fetch schema introspection, using fallback');
			// Load fallback introspection data if available
			try {
				const fallbackIntrospection = (await import('$lib/generated/introspection.json'))
					.default as any;
				global.__GRAPHQL_INTROSPECTION_RESULT__ =
					fallbackIntrospection.default || fallbackIntrospection;
				global.__GRAPHQL_SCHEMA_CACHE__.set(
					'introspection',
					global.__GRAPHQL_INTROSPECTION_RESULT__
				);
			} catch (error) {
				console.error('No fallback introspection data available');
			}
		}
	} catch (error) {
		console.error('Schema introspection failed:', error);

		// Try to load from generated files
		try {
			const fallbackIntrospection = (await import('$lib/generated/introspection.json'))
				.default as any;
			global.__GRAPHQL_INTROSPECTION_RESULT__ =
				fallbackIntrospection.default || fallbackIntrospection;
			global.__GRAPHQL_SCHEMA_CACHE__.set('introspection', global.__GRAPHQL_INTROSPECTION_RESULT__);
			console.log('Using fallback introspection data');
		} catch (fallbackError) {
			console.error('No introspection data available for schema testing');
		}
	}

	console.log('GraphQL schema testing environment initialized');
});

afterAll(async () => {
	// Clear cache
	if (global.__GRAPHQL_SCHEMA_CACHE__) {
		global.__GRAPHQL_SCHEMA_CACHE__.clear();
	}

	console.log('GraphQL schema testing environment cleaned up');
});

// Export utilities for schema tests
export const getSchemaTestClient = () => global.__GRAPHQL_SCHEMA_TEST_CLIENT__;
export const getIntrospectionResult = () => global.__GRAPHQL_INTROSPECTION_RESULT__;
export const getSchemaCache = () => global.__GRAPHQL_SCHEMA_CACHE__;
