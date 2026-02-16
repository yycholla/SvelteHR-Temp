// src/lib/services/attendanceServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import {
	createAttendanceService,
	createAttendanceServiceWithClient
} from './attendanceServiceFactory';
import { AttendanceService } from '$services/AttendanceService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';

describe('attendanceServiceFactory', () => {
	describe('createAttendanceService', () => {
		it('should create AttendanceService instance', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createAttendanceService(mockEvent);

			expect(service).toBeInstanceOf(AttendanceService);
		});

		it('should use event.fetch for GraphQL client', () => {
			const mockFetch = vi.fn();
			const mockEvent = {
				fetch: mockFetch,
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createAttendanceService(mockEvent);

			expect(service).toBeInstanceOf(AttendanceService);
		});

		it('should serialize cookies for authentication', () => {
			const mockCookies = [
				{ name: 'session', value: 'test-session' },
				{ name: 'other', value: 'other-value' }
			];

			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => mockCookies)
				}
			} as unknown as RequestEvent;

			const service = createAttendanceService(mockEvent);

			expect(service).toBeInstanceOf(AttendanceService);
		});

		it('should create service with authenticated GraphQL client', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn((name: string) => {
						if (name === 'session') return 'test-session-token';
						return undefined;
					}),
					getAll: vi.fn(() => [{ name: 'session', value: 'test-session-token' }])
				}
			} as unknown as RequestEvent;

			const service = createAttendanceService(mockEvent);

			expect(service).toBeInstanceOf(AttendanceService);
		});
	});

	describe('createAttendanceServiceWithClient', () => {
		it('should create AttendanceService with provided client', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createAttendanceServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(AttendanceService);
		});

		it('should create functional service instance', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createAttendanceServiceWithClient(mockClient);

			// Service should have expected methods
			expect(typeof service.getAllAttendance).toBe('function');
			expect(typeof service.getById).toBe('function');
			expect(typeof service.getByEmployeeId).toBe('function');
			expect(typeof service.createAttendance).toBe('function');
			expect(typeof service.clockIn).toBe('function');
			expect(typeof service.clockOut).toBe('function');
			expect(typeof service.markLate).toBe('function');
			expect(typeof service.markAbsent).toBe('function');
			expect(typeof service.deleteAttendance).toBe('function');
		});
	});

	describe('factory consistency', () => {
		it('should create different instances on each call', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service1 = createAttendanceService(mockEvent);
			const service2 = createAttendanceService(mockEvent);

			expect(service1).not.toBe(service2);
		});

		it('should create services with same interface via different factories', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const eventService = createAttendanceService(mockEvent);
			const clientService = createAttendanceServiceWithClient(mockClient);

			// Both should have the same methods
			expect(typeof eventService.getAllAttendance).toBe('function');
			expect(typeof clientService.getAllAttendance).toBe('function');
			expect(typeof eventService.clockIn).toBe('function');
			expect(typeof clientService.clockIn).toBe('function');
		});
	});
});
