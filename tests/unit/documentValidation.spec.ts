// Unit test: Document validation schemas (T053)
// Tests Zod schemas for document management

import { describe, expect, it } from 'vitest';
import {
	documentFilterSchema,
	documentMetadataSchema,
	documentUploadSchema,
	validateFileSize,
	validateFileType
} from '$lib/schemas/documentSchemas';
import { encryptionKeySchema } from '$lib/schemas/encryptionSchemas';

/**
 * Unit Test: Document Validation Schemas
 *
 * Tests Zod validation schemas for:
 * - Document upload validation
 * - Metadata validation
 * - Filter parameters
 * - Encryption key validation
 * - File size and type enforcement
 */

describe('Document Validation - Unit Tests', () => {
	describe('documentUploadSchema', () => {
		it('should accept valid upload metadata', () => {
			// Arrange
			const validData = {
				file: createMockFile('document.pdf', 1024 * 1024, 'application/pdf'), // 1MB
				metadata: {
					filename: 'contract.pdf',
					category: 'Contract',
					sensitivityLevel: 'Internal',
					metadataTags: {
						description: 'Employment contract'
					}
				}
			};

			// Act
			const result = documentUploadSchema.safeParse(validData);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.metadata.category).toBe('Contract');
				expect(result.data.metadata.sensitivityLevel).toBe('Internal');
			}
		});

		it('should reject 51MB file (exceeds 50MB limit)', () => {
			// Arrange
			const oversizedFile = createMockFile(
				'large.pdf',
				51 * 1024 * 1024, // 51MB
				'application/pdf'
			);

			const data = {
				file: oversizedFile,
				metadata: {
					filename: 'large.pdf',
					category: 'Report',
					sensitivityLevel: 'Internal'
				}
			};

			// Act
			const result = documentUploadSchema.safeParse(data);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues).toContainEqual(
					expect.objectContaining({
						message: expect.stringMatching(/50\s*MB|size/i)
					})
				);
			}
		});

		it('should reject .EXE file type', () => {
			// Arrange
			const exeFile = createMockFile('program.exe', 1024, 'application/x-msdownload');

			const data = {
				file: exeFile,
				metadata: {
					filename: 'program.exe',
					category: 'Other',
					sensitivityLevel: 'Internal'
				}
			};

			// Act
			const result = documentUploadSchema.safeParse(data);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				const hasFileTypeError = result.error.issues.some((issue) =>
					issue.message.match(/file\s*type|invalid|allowed/i)
				);
				expect(hasFileTypeError).toBe(true);
			}
		});

		it('should reject invalid sensitivity level', () => {
			// Arrange
			const data = {
				file: createMockFile('doc.pdf', 1024, 'application/pdf'),
				metadata: {
					filename: 'doc.pdf',
					category: 'Contract',
					sensitivityLevel: 'InvalidLevel' // Not in enum
				}
			};

			// Act
			const result = documentUploadSchema.safeParse(data);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				const hasSensitivityError = result.error.issues.some((issue) =>
					issue.path.includes('sensitivityLevel')
				);
				expect(hasSensitivityError).toBe(true);
			}
		});

		it('should reject missing required fields', () => {
			// Arrange: Missing category
			const data = {
				file: createMockFile('doc.pdf', 1024, 'application/pdf'),
				metadata: {
					filename: 'doc.pdf',
					// Missing category
					sensitivityLevel: 'Internal'
				}
			};

			// Act
			const result = documentUploadSchema.safeParse(data);

			// Assert
			expect(result.success).toBe(false);
			if (!result.success) {
				const hasCategoryError = result.error.issues.some((issue) =>
					issue.path.includes('category')
				);
				expect(hasCategoryError).toBe(true);
			}
		});

		it('should accept all 8 allowed file types', () => {
			const allowedTypes = [
				{ name: 'doc.pdf', mime: 'application/pdf' },
				{ name: 'image.jpeg', mime: 'image/jpeg' },
				{ name: 'photo.png', mime: 'image/png' },
				{ name: 'anim.gif', mime: 'image/gif' },
				{
					name: 'document.docx',
					mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				},
				{
					name: 'sheet.xlsx',
					mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				},
				{ name: 'notes.txt', mime: 'text/plain' },
				{ name: 'data.csv', mime: 'text/csv' }
			];

			allowedTypes.forEach(({ name, mime }) => {
				const data = {
					file: createMockFile(name, 1024, mime),
					metadata: {
						filename: name,
						category: 'Other',
						sensitivityLevel: 'Internal'
					}
				};

				const result = documentUploadSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should accept optional description field in metadataTags', () => {
			// Arrange
			const data = {
				file: createMockFile('doc.pdf', 1024, 'application/pdf'),
				metadata: {
					filename: 'doc.pdf',
					category: 'Policy',
					sensitivityLevel: 'Internal',
					metadataTags: {
						description: 'This is an optional description field'
					}
				}
			};

			// Act
			const result = documentUploadSchema.safeParse(data);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.metadata.metadataTags?.description).toBe('This is an optional description field');
			}
		});

		it('should accept description in metadataTags with any length', () => {
			// Arrange: Description in metadataTags has no length restriction (stored as JSONB)
			const longDescription = 'a'.repeat(501);

			const data = {
				file: createMockFile('doc.pdf', 1024, 'application/pdf'),
				metadata: {
					filename: 'doc.pdf',
					category: 'Policy',
					sensitivityLevel: 'Internal',
					metadataTags: {
						description: longDescription
					}
				}
			};

			// Act
			const result = documentUploadSchema.safeParse(data);

			// Assert - Should succeed since metadataTags is a free-form Record<string, unknown>
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.metadata.metadataTags?.description).toBe(longDescription);
			}
		});
	});

	describe('documentMetadataSchema', () => {
		it('should validate all sensitivity levels', () => {
			const sensitivityLevels = ['Public', 'Internal', 'Confidential', 'Sensitive-PII'];

			sensitivityLevels.forEach((level) => {
				const data = {
					filename: 'test.pdf',
					category: 'Contract',
					sensitivityLevel: level
				};

				const result = documentMetadataSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});

		it('should validate all category types', () => {
			const categories = [
				'Contract',
				'Policy',
				'Report',
				'Invoice',
				'Certificate',
				'Payslip',
				'Other'
			];

			categories.forEach((category) => {
				const data = {
					filename: 'test.pdf',
					category,
					sensitivityLevel: 'Internal'
				};

				const result = documentMetadataSchema.safeParse(data);
				expect(result.success).toBe(true);
			});
		});
	});

	describe('documentFilterSchema', () => {
		it('should accept valid filter parameters', () => {
			// Arrange
			const filters = {
				employeeId: 'emp-123',
				category: 'Contract',
				sensitivityLevel: 'Confidential',
				page: 1,
				limit: 20,
				searchQuery: 'employment'
			};

			// Act
			const result = documentFilterSchema.safeParse(filters);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1);
				expect(result.data.limit).toBe(20);
			}
		});

		it('should apply default values for page and limit', () => {
			// Arrange: Minimal filters
			const filters = {};

			// Act
			const result = documentFilterSchema.safeParse(filters);

			// Assert
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.page).toBe(1); // Default
				expect(result.data.limit).toBe(20); // Default
			}
		});

		it('should reject invalid page number (page 0)', () => {
			// Arrange
			const filters = {
				page: 0,
				limit: 20
			};

			// Act
			const result = documentFilterSchema.safeParse(filters);

			// Assert
			expect(result.success).toBe(false);
		});

		it('should reject excessive limit (>100)', () => {
			// Arrange
			const filters = {
				page: 1,
				limit: 101
			};

			// Act
			const result = documentFilterSchema.safeParse(filters);

			// Assert
			expect(result.success).toBe(false);
		});
	});

	describe('encryptionKeySchema', () => {
		it('should accept valid encryption key data', () => {
			// Arrange
			const keyData = {
				keyIdentifier: 'key-12345',
				encryptedKeyData: btoa('encrypted-key-material'), // Base64
				keyAlgorithm: 'AES-GCM-256'
			};

			// Act
			const result = encryptionKeySchema.safeParse(keyData);

			// Assert
			expect(result.success).toBe(true);
		});

		it('should reject invalid base64 encoding', () => {
			// Arrange
			const keyData = {
				keyIdentifier: 'key-12345',
				encryptedKeyData: 'not-valid-base64!@#$%',
				keyAlgorithm: 'AES-GCM-256'
			};

			// Act
			const result = encryptionKeySchema.safeParse(keyData);

			// Assert
			expect(result.success).toBe(false);
		});

		it('should reject missing keyAlgorithm', () => {
			// Arrange
			const keyData = {
				keyIdentifier: 'key-12345',
				encryptedKeyData: btoa('encrypted-key-material')
				// Missing keyAlgorithm
			};

			// Act
			const result = encryptionKeySchema.safeParse(keyData);

			// Assert
			expect(result.success).toBe(false);
		});
	});

	describe('validateFileType()', () => {
		it('should accept valid file types', () => {
			const validFiles = [
				'document.pdf',
				'image.jpeg',
				'photo.png',
				'animation.gif',
				'doc.docx',
				'spreadsheet.xlsx',
				'notes.txt',
				'data.csv'
			];

			validFiles.forEach((filename) => {
				expect(validateFileType(filename)).toBe(true);
			});
		});

		it('should reject invalid file types', () => {
			const invalidFiles = [
				'program.exe',
				'script.sh',
				'archive.zip',
				'video.mp4',
				'audio.mp3',
				'compressed.rar'
			];

			invalidFiles.forEach((filename) => {
				expect(validateFileType(filename)).toBe(false);
			});
		});

		it('should be case-insensitive', () => {
			expect(validateFileType('DOCUMENT.PDF')).toBe(true);
			expect(validateFileType('Image.JPEG')).toBe(true);
			expect(validateFileType('file.TxT')).toBe(true);
		});
	});

	describe('validateFileSize()', () => {
		it('should accept files up to 50MB', () => {
			const validSizes = [
				1024, // 1KB
				1024 * 1024, // 1MB
				10 * 1024 * 1024, // 10MB
				50 * 1024 * 1024 // 50MB (max)
			];

			validSizes.forEach((size) => {
				expect(validateFileSize(size)).toBe(true);
			});
		});

		it('should reject files over 50MB', () => {
			const invalidSizes = [
				50 * 1024 * 1024 + 1, // 50MB + 1 byte
				51 * 1024 * 1024, // 51MB
				100 * 1024 * 1024 // 100MB
			];

			invalidSizes.forEach((size) => {
				expect(validateFileSize(size)).toBe(false);
			});
		});

		it('should reject zero-byte files', () => {
			expect(validateFileSize(0)).toBe(false);
		});

		it('should reject negative sizes', () => {
			expect(validateFileSize(-1)).toBe(false);
		});
	});
});

/**
 * Helper function to create mock File objects for testing
 */
function createMockFile(name: string, sizeBytes: number, mimeType: string): File {
	const buffer = new ArrayBuffer(sizeBytes);
	const blob = new Blob([buffer], { type: mimeType });
	return new File([blob], name, { type: mimeType });
}
