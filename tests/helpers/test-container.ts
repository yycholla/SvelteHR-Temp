import {
	Container,
	MockGraphQLAdapter,
	MockAuthAdapter,
	MockStorageAdapter
} from '$services/Container';
import type { GraphQLPort, AuthPort, StoragePort } from '$services/ports';

/**
 * Helper to create test container with optional overrides.
 */
export function createTestContainer(
	overrides?: Partial<{
		graphql: GraphQLPort;
		auth: AuthPort;
		storage: StoragePort;
	}>
) {
	return Container.createTest(overrides);
}

/**
 * Helper to create mock GraphQL adapter with preset responses.
 */
export function createMockGraphQL(responses?: Record<string, unknown>) {
	const mock = new MockGraphQLAdapter();
	if (responses) {
		Object.entries(responses).forEach(([key, value]) => {
			mock.setResponse(key, value);
		});
	}
	return mock;
}

/**
 * Helper to create mock Auth adapter with preset permissions.
 */
export function createMockAuth(permissions: string[] = []) {
	const mock = new MockAuthAdapter();
	mock.setPermissions(permissions);
	return mock;
}

/**
 * Helper to create mock Storage adapter with preset data.
 */
export function createMockStorage(initialData?: Record<string, string>) {
	const mock = new MockStorageAdapter();
	if (initialData) {
		Object.entries(initialData).forEach(([key, value]) => {
			mock.setItem(key, value);
		});
	}
	return mock;
}
