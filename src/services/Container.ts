import type { GraphQLPort, AuthPort, StoragePort, UserSession } from './ports';

/**
 * Mock implementations for testing
 */
class MockGraphQLAdapter implements GraphQLPort {
	private responses = new Map<string, unknown>();
	private errors = new Map<string, Error>();

	async query<TData = unknown>(_query: string, _variables?: unknown): Promise<TData> {
		const key = 'query';
		if (this.errors.has(key)) {
			throw this.errors.get(key);
		}
		const response = this.responses.get(key);
		if (response === undefined) {
			throw new Error('MockGraphQLAdapter: No response set for query. Call setResponse() first.');
		}
		return response as TData;
	}

	async mutate<TData = unknown>(_mutation: string, _variables?: unknown): Promise<TData> {
		const key = 'mutate';
		if (this.errors.has(key)) {
			throw this.errors.get(key);
		}
		const response = this.responses.get(key);
		if (response === undefined) {
			throw new Error('MockGraphQLAdapter: No response set for mutate. Call setResponse() first.');
		}
		return response as TData;
	}

	setResponse(key: string, response: unknown) {
		this.responses.set(key, response);
	}

	setError(key: string, error: Error) {
		this.errors.set(key, error);
	}
}

class MockAuthAdapter implements AuthPort {
	private session: UserSession | null = null;
	private permissions: string[] = [];

	async getSession(): Promise<UserSession | null> {
		return this.session;
	}

	async login(_email: string, _password: string): Promise<UserSession> {
		this.session = {
			userId: 'test-user',
			email: 'test@example.com',
			role: 'Admin',
			permissions: this.permissions
		};
		return this.session;
	}

	async logout() {
		this.session = null;
	}

	hasPermission(permission: string): boolean {
		return this.permissions.includes(permission);
	}

	setPermissions(permissions: string[]) {
		this.permissions = permissions;
	}
}

class MockStorageAdapter implements StoragePort {
	private storage = new Map<string, string>();

	getItem(key: string): string | null {
		return this.storage.get(key) ?? null;
	}

	setItem(key: string, value: string): void {
		this.storage.set(key, value);
	}

	removeItem(key: string): void {
		this.storage.delete(key);
	}

	clear(): void {
		this.storage.clear();
	}
}

/**
 * Dependency injection container.
 * Provides all services and their dependencies.
 */
export class Container {
	private static instance: Container | null = null;

	public readonly graphql: GraphQLPort;
	public readonly auth: AuthPort;
	public readonly storage: StoragePort;

	private constructor(deps: { graphql: GraphQLPort; auth: AuthPort; storage: StoragePort }) {
		this.graphql = deps.graphql;
		this.auth = deps.auth;
		this.storage = deps.storage;
	}

	/**
	 * Get singleton container instance.
	 * In production, this will be initialized with real adapters.
	 */
	static getInstance(): Container {
		if (!Container.instance) {
			// In production, this would use real adapters
			// For now, use mocks until adapters are implemented
			Container.instance = Container.createTest();
		}
		return Container.instance;
	}

	/**
	 * Create test container with mock adapters.
	 * Allows overriding specific dependencies.
	 */
	static createTest(
		overrides?: Partial<{
			graphql: GraphQLPort;
			auth: AuthPort;
			storage: StoragePort;
		}>
	): Container {
		return new Container({
			graphql: overrides?.graphql ?? new MockGraphQLAdapter(),
			auth: overrides?.auth ?? new MockAuthAdapter(),
			storage: overrides?.storage ?? new MockStorageAdapter()
		});
	}

	/**
	 * Reset singleton instance (useful for testing).
	 */
	static reset(): void {
		Container.instance = null;
	}
}

// Export mock adapters for testing
export { MockGraphQLAdapter, MockAuthAdapter, MockStorageAdapter };
