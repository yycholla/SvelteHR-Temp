// src/lib/server/services.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createServices, createEmployeeService, ServiceContainer } from './services';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the factory module
vi.mock('$lib/services/employeeServiceFactory', () => ({
	createEmployeeService: vi.fn(() => ({
		getEmployees: vi.fn(),
		getEmployeeById: vi.fn(),
		createEmployee: vi.fn(),
		updateEmployee: vi.fn(),
		deleteEmployee: vi.fn()
	}))
}));

describe('ServiceContainer', () => {
	let mockEvent: RequestEvent;

	beforeEach(() => {
		mockEvent = {
			request: {
				headers: new Headers({
					cookie: 'session_id=test-session-123'
				})
			}
		} as unknown as RequestEvent;
	});

	describe('ServiceContainer', () => {
		it('should create a service container', () => {
			const container = new ServiceContainer(mockEvent);
			expect(container).toBeInstanceOf(ServiceContainer);
		});

		it('should provide access to employeeService', () => {
			const container = new ServiceContainer(mockEvent);
			const service = container.employeeService;

			expect(service).toBeDefined();
			expect(service).toHaveProperty('getEmployees');
			expect(service).toHaveProperty('getEmployeeById');
		});

		it('should cache employeeService instance', () => {
			const container = new ServiceContainer(mockEvent);
			const service1 = container.employeeService;
			const service2 = container.employeeService;

			expect(service1).toBe(service2);
		});
	});

	describe('createServices', () => {
		it('should create a service container with request event', () => {
			const services = createServices(mockEvent);

			expect(services).toBeInstanceOf(ServiceContainer);
		});

		it('should provide access to all services', () => {
			const services = createServices(mockEvent);

			expect(services.employeeService).toBeDefined();
		});
	});

	describe('createEmployeeService', () => {
		it('should create employee service directly', () => {
			const service = createEmployeeService(mockEvent);

			expect(service).toBeDefined();
			expect(service).toHaveProperty('getEmployees');
		});

		it('should create a new instance each time', () => {
			const service1 = createEmployeeService(mockEvent);
			const service2 = createEmployeeService(mockEvent);

			// Each call creates a new instance
			expect(service1).not.toBe(service2);
		});
	});
});
