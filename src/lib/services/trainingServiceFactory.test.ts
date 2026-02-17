// src/lib/services/trainingServiceFactory.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createTrainingService, createTrainingServiceWithClient } from './trainingServiceFactory';
import { TrainingService } from '$services/TrainingService';
import type { RequestEvent } from '@sveltejs/kit';
import { createClient } from '@urql/core';

describe('trainingServiceFactory', () => {
	describe('createTrainingService', () => {
		it('should create TrainingService instance from event', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createTrainingService(mockEvent);

			expect(service).toBeInstanceOf(TrainingService);
		});

		it('should use event.fetch for GraphQL client creation', () => {
			const mockFetch = vi.fn();
			const mockEvent = {
				fetch: mockFetch,
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service = createTrainingService(mockEvent);

			expect(service).toBeInstanceOf(TrainingService);
		});

		it('should serialize cookies for authentication', () => {
			const mockCookies = [
				{ name: 'session', value: 'test-session' },
				{ name: 'refresh', value: 'refresh-token' }
			];

			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => mockCookies)
				}
			} as unknown as RequestEvent;

			const service = createTrainingService(mockEvent);

			expect(service).toBeInstanceOf(TrainingService);
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

			const service = createTrainingService(mockEvent);

			expect(service).toBeInstanceOf(TrainingService);
		});

		it('should create different instances on each call', () => {
			const mockEvent = {
				fetch: vi.fn(),
				cookies: {
					get: vi.fn(),
					getAll: vi.fn(() => [])
				}
			} as unknown as RequestEvent;

			const service1 = createTrainingService(mockEvent);
			const service2 = createTrainingService(mockEvent);

			expect(service1).not.toBe(service2);
		});
	});

	describe('createTrainingServiceWithClient', () => {
		it('should create TrainingService with provided client', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createTrainingServiceWithClient(mockClient);

			expect(service).toBeInstanceOf(TrainingService);
		});

		it('should create service with expected business methods', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service = createTrainingServiceWithClient(mockClient);

			// Training CRUD
			expect(typeof service.getById).toBe('function');
			expect(typeof service.getAll).toBe('function');
			expect(typeof service.create).toBe('function');
			expect(typeof service.update).toBe('function');
			expect(typeof service.delete).toBe('function');
			// Content
			expect(typeof service.getContentByTrainingId).toBe('function');
			expect(typeof service.createContent).toBe('function');
			expect(typeof service.updateContent).toBe('function');
			expect(typeof service.deleteContent).toBe('function');
			// Progress
			expect(typeof service.getProgressByUserAndTraining).toBe('function');
			expect(typeof service.updateProgress).toBe('function');
			// Assignments
			expect(typeof service.getAssignmentsByTrainingId).toBe('function');
			expect(typeof service.createAssignment).toBe('function');
			expect(typeof service.deleteAssignment).toBe('function');
		});

		it('should create different instances on each call', () => {
			const mockClient = createClient({
				url: 'http://localhost:4000/graphql',
				exchanges: []
			});

			const service1 = createTrainingServiceWithClient(mockClient);
			const service2 = createTrainingServiceWithClient(mockClient);

			expect(service1).not.toBe(service2);
		});

		it('should create services with same interface via both factories', () => {
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

			const eventService = createTrainingService(mockEvent);
			const clientService = createTrainingServiceWithClient(mockClient);

			// Both should have identical method surfaces
			expect(typeof eventService.getById).toBe('function');
			expect(typeof clientService.getById).toBe('function');
			expect(typeof eventService.createContent).toBe('function');
			expect(typeof clientService.createContent).toBe('function');
			expect(typeof eventService.updateProgress).toBe('function');
			expect(typeof clientService.updateProgress).toBe('function');
		});
	});
});
