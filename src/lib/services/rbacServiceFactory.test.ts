// src/lib/services/rbacServiceFactory.test.ts
import { describe, it, expect } from 'vitest';
import { createRBACService } from './rbacServiceFactory';
import { RBACService } from '$services/RBACService';

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
