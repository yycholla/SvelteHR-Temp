// src/lib/services/rbacServiceFactory.test.ts
import { describe, it, expect } from 'vitest';
import { createRBACService, createRBACServiceFromClient } from './rbacServiceFactory';
import { RBACService } from '$services/RBACService';
import type { Client } from '@urql/core';

describe('rbacServiceFactory', () => {
	it('should create RBACService instance', () => {
		const mockEvent = {
			fetch: globalThis.fetch,
			cookies: {
				getAll: () => []
			}
		} as any;

		const service = createRBACService(mockEvent);

		expect(service).toBeInstanceOf(RBACService);
	});

	it('should create service with authenticated client', () => {
		const mockEvent = {
			fetch: globalThis.fetch,
			cookies: {
				getAll: () => [{ name: 'session', value: 'test-session' }]
			}
		} as any;

		const service = createRBACService(mockEvent);

		expect(service).toBeInstanceOf(RBACService);
	});
});

describe('createRBACServiceFromClient', () => {
	it('should create RBACService with GraphQLRoleAdapter', () => {
		const mockClient = {} as Client;

		const service = createRBACServiceFromClient(mockClient);

		expect(service).toBeDefined();
		expect(service.getAllRoles).toBeDefined();
	});

	it('should return new instance each time', () => {
		const mockClient = {} as Client;

		const service1 = createRBACServiceFromClient(mockClient);
		const service2 = createRBACServiceFromClient(mockClient);

		expect(service1).not.toBe(service2); // Factory, not singleton
	});
});
