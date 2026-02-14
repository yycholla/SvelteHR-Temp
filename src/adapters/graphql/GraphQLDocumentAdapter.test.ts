// src/adapters/graphql/GraphQLDocumentAdapter.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphQLDocumentAdapter } from './GraphQLDocumentAdapter';
import { Client } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Document,
	DocumentTitle,
	DocumentType,
	FileSize,
	MimeType,
	UploadedBy,
	DocumentStatus
} from '$domain/Document';

// Mock URQL client
const createMockClient = () =>
	({
		query: vi.fn(),
		mutation: vi.fn()
	}) as unknown as Client;

describe('GraphQLDocumentAdapter', () => {
	let adapter: GraphQLDocumentAdapter;
	let mockClient: Client;

	beforeEach(() => {
		mockClient = createMockClient();
		adapter = new GraphQLDocumentAdapter(mockClient);
	});

	describe('findById', () => {
		it('should return document when found', async () => {
			const graphqlResponse = {
				data: {
					document: {
						id: 'doc-123',
						title: 'Test Document',
						type: 'policy',
						fileSize: 1024,
						mimeType: 'application/pdf',
						uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
						status: 'draft',
						filePath: '/documents/test.pdf',
						uploadedAt: '2025-01-15T10:00:00Z',
						updatedAt: '2025-01-15T10:00:00Z'
					}
				},
				error: undefined
			};

			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const result = await adapter.findById('doc-123');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.id).toBe('doc-123');
				expect(result.value.title.value).toBe('Test Document');
			}
		});

		it('should return error when document not found', async () => {
			const graphqlResponse = {
				data: { document: null },
				error: undefined
			};

			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const result = await adapter.findById('doc-999');

			expect(result.isError).toBe(true);
		});

		it('should handle GraphQL errors', async () => {
			const graphqlResponse = {
				data: undefined,
				error: { message: 'GraphQL error' }
			};

			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const result = await adapter.findById('doc-123');

			expect(result.isError).toBe(true);
		});
	});

	describe('findAll', () => {
		it('should return all documents', async () => {
			const graphqlResponse = {
				data: {
					documents: [
						{
							id: 'doc-123',
							title: 'Test Document',
							type: 'policy',
							fileSize: 1024,
							mimeType: 'application/pdf',
							uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
							status: 'draft',
							filePath: '/documents/test.pdf',
							uploadedAt: '2025-01-15T10:00:00Z',
							updatedAt: '2025-01-15T10:00:00Z'
						}
					]
				},
				error: undefined
			};

			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0].id).toBe('doc-123');
			}
		});

		it('should skip invalid documents', async () => {
			const graphqlResponse = {
				data: {
					documents: [
						{
							id: 'doc-123',
							title: 'Valid Document',
							type: 'policy',
							fileSize: 1024,
							mimeType: 'application/pdf',
							uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
							status: 'draft',
							filePath: '/documents/valid.pdf',
							uploadedAt: '2025-01-15T10:00:00Z',
							updatedAt: '2025-01-15T10:00:00Z'
						},
						{
							id: 'doc-456',
							title: '', // Invalid empty title
							type: 'policy',
							fileSize: 1024,
							mimeType: 'application/pdf',
							uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
							status: 'draft',
							filePath: '/documents/invalid.pdf',
							uploadedAt: '2025-01-15T10:00:00Z',
							updatedAt: '2025-01-15T10:00:00Z'
						}
					]
				},
				error: undefined
			};

			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				// Should only include valid document
				expect(result.value).toHaveLength(1);
				expect(result.value[0].id).toBe('doc-123');
			}
		});

		it('should handle GraphQL errors', async () => {
			const graphqlResponse = {
				data: undefined,
				error: { message: 'GraphQL error' }
			};

			vi.mocked(mockClient.query).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
		});
	});

	describe('create', () => {
		it('should create document successfully', async () => {
			const graphqlResponse = {
				data: {
					createDocument: {
						id: 'doc-123',
						title: 'New Document',
						type: 'policy',
						fileSize: 1024,
						mimeType: 'application/pdf',
						uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
						status: 'draft',
						filePath: '/documents/new.pdf',
						uploadedAt: '2025-01-15T10:00:00Z',
						updatedAt: '2025-01-15T10:00:00Z'
					}
				},
				error: undefined
			};

			vi.mocked(mockClient.mutation).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const createData = {
				title: 'New Document',
				type: 'policy',
				fileSize: 1024,
				mimeType: 'application/pdf',
				uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
				filePath: '/documents/new.pdf'
			};

			const result = await adapter.create(createData);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.id).toBe('doc-123');
			}
		});

		it('should handle GraphQL errors', async () => {
			const graphqlResponse = {
				data: undefined,
				error: { message: 'GraphQL error' }
			};

			vi.mocked(mockClient.mutation).mockReturnValue({
				toPromise: () => Promise.resolve(graphqlResponse)
			} as never);

			const createData = {
				title: 'New Document',
				type: 'policy',
				fileSize: 1024,
				mimeType: 'application/pdf',
				uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
				filePath: '/documents/new.pdf'
			};

			const result = await adapter.create(createData);

			expect(result.isError).toBe(true);
		});
	});

	describe('mapToDocument', () => {
		it('should map valid GraphQL data to Document entity', () => {
			const graphqlData = {
				id: 'doc-123',
				title: 'Test Document',
				type: 'policy',
				fileSize: 1024,
				mimeType: 'application/pdf',
				uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
				status: 'draft',
				filePath: '/documents/test.pdf',
				uploadedAt: '2025-01-15T10:00:00Z',
				updatedAt: '2025-01-15T10:00:00Z'
			};

			const result = (
				adapter as unknown as { mapToDocument: (data: unknown) => Result<Document, unknown> }
			).mapToDocument(graphqlData);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toBeInstanceOf(Document);
				expect(result.value.id).toBe('doc-123');
				expect(result.value.title).toBeInstanceOf(DocumentTitle);
				expect(result.value.type).toBeInstanceOf(DocumentType);
				expect(result.value.fileSize).toBeInstanceOf(FileSize);
				expect(result.value.mimeType).toBeInstanceOf(MimeType);
				expect(result.value.uploadedBy).toBeInstanceOf(UploadedBy);
				expect(result.value.status).toBeInstanceOf(DocumentStatus);
			}
		});

		it('should handle invalid title', () => {
			const graphqlData = {
				id: 'doc-123',
				title: '', // Invalid
				type: 'policy',
				fileSize: 1024,
				mimeType: 'application/pdf',
				uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
				status: 'draft',
				filePath: '/documents/test.pdf',
				uploadedAt: '2025-01-15T10:00:00Z',
				updatedAt: '2025-01-15T10:00:00Z'
			};

			const result = (
				adapter as unknown as { mapToDocument: (data: unknown) => Result<Document, unknown> }
			).mapToDocument(graphqlData);

			expect(result.isError).toBe(true);
		});

		it('should handle invalid UUID', () => {
			const graphqlData = {
				id: 'doc-123',
				title: 'Test Document',
				type: 'policy',
				fileSize: 1024,
				mimeType: 'application/pdf',
				uploadedBy: 'invalid-uuid', // Invalid
				status: 'draft',
				filePath: '/documents/test.pdf',
				uploadedAt: '2025-01-15T10:00:00Z',
				updatedAt: '2025-01-15T10:00:00Z'
			};

			const result = (
				adapter as unknown as { mapToDocument: (data: unknown) => Result<Document, unknown> }
			).mapToDocument(graphqlData);

			expect(result.isError).toBe(true);
		});
	});
});
