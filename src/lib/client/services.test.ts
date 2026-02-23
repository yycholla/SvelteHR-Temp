// src/lib/client/services.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ClientServiceContainer, createClientServices } from './services';
import type { Client } from '@urql/core';

describe('ClientServiceContainer', () => {
	it('should lazy-create RBACService on first access', () => {
		const mockClient = {} as Client;
		const container = new ClientServiceContainer(mockClient);

		const service1 = container.rbacService;
		const service2 = container.rbacService;

		expect(service1).toBe(service2); // Same instance (lazy singleton)
	});

	it('should pass client to service factory', () => {
		const mockClient = {} as Client;
		const container = new ClientServiceContainer(mockClient);

		const service = container.rbacService;

		expect(service).toBeDefined();
		expect(service.getAllRoles).toBeDefined();
	});
});

describe('createClientServices', () => {
	it('should return singleton instance', () => {
		const services1 = createClientServices();
		const services2 = createClientServices();

		expect(services1).toBe(services2); // Singleton pattern
	});
});
