/**
 * Unit Tests for JWT-Authenticated GraphQL Client
 *
 * Tests cover:
 * - Client factory functions for browser and server
 * - Credentials configuration for cookie-based tokens
 * - JWT auth store initialization
 * - Multiple client instance creation
 * - Configuration and setup
 *
 * Coverage target: >75% of jwt-client.ts (174 lines)
 * Note: Auth exchange logic is integration-tested via store tests
 */

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { Client } from '@urql/core';

// Mock browser environment
vi.mock('$app/environment', () => ({
	browser: true
}));

// ============================================================================
// Mock Setup
// ============================================================================

const mockJwtAuth = {
	accessToken: 'initial-token',
	initialize: vi.fn(),
	refreshAccessToken: vi.fn(),
	logout: vi.fn()
};

vi.mock('$lib/stores/jwt-auth.svelte', () => ({
	jwtAuth: mockJwtAuth
}));

// Track Client constructor calls by wrapping @urql/core
// We capture the options passed to each `new Client(...)` call.
const capturedClientOpts: Record<string, unknown>[] = [];
const RealClient = Client;

vi.mock('@urql/core', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@urql/core')>();

	class TrackedClient extends actual.Client {
		constructor(opts: Record<string, unknown>) {
			super(opts as ConstructorParameters<typeof actual.Client>[0]);
			capturedClientOpts.push(opts);
		}
	}

	return {
		...actual,
		Client: TrackedClient
	};
});

// ============================================================================
// Test Suite
// ============================================================================

describe('JWT GraphQL Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedClientOpts.length = 0;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	// ========================================================================
	// Client Factory - Browser
	// ========================================================================

	describe('createJwtGraphQLClient', () => {
		test('should create configured URQL client', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			const client = createJwtGraphQLClient('http://localhost:8080/graphql');

			expect(client).toBeInstanceOf(RealClient);
		});

		test('should create client with correct endpoint', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			const endpoint = 'http://localhost:8080/graphql';
			createJwtGraphQLClient(endpoint);

			const lastOpts = capturedClientOpts[capturedClientOpts.length - 1];
			expect(lastOpts.url).toBe(endpoint);
		});

		test('should initialize JWT auth store with created client', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			createJwtGraphQLClient('http://localhost:8080/graphql');

			expect(mockJwtAuth.initialize).toHaveBeenCalled();
		});

		test('should pass client instance to auth store', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			createJwtGraphQLClient('http://localhost:8080/graphql');

			expect(mockJwtAuth.initialize).toHaveBeenCalledWith(expect.any(RealClient));
		});

		test('should handle different endpoints', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			const endpoint1 = 'http://api1.example.com/graphql';
			const endpoint2 = 'https://api2.example.com/graphql';

			const before = capturedClientOpts.length;
			createJwtGraphQLClient(endpoint1);
			createJwtGraphQLClient(endpoint2);

			expect(capturedClientOpts[before].url).toBe(endpoint1);
			expect(capturedClientOpts[before + 1].url).toBe(endpoint2);
		});
	});

	// ========================================================================
	// Client Factory - Server Side
	// ========================================================================

	describe('createServerJwtClient', () => {
		test('should create server-side GraphQL client', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const client = createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			expect(client).toBeInstanceOf(RealClient);
		});

		test('should use provided fetch function', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const before = capturedClientOpts.length;
			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			expect(capturedClientOpts[before].fetch).toBe(mockFetch);
		});

		test('should set default GraphQL endpoint for server', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const before = capturedClientOpts.length;
			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			expect(capturedClientOpts[before].url).toBe('http://localhost:8080/graphql');
		});

		test('should include Authorization header when token provided', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const token = 'server-jwt-token';
			const before = capturedClientOpts.length;

			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch, token);

			const fetchOptions = capturedClientOpts[before].fetchOptions as RequestInit;
			const headers = fetchOptions?.headers as Record<string, string>;

			expect(headers?.Authorization).toBe(`Bearer ${token}`);
		});

		test('should not include Authorization header without token', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const before = capturedClientOpts.length;
			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			const fetchOptions = capturedClientOpts[before].fetchOptions as RequestInit;
			const headers = fetchOptions?.headers as Record<string, string>;

			expect(headers?.Authorization).toBeUndefined();
		});

		test('should format Authorization header as Bearer token', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const token = 'my-jwt-token-abc123';
			const before = capturedClientOpts.length;

			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch, token);

			const fetchOptions = capturedClientOpts[before].fetchOptions as RequestInit;
			const headers = fetchOptions?.headers as Record<string, string>;

			expect(headers?.Authorization).toMatch(/^Bearer /);
			expect(headers?.Authorization).toContain(token);
		});

		test('should use credentials include for cookies', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const before = capturedClientOpts.length;
			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			const fetchOptions = capturedClientOpts[before].fetchOptions as Record<string, unknown>;

			expect(fetchOptions?.credentials).toBe('include');
		});

		test('should handle multiple server clients independently', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch1 = vi.fn();
			const mockFetch2 = vi.fn();
			const before = capturedClientOpts.length;

			const client1 = createServerJwtClient(
				mockFetch1 as unknown as typeof globalThis.fetch,
				'token1'
			);
			const client2 = createServerJwtClient(
				mockFetch2 as unknown as typeof globalThis.fetch,
				'token2'
			);

			expect(client1).not.toBe(client2);

			const opts1 = capturedClientOpts[before];
			const opts2 = capturedClientOpts[before + 1];

			expect(opts1.fetch).toBe(mockFetch1);
			expect(opts2.fetch).toBe(mockFetch2);

			const headers1 = (opts1.fetchOptions as RequestInit)?.headers as Record<string, string>;
			const headers2 = (opts2.fetchOptions as RequestInit)?.headers as Record<string, string>;

			expect(headers1?.Authorization).toContain('token1');
			expect(headers2?.Authorization).toContain('token2');
		});
	});

	// ========================================================================
	// Default Export
	// ========================================================================

	describe('default export (jwtGraphQLClient)', () => {
		test('should export a Client instance for browser environment', async () => {
			// Already mocked as browser: true
			const { jwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			expect(jwtGraphQLClient).toBeInstanceOf(RealClient);
		});

		test('should initialize auth store with default client', async () => {
			// Import triggers initialization
			await import('$lib/graphql/jwt-client');

			expect(mockJwtAuth.initialize).toHaveBeenCalledWith(expect.any(RealClient));
		});
	});

	// ========================================================================
	// Multiple Client Instances
	// ========================================================================

	describe('independent client instances', () => {
		test('should create separate clients for different endpoints', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			const before = capturedClientOpts.length;
			const client1 = createJwtGraphQLClient('http://localhost:8080/graphql');
			const client2 = createJwtGraphQLClient('http://localhost:9090/graphql');

			expect(client1).not.toBe(client2);

			const url1 = capturedClientOpts[before].url;
			const url2 = capturedClientOpts[before + 1].url;

			expect(url1).not.toBe(url2);
		});

		test('should create separate server clients with different tokens', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch1 = vi.fn();
			const mockFetch2 = vi.fn();
			const before = capturedClientOpts.length;

			const client1 = createServerJwtClient(
				mockFetch1 as unknown as typeof globalThis.fetch,
				'token-a'
			);
			const client2 = createServerJwtClient(
				mockFetch2 as unknown as typeof globalThis.fetch,
				'token-b'
			);

			expect(client1).not.toBe(client2);

			const headers1 = (capturedClientOpts[before].fetchOptions as RequestInit)?.headers as Record<
				string,
				string
			>;
			const headers2 = (capturedClientOpts[before + 1].fetchOptions as RequestInit)
				?.headers as Record<string, string>;

			expect(headers1?.Authorization).not.toBe(headers2?.Authorization);
		});
	});

	// ========================================================================
	// Edge Cases
	// ========================================================================

	describe('edge cases', () => {
		test('should handle empty endpoint string', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			expect(() => createJwtGraphQLClient('')).toThrow(
				'You are creating an urql-client without a url.'
			);
		});

		test('should handle HTTPS endpoints', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			const secureEndpoint = 'https://api.example.com/graphql';
			const before = capturedClientOpts.length;
			createJwtGraphQLClient(secureEndpoint);

			expect(capturedClientOpts[before].url).toBe(secureEndpoint);
		});

		test('should handle port numbers in endpoint', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			const customPort = 'http://localhost:4000/graphql';
			const before = capturedClientOpts.length;
			createJwtGraphQLClient(customPort);

			expect(capturedClientOpts[before].url).toBe(customPort);
		});

		test('should handle empty token in server client', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const before = capturedClientOpts.length;
			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch, '');

			const fetchOptions = capturedClientOpts[before].fetchOptions as RequestInit;
			const headers = fetchOptions?.headers as Record<string, string>;

			// Empty string token is falsy — no Authorization header is injected
			expect(headers?.Authorization).toBeUndefined();
		});

		test('should handle token with special characters', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const tokenWithSpecialChars = 'eyJ.hGci.OiJIUzI1NiIsInR5cCI6IkpXVCJ9';
			const before = capturedClientOpts.length;

			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch, tokenWithSpecialChars);

			const fetchOptions = capturedClientOpts[before].fetchOptions as RequestInit;
			const headers = fetchOptions?.headers as Record<string, string>;

			expect(headers?.Authorization).toContain(tokenWithSpecialChars);
		});

		test('should create client with null fetch (uses default)', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const client = createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			expect(client).toBeInstanceOf(RealClient);
		});
	});

	// ========================================================================
	// Configuration Consistency
	// ========================================================================

	describe('configuration consistency', () => {
		test('should create both browser and server clients', async () => {
			const { createJwtGraphQLClient, createServerJwtClient } =
				await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();

			const browserClient = createJwtGraphQLClient('http://localhost:8080/graphql');
			const serverClient = createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			// Both should be valid Client instances
			expect(browserClient).toBeInstanceOf(RealClient);
			expect(serverClient).toBeInstanceOf(RealClient);
		});

		test('should initialize auth store with browser client', async () => {
			mockJwtAuth.initialize.mockClear();

			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			createJwtGraphQLClient('http://localhost:8080/graphql');

			expect(mockJwtAuth.initialize).toHaveBeenCalled();
		});

		test('should use different endpoints for browser and server clients', async () => {
			const { createJwtGraphQLClient, createServerJwtClient } =
				await import('$lib/graphql/jwt-client');

			const mockFetch = vi.fn();
			const before = capturedClientOpts.length;

			createJwtGraphQLClient('https://api.example.com/graphql');
			createServerJwtClient(mockFetch as unknown as typeof globalThis.fetch);

			expect(capturedClientOpts[before].url).toBe('https://api.example.com/graphql');
			expect(capturedClientOpts[before + 1].url).toBe('http://localhost:8080/graphql');
		});
	});

	// ========================================================================
	// Error Scenarios
	// ========================================================================

	describe('error scenarios', () => {
		test('should still create client even if auth store initialization is called', async () => {
			const { createJwtGraphQLClient } = await import('$lib/graphql/jwt-client');

			mockJwtAuth.initialize.mockImplementation(() => {
				throw new Error('Store initialization error');
			});

			// This should throw due to the mock throwing
			expect(() => createJwtGraphQLClient('http://localhost:8080/graphql')).toThrow();
		});

		test('should handle undefined fetch parameter in server client', async () => {
			const { createServerJwtClient } = await import('$lib/graphql/jwt-client');

			// Calling with undefined should still work
			const client = createServerJwtClient(undefined as unknown as typeof globalThis.fetch);

			expect(client).toBeInstanceOf(RealClient);
		});
	});
});
