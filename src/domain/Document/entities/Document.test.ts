import { describe, it, expect } from 'vitest';
import { Document } from './Document';
import { DocumentTitle } from '../value-objects/DocumentTitle';
import { DocumentType } from '../value-objects/DocumentType';
import { FileSize } from '../value-objects/FileSize';
import { MimeType } from '../value-objects/MimeType';
import { UploadedBy } from '../value-objects/UploadedBy';
import { DocumentStatus } from '../value-objects/DocumentStatus';
import { DocumentValidationError } from '../errors/DocumentErrors';

describe('Document Entity', () => {
	const createValidProps = () => ({
		id: 'doc-123',
		title: DocumentTitle.create('Employee Handbook 2025').value!,
		type: DocumentType.create('policy').value!,
		fileSize: FileSize.create(1024 * 1024).value!,
		mimeType: MimeType.create('application/pdf').value!,
		uploadedBy: UploadedBy.create('550e8400-e29b-41d4-a716-446655440000').value!,
		status: DocumentStatus.create('draft').value!,
		filePath: '/documents/handbook-2025.pdf',
		uploadedAt: new Date('2025-01-15T10:00:00Z'),
		updatedAt: new Date('2025-01-15T10:00:00Z')
	});

	describe('create', () => {
		it('should create a valid document', () => {
			const result = Document.create(createValidProps());

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.id).toBe('doc-123');
				expect(result.value.title.value).toBe('Employee Handbook 2025');
				expect(result.value.type.value).toBe('policy');
			}
		});

		it('should reject document with empty ID', () => {
			const props = { ...createValidProps(), id: '' };
			const result = Document.create(props);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(DocumentValidationError);
				expect(result.error.message).toContain('ID is required');
			}
		});

		it('should reject document with whitespace-only ID', () => {
			const props = { ...createValidProps(), id: '   ' };
			const result = Document.create(props);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(DocumentValidationError);
				expect(result.error.message).toContain('ID is required');
			}
		});

		it('should reject document with empty filePath', () => {
			const props = { ...createValidProps(), filePath: '' };
			const result = Document.create(props);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error).toBeInstanceOf(DocumentValidationError);
				expect(result.error.message).toContain('File path is required');
			}
		});

		it('should create document with defensive date copies', () => {
			const uploadedAt = new Date('2025-01-15T10:00:00Z');
			const updatedAt = new Date('2025-01-15T11:00:00Z');
			const props = { ...createValidProps(), uploadedAt, updatedAt };

			const result = Document.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				// Mutate original dates
				uploadedAt.setFullYear(2020);
				updatedAt.setFullYear(2020);

				// Entity dates should be unchanged
				expect(result.value.uploadedAt.getFullYear()).toBe(2025);
				expect(result.value.updatedAt.getFullYear()).toBe(2025);
			}
		});
	});

	describe('getters', () => {
		it('should return all document properties', () => {
			const props = createValidProps();
			const result = Document.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const doc = result.value;
				expect(doc.id).toBe('doc-123');
				expect(doc.title.value).toBe('Employee Handbook 2025');
				expect(doc.type.value).toBe('policy');
				expect(doc.fileSize.bytes).toBe(1024 * 1024);
				expect(doc.mimeType.value).toBe('application/pdf');
				expect(doc.uploadedBy.value).toBe('550e8400-e29b-41d4-a716-446655440000');
				expect(doc.status.value).toBe('draft');
				expect(doc.filePath).toBe('/documents/handbook-2025.pdf');
			}
		});

		it('should return defensive copies of dates', () => {
			const result = Document.create(createValidProps());

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const uploadedAt = result.value.uploadedAt;
				const updatedAt = result.value.updatedAt;

				// Mutate returned dates
				uploadedAt.setFullYear(2020);
				updatedAt.setFullYear(2020);

				// Entity dates should be unchanged
				expect(result.value.uploadedAt.getFullYear()).toBe(2025);
				expect(result.value.updatedAt.getFullYear()).toBe(2025);
			}
		});
	});

	describe('status transitions', () => {
		describe('publish', () => {
			it('should transition draft to published', () => {
				const result = Document.create(createValidProps());

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const publishedDoc = result.value.publish();
					expect(publishedDoc.status.value).toBe('published');
					expect(publishedDoc.status.isPublished()).toBe(true);
				}
			});

			it('should update updatedAt timestamp on publish', () => {
				const result = Document.create(createValidProps());

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const originalUpdatedAt = result.value.updatedAt.getTime();

					// Wait a bit to ensure different timestamp
					const publishedDoc = result.value.publish();

					expect(publishedDoc.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
				}
			});

			it('should return new instance (immutability)', () => {
				const result = Document.create(createValidProps());

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const original = result.value;
					const published = original.publish();

					expect(published).not.toBe(original);
					expect(original.status.value).toBe('draft');
					expect(published.status.value).toBe('published');
				}
			});
		});

		describe('archive', () => {
			it('should transition published to archived', () => {
				const props = {
					...createValidProps(),
					status: DocumentStatus.create('published').value!
				};
				const result = Document.create(props);

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const archivedDoc = result.value.archive();
					expect(archivedDoc.status.value).toBe('archived');
					expect(archivedDoc.status.isArchived()).toBe(true);
				}
			});

			it('should update updatedAt timestamp on archive', () => {
				const props = {
					...createValidProps(),
					status: DocumentStatus.create('published').value!
				};
				const result = Document.create(props);

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const originalUpdatedAt = result.value.updatedAt.getTime();
					const archivedDoc = result.value.archive();

					expect(archivedDoc.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
				}
			});

			it('should return new instance (immutability)', () => {
				const props = {
					...createValidProps(),
					status: DocumentStatus.create('published').value!
				};
				const result = Document.create(props);

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const original = result.value;
					const archived = original.archive();

					expect(archived).not.toBe(original);
					expect(original.status.value).toBe('published');
					expect(archived.status.value).toBe('archived');
				}
			});
		});

		describe('delete', () => {
			it('should transition any status to deleted', () => {
				const result = Document.create(createValidProps());

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const deletedDoc = result.value.delete();
					expect(deletedDoc.status.value).toBe('deleted');
					expect(deletedDoc.status.isDeleted()).toBe(true);
				}
			});

			it('should delete published document', () => {
				const props = {
					...createValidProps(),
					status: DocumentStatus.create('published').value!
				};
				const result = Document.create(props);

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const deletedDoc = result.value.delete();
					expect(deletedDoc.status.value).toBe('deleted');
				}
			});

			it('should update updatedAt timestamp on delete', () => {
				const result = Document.create(createValidProps());

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const originalUpdatedAt = result.value.updatedAt.getTime();
					const deletedDoc = result.value.delete();

					expect(deletedDoc.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
				}
			});

			it('should return new instance (immutability)', () => {
				const result = Document.create(createValidProps());

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					const original = result.value;
					const deleted = original.delete();

					expect(deleted).not.toBe(original);
					expect(original.status.value).toBe('draft');
					expect(deleted.status.value).toBe('deleted');
				}
			});
		});
	});

	describe('updateTitle', () => {
		it('should update document title', () => {
			const result = Document.create(createValidProps());

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const newTitle = DocumentTitle.create('Updated Handbook').value!;
				const updated = result.value.updateTitle(newTitle);

				expect(updated.title.value).toBe('Updated Handbook');
			}
		});

		it('should update updatedAt timestamp', () => {
			const result = Document.create(createValidProps());

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const originalUpdatedAt = result.value.updatedAt.getTime();
				const newTitle = DocumentTitle.create('Updated Handbook').value!;
				const updated = result.value.updateTitle(newTitle);

				expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt);
			}
		});

		it('should return new instance (immutability)', () => {
			const result = Document.create(createValidProps());

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const original = result.value;
				const newTitle = DocumentTitle.create('Updated Handbook').value!;
				const updated = original.updateTitle(newTitle);

				expect(updated).not.toBe(original);
				expect(original.title.value).toBe('Employee Handbook 2025');
				expect(updated.title.value).toBe('Updated Handbook');
			}
		});
	});

	describe('equals', () => {
		it('should return true for documents with same ID', () => {
			const props = createValidProps();
			const doc1 = Document.create(props).value!;
			const doc2 = Document.create(props).value!;

			expect(doc1.equals(doc2)).toBe(true);
		});

		it('should return false for documents with different IDs', () => {
			const props1 = createValidProps();
			const props2 = { ...createValidProps(), id: 'doc-999' };

			const doc1 = Document.create(props1).value!;
			const doc2 = Document.create(props2).value!;

			expect(doc1.equals(doc2)).toBe(false);
		});
	});
});
