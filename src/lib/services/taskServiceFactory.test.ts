// src/lib/services/taskServiceFactory.test.ts
import { describe, it, expect } from 'vitest';
import { createTaskService } from './taskServiceFactory';
import { TaskService } from '$services/TaskService';

describe('taskServiceFactory', () => {
	it('should create TaskService instance', () => {
		const mockEvent = {
			fetch: globalThis.fetch,
			cookies: {
				getAll: () => []
			}
		} as any;

		const service = createTaskService(mockEvent);

		expect(service).toBeInstanceOf(TaskService);
	});

	it('should create service with authenticated client', () => {
		const mockEvent = {
			fetch: globalThis.fetch,
			cookies: {
				getAll: () => [{ name: 'session', value: 'test-session' }]
			}
		} as any;

		const service = createTaskService(mockEvent);

		expect(service).toBeInstanceOf(TaskService);
	});
});
