// src/lib/services/documentServiceFactory.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDocumentService } from './documentServiceFactory';
import { DocumentService } from '$services/DocumentService';
import type { RequestEvent } from '@sveltejs/kit';

// Mock the dependencies
vi.mock('$lib/graphql/client', () => ({
	createUrqlClient: vi.fn(() => ({ query: vi.fn(), mutation: vi.fn() })),
	serializeCookies: vi.fn((cookies) => cookies)
}));

import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

describe('documentServiceFactory', () => {
	let mockEvent: RequestEvent;

	beforeEach(() => {
		mockEvent = {
			fetch: vi.fn(),
			cookies: {
				get: vi.fn(),
				set: vi.fn(),
				delete: vi.fn(),
				serialize: vi.fn(),
				getAll: vi.fn()
			}
		} as unknown as RequestEvent;
	});

	describe('createDocumentService', () => {
		it('should create DocumentService instance', () => {
			const service = createDocumentService(mockEvent);

			expect(service).toBeInstanceOf(DocumentService);
		});

		it('should use event.fetch for GraphQL client', () => {
			createDocumentService(mockEvent);

			expect(createUrqlClient).toHaveBeenCalled();
			const callArgs = vi.mocked(createUrqlClient).mock.calls[0];
			expect(callArgs[0]).toBe(mockEvent.fetch);
		});

		it('should serialize cookies for authentication', () => {
			createDocumentService(mockEvent);

			expect(serializeCookies).toHaveBeenCalledWith(mockEvent.cookies);
		});

		it('should create new service instance on each call', () => {
			const service1 = createDocumentService(mockEvent);
			const service2 = createDocumentService(mockEvent);

			// Different instances (factory pattern)
			expect(service1).not.toBe(service2);
			// But same type
			expect(service1).toBeInstanceOf(DocumentService);
			expect(service2).toBeInstanceOf(DocumentService);
		});
	});
});
