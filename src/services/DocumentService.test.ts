// src/services/DocumentService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentService } from './DocumentService';
import type { DocumentRepository } from './ports/DocumentRepository';
import { Result } from '$domain/Result';
import {
	Document,
	DocumentTitle,
	DocumentType,
	FileSize,
	MimeType,
	UploadedBy,
	DocumentStatus,
	DocumentNotFoundError,
	DocumentValidationError
} from '$domain/Document';

// Mock repository implementation
const createMockRepository = (): DocumentRepository => ({
	findById: vi.fn(),
	findAll: vi.fn(),
	create: vi.fn(),
	update: vi.fn(),
	delete: vi.fn(),
	publish: vi.fn(),
	archive: vi.fn(),
	findByUploader: vi.fn(),
	searchByTitle: vi.fn(),
	count: vi.fn(),
	exists: vi.fn()
});

const createTestDocument = () => {
	return Document.create({
		id: 'doc-123',
		title: DocumentTitle.create('Test Document').value!,
		type: DocumentType.create('policy').value!,
		fileSize: FileSize.create(1024 * 1024).value!,
		mimeType: MimeType.create('application/pdf').value!,
		uploadedBy: UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!,
		status: DocumentStatus.create('draft').value!,
		filePath: '/documents/test.pdf',
		uploadedAt: new Date('2025-01-15T10:00:00Z'),
		updatedAt: new Date('2025-01-15T10:00:00Z')
	}).value!;
};

describe('DocumentService', () => {
	let service: DocumentService;
	let mockRepository: DocumentRepository;

	beforeEach(() => {
		mockRepository = createMockRepository();
		service = new DocumentService(mockRepository);
	});

	describe('getDocumentById', () => {
		it('should return document when found', async () => {
			const testDoc = createTestDocument();
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(testDoc));

			const result = await service.getDocumentById('doc-123');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.id).toBe('doc-123');
			}
			expect(mockRepository.findById).toHaveBeenCalledWith('doc-123');
		});

		it('should return error when document not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(
				Result.error(new DocumentNotFoundError('doc-999'))
			);

			const result = await service.getDocumentById('doc-999');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(DocumentNotFoundError);
			}
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database error'));

			const result = await service.getDocumentById('doc-123');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Failed to fetch document');
			}
		});
	});

	describe('getAllDocuments', () => {
		it('should return all documents without filter', async () => {
			const testDoc = createTestDocument();
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([testDoc]));

			const result = await service.getAllDocuments();

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
				expect(result.value[0].id).toBe('doc-123');
			}
			expect(mockRepository.findAll).toHaveBeenCalledWith(undefined);
		});

		it('should return filtered documents', async () => {
			const testDoc = createTestDocument();
			const filter = { type: ['policy'], status: ['draft'] };
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([testDoc]));

			const result = await service.getAllDocuments(filter);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
			}
			expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('Database error'));

			const result = await service.getAllDocuments();

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Failed to fetch documents');
			}
		});
	});

	describe('createDocument', () => {
		it('should create document with valid data', async () => {
			const testDoc = createTestDocument();
			const createData = {
				title: 'Test Document',
				type: 'policy',
				fileSize: 1024 * 1024,
				mimeType: 'application/pdf',
				uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
				filePath: '/documents/test.pdf'
			};

			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(testDoc));

			const result = await service.createDocument(createData);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.id).toBe('doc-123');
			}
			expect(mockRepository.create).toHaveBeenCalledWith(createData);
		});

		it('should reject document with empty title', async () => {
			const createData = {
				title: '',
				type: 'policy',
				fileSize: 1024,
				mimeType: 'application/pdf',
				uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
				filePath: '/documents/test.pdf'
			};

			const result = await service.createDocument(createData);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Document title cannot be empty');
			}
			expect(mockRepository.create).not.toHaveBeenCalled();
		});

		it('should handle repository errors', async () => {
			const createData = {
				title: 'Test Document',
				type: 'policy',
				fileSize: 1024,
				mimeType: 'application/pdf',
				uploadedBy: '550e8400-e29b-41d4-a716-446655440000',
				filePath: '/documents/test.pdf'
			};

			vi.mocked(mockRepository.create).mockRejectedValue(new Error('Database error'));

			const result = await service.createDocument(createData);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Failed to create document');
			}
		});
	});

	describe('updateDocument', () => {
		it('should update document with valid data', async () => {
			const testDoc = createTestDocument();
			const updateData = { title: 'Updated Title' };

			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(testDoc));

			const result = await service.updateDocument('doc-123', updateData);

			expect(result.isOk).toBe(true);
			expect(mockRepository.update).toHaveBeenCalledWith('doc-123', updateData);
		});

		it('should reject update with invalid title', async () => {
			const updateData = { title: '' };

			const result = await service.updateDocument('doc-123', updateData);

			expect(result.isError).toBe(true);
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should handle repository errors', async () => {
			const updateData = { title: 'Updated Title' };

			vi.mocked(mockRepository.update).mockRejectedValue(new Error('Database error'));

			const result = await service.updateDocument('doc-123', updateData);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Failed to update document');
			}
		});
	});

	describe('deleteDocument', () => {
		it('should delete document successfully', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteDocument('doc-123');

			expect(result.isOk).toBe(true);
			expect(mockRepository.delete).toHaveBeenCalledWith('doc-123');
		});

		it('should handle not found error', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(
				Result.error(new DocumentNotFoundError('doc-999'))
			);

			const result = await service.deleteDocument('doc-999');

			expect(result.isError).toBe(true);
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.delete).mockRejectedValue(new Error('Database error'));

			const result = await service.deleteDocument('doc-123');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Failed to delete document');
			}
		});
	});

	describe('publishDocument', () => {
		it('should publish document successfully', async () => {
			const testDoc = createTestDocument();
			vi.mocked(mockRepository.publish).mockResolvedValue(Result.ok(testDoc));

			const result = await service.publishDocument('doc-123');

			expect(result.isOk).toBe(true);
			expect(mockRepository.publish).toHaveBeenCalledWith('doc-123');
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.publish).mockRejectedValue(new Error('Database error'));

			const result = await service.publishDocument('doc-123');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Failed to publish document');
			}
		});
	});

	describe('archiveDocument', () => {
		it('should archive document successfully', async () => {
			const testDoc = createTestDocument();
			vi.mocked(mockRepository.archive).mockResolvedValue(Result.ok(testDoc));

			const result = await service.archiveDocument('doc-123');

			expect(result.isOk).toBe(true);
			expect(mockRepository.archive).toHaveBeenCalledWith('doc-123');
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.archive).mockRejectedValue(new Error('Database error'));

			const result = await service.archiveDocument('doc-123');

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Failed to archive document');
			}
		});
	});

	describe('getDocumentsByUploader', () => {
		it('should return documents by uploader', async () => {
			const testDoc = createTestDocument();
			vi.mocked(mockRepository.findByUploader).mockResolvedValue(Result.ok([testDoc]));

			const result = await service.getDocumentsByUploader('550e8400-e29b-41d4-a716-446655440000');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
			}
			expect(mockRepository.findByUploader).toHaveBeenCalledWith(
				'550e8400-e29b-41d4-a716-446655440000'
			);
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findByUploader).mockRejectedValue(new Error('Database error'));

			const result = await service.getDocumentsByUploader('550e8400-e29b-41d4-a716-446655440000');

			expect(result.isError).toBe(true);
		});
	});

	describe('searchDocuments', () => {
		it('should search documents by title', async () => {
			const testDoc = createTestDocument();
			vi.mocked(mockRepository.searchByTitle).mockResolvedValue(Result.ok([testDoc]));

			const result = await service.searchDocuments('Test');

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toHaveLength(1);
			}
			expect(mockRepository.searchByTitle).toHaveBeenCalledWith('Test');
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.searchByTitle).mockRejectedValue(new Error('Database error'));

			const result = await service.searchDocuments('Test');

			expect(result.isError).toBe(true);
		});
	});

	describe('countDocuments', () => {
		it('should count documents without filter', async () => {
			vi.mocked(mockRepository.count).mockResolvedValue(Result.ok(42));

			const result = await service.countDocuments();

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toBe(42);
			}
			expect(mockRepository.count).toHaveBeenCalledWith(undefined);
		});

		it('should count documents with filter', async () => {
			const filter = { type: ['policy'] };
			vi.mocked(mockRepository.count).mockResolvedValue(Result.ok(10));

			const result = await service.countDocuments(filter);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toBe(10);
			}
			expect(mockRepository.count).toHaveBeenCalledWith(filter);
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.count).mockRejectedValue(new Error('Database error'));

			const result = await service.countDocuments();

			expect(result.isError).toBe(true);
		});
	});

	describe('documentExists', () => {
		it('should return true when document exists', async () => {
			vi.mocked(mockRepository.exists).mockResolvedValue(true);

			const result = await service.documentExists('doc-123');

			expect(result).toBe(true);
			expect(mockRepository.exists).toHaveBeenCalledWith('doc-123');
		});

		it('should return false when document does not exist', async () => {
			vi.mocked(mockRepository.exists).mockResolvedValue(false);

			const result = await service.documentExists('doc-999');

			expect(result).toBe(false);
		});

		it('should return false on repository errors', async () => {
			vi.mocked(mockRepository.exists).mockRejectedValue(new Error('Database error'));

			const result = await service.documentExists('doc-123');

			expect(result).toBe(false);
		});
	});
});
