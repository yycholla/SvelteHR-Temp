import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLAdapter } from '$adapters/graphql/GraphQLAdapter';
import { GraphQLError } from '$adapters/graphql/errors/GraphQLError';
import type { Client } from '@urql/core';

describe('GraphQLAdapter', () => {
	let mockClient: Client;
	let adapter: GraphQLAdapter;

	beforeEach(() => {
		mockClient = {
			query: vi.fn(),
			mutation: vi.fn()
		} as unknown as Client;

		adapter = new GraphQLAdapter(mockClient);
	});

	describe('query', () => {
		it('returns data on successful query', async () => {
			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: { users: [{ id: '1', name: 'Test' }] },
						error: undefined
					})
			} as never);

			const result = await adapter.query('{ users { id name } }', {});

			expect(result).toEqual({ users: [{ id: '1', name: 'Test' }] });
		});

		it('throws GraphQLError with NOT_FOUND code for 404', async () => {
			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: null,
						error: { message: 'User not found' }
					})
			} as never);

			await expect(adapter.query('{ user(id: "1") }', {})).rejects.toThrow(GraphQLError);

			try {
				await adapter.query('{ user(id: "1") }', {});
			} catch (error) {
				expect((error as GraphQLError).code).toBe('GRAPHQL_NOT_FOUND');
			}
		});

		it('throws GraphQLError with UNAUTHORIZED code for 401', async () => {
			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: null,
						error: { message: 'Unauthorized access' }
					})
			} as never);

			try {
				await adapter.query('{ sensitiveData }', {});
			} catch (error) {
				expect((error as GraphQLError).code).toBe('GRAPHQL_UNAUTHORIZED');
			}
		});

		it('throws GraphQLError with VALIDATION_ERROR for validation failures', async () => {
			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: null,
						error: { message: 'Validation failed: email invalid' }
					})
			} as never);

			try {
				await adapter.query('{ validateUser }', {});
			} catch (error) {
				expect((error as GraphQLError).code).toBe('GRAPHQL_VALIDATION_ERROR');
			}
		});

		it('throws GraphQLError with UNKNOWN code for other errors', async () => {
			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: null,
						error: { message: 'Network error' }
					})
			} as never);

			try {
				await adapter.query('{ data }', {});
			} catch (error) {
				expect((error as GraphQLError).code).toBe('GRAPHQL_UNKNOWN');
			}
		});

		it('passes variables to client query', async () => {
			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () => Promise.resolve({ data: { user: {} }, error: undefined })
			} as never);

			await adapter.query('{ user(id: $id) }', { id: '123' });

			expect(mockClient.query).toHaveBeenCalledWith('{ user(id: $id) }', { id: '123' });
		});

		it('throws when query returns no data and no error', async () => {
			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: null,
						error: undefined
					})
			} as never);

			await expect(adapter.query('{ data }', {})).rejects.toThrow(GraphQLError);
		});
	});

	describe('mutation', () => {
		it('returns data on successful mutation', async () => {
			vi.mocked(mockClient.mutation).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: { createUser: { id: '1', email: 'test@example.com' } },
						error: undefined
					})
			} as never);

			const result = await adapter.mutation('mutation { createUser }', {});

			expect(result).toEqual({ createUser: { id: '1', email: 'test@example.com' } });
		});

		it('throws GraphQLError on mutation error', async () => {
			vi.mocked(mockClient.mutation).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: null,
						error: { message: 'Mutation failed' }
					})
			} as never);

			await expect(adapter.mutation('mutation { deleteUser }', {})).rejects.toThrow(GraphQLError);
		});

		it('passes variables to client mutation', async () => {
			vi.mocked(mockClient.mutation).mockReturnValue({
				toPromise: () => Promise.resolve({ data: { updateUser: {} }, error: undefined })
			} as never);

			await adapter.mutation('mutation UpdateUser($id: ID!) { updateUser(id: $id) }', {
				id: '123'
			});

			expect(mockClient.mutation).toHaveBeenCalledWith(
				'mutation UpdateUser($id: ID!) { updateUser(id: $id) }',
				{ id: '123' }
			);
		});

		it('throws when mutation returns no data and no error', async () => {
			vi.mocked(mockClient.mutation).mockReturnValue({
				toPromise: () =>
					Promise.resolve({
						data: null,
						error: undefined
					})
			} as never);

			await expect(adapter.mutation('mutation { updateData }', {})).rejects.toThrow(GraphQLError);
		});

		it('does NOT log mutation variables (security)', () => {
			// This is a documentation test - we verify the implementation doesn't log variables
			// in debug statements to prevent password exposure
			const adapterCode = adapter.mutation.toString();
			// Verify the debug log doesn't include variables in the logged object
			expect(adapterCode).toContain('logger.debug');
			expect(adapterCode).not.toMatch(/logger\.debug\([^)]*variables/);
		});
	});
});
