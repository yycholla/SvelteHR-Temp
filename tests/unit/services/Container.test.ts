import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Container } from '$services/Container';
import type { GraphQLPort, AuthPort, StoragePort } from '$services/ports';

describe('Container', () => {
	describe('getInstance', () => {
		it('should return singleton instance', () => {
			const instance1 = Container.getInstance();
			const instance2 = Container.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe('createTest', () => {
		it('should create test container with mock ports', () => {
			const container = Container.createTest();

			expect(container.graphql).toBeDefined();
			expect(container.auth).toBeDefined();
			expect(container.storage).toBeDefined();
		});

		it('should allow overriding specific ports', () => {
			const mockGraphQL: GraphQLPort = {
				query: vi.fn(),
				mutation: vi.fn(),
				mutate: vi.fn()
			};

			const container = Container.createTest({ graphql: mockGraphQL });

			expect(container.graphql).toBe(mockGraphQL);
		});
	});

	describe('reset', () => {
		it('should reset singleton instance', () => {
			const instance1 = Container.getInstance();
			Container.reset();
			const instance2 = Container.getInstance();

			expect(instance1).not.toBe(instance2);
		});
	});
});
