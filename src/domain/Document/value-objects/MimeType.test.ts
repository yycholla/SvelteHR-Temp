import { describe, it, expect } from 'vitest';
import { MimeType } from './MimeType';
import { MimeTypeValidationError } from '../errors/DocumentErrors';

describe('MimeType', () => {
	describe('create', () => {
		describe('valid MIME types', () => {
			it('should create a valid PDF MIME type', () => {
				const result = MimeType.create('application/pdf');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('application/pdf');
				}
			});

			it('should create a valid JPEG image MIME type', () => {
				const result = MimeType.create('image/jpeg');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('image/jpeg');
				}
			});

			it('should create a valid PNG image MIME type', () => {
				const result = MimeType.create('image/png');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('image/png');
				}
			});

			it('should create a valid plain text MIME type', () => {
				const result = MimeType.create('text/plain');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('text/plain');
				}
			});

			it('should create a valid Word document MIME type', () => {
				const result = MimeType.create(
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				);

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe(
						'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
					);
				}
			});

			it('should create a valid Excel MIME type', () => {
				const result = MimeType.create(
					'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
				);

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe(
						'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
					);
				}
			});

			it('should create a valid CSV MIME type', () => {
				const result = MimeType.create('text/csv');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('text/csv');
				}
			});

			it('should create a valid JSON MIME type', () => {
				const result = MimeType.create('application/json');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('application/json');
				}
			});

			it('should create a valid ZIP MIME type', () => {
				const result = MimeType.create('application/zip');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('application/zip');
				}
			});

			it('should create a valid GIF image MIME type', () => {
				const result = MimeType.create('image/gif');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('image/gif');
				}
			});
		});

		describe('normalization', () => {
			it('should normalize MIME type to lowercase', () => {
				const result = MimeType.create('APPLICATION/PDF');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('application/pdf');
				}
			});

			it('should trim whitespace from MIME type', () => {
				const result = MimeType.create('  application/pdf  ');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('application/pdf');
				}
			});

			it('should normalize mixed case with whitespace', () => {
				const result = MimeType.create('  Image/JPEG  ');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.value).toBe('image/jpeg');
				}
			});
		});

		describe('invalid MIME types', () => {
			it('should reject empty MIME type', () => {
				const result = MimeType.create('');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('MIME type cannot be empty');
				}
			});

			it('should reject whitespace-only MIME type', () => {
				const result = MimeType.create('   ');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('MIME type cannot be empty');
				}
			});

			it('should reject MIME type without slash', () => {
				const result = MimeType.create('applicationpdf');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Invalid MIME type format');
				}
			});

			it('should reject MIME type with only type part', () => {
				const result = MimeType.create('application/');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
				}
			});

			it('should reject MIME type with only subtype part', () => {
				const result = MimeType.create('/pdf');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
				}
			});

			it('should reject unknown MIME type', () => {
				const result = MimeType.create('application/unknown-type');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Unsupported MIME type');
				}
			});
		});

		describe('blocked MIME types (security)', () => {
			it('should reject executable files', () => {
				const result = MimeType.create('application/x-executable');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Blocked MIME type for security reasons');
				}
			});

			it('should reject shared library files', () => {
				const result = MimeType.create('application/x-sharedlib');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Blocked MIME type for security reasons');
				}
			});

			it('should reject Windows executables', () => {
				const result = MimeType.create('application/x-msdownload');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Blocked MIME type for security reasons');
				}
			});

			it('should reject shell scripts', () => {
				const result = MimeType.create('application/x-sh');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Blocked MIME type for security reasons');
				}
			});

			it('should reject batch files', () => {
				const result = MimeType.create('application/x-bat');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Blocked MIME type for security reasons');
				}
			});

			it('should reject macOS executables', () => {
				const result = MimeType.create('application/x-mach-binary');

				expect(result.isError).toBe(true);
				if (result.isError) {
					expect(result.error).toBeInstanceOf(MimeTypeValidationError);
					expect(result.error.message).toContain('Blocked MIME type for security reasons');
				}
			});
		});

		describe('category detection', () => {
			it('should identify PDF as document', () => {
				const result = MimeType.create('application/pdf');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.isDocument()).toBe(true);
					expect(result.value.isImage()).toBe(false);
					expect(result.value.isText()).toBe(false);
				}
			});

			it('should identify JPEG as image', () => {
				const result = MimeType.create('image/jpeg');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.isImage()).toBe(true);
					expect(result.value.isDocument()).toBe(false);
					expect(result.value.isText()).toBe(false);
				}
			});

			it('should identify plain text as text', () => {
				const result = MimeType.create('text/plain');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.isText()).toBe(true);
					expect(result.value.isImage()).toBe(false);
					expect(result.value.isDocument()).toBe(false);
				}
			});

			it('should identify Word document as document', () => {
				const result = MimeType.create(
					'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
				);

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.isDocument()).toBe(true);
					expect(result.value.isImage()).toBe(false);
				}
			});

			it('should identify PNG as image', () => {
				const result = MimeType.create('image/png');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.isImage()).toBe(true);
					expect(result.value.isDocument()).toBe(false);
				}
			});
		});

		describe('equals', () => {
			it('should return true for equal MIME types', () => {
				const mimeType1 = MimeType.create('application/pdf');
				const mimeType2 = MimeType.create('application/pdf');

				expect(mimeType1.isOk && mimeType2.isOk).toBe(true);
				if (mimeType1.isOk && mimeType2.isOk) {
					expect(mimeType1.value.equals(mimeType2.value)).toBe(true);
				}
			});

			it('should return false for different MIME types', () => {
				const mimeType1 = MimeType.create('application/pdf');
				const mimeType2 = MimeType.create('image/jpeg');

				expect(mimeType1.isOk && mimeType2.isOk).toBe(true);
				if (mimeType1.isOk && mimeType2.isOk) {
					expect(mimeType1.value.equals(mimeType2.value)).toBe(false);
				}
			});

			it('should return true for normalized MIME types', () => {
				const mimeType1 = MimeType.create('APPLICATION/PDF');
				const mimeType2 = MimeType.create('application/pdf');

				expect(mimeType1.isOk && mimeType2.isOk).toBe(true);
				if (mimeType1.isOk && mimeType2.isOk) {
					expect(mimeType1.value.equals(mimeType2.value)).toBe(true);
				}
			});
		});

		describe('toString', () => {
			it('should return the MIME type string', () => {
				const result = MimeType.create('application/pdf');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.toString()).toBe('application/pdf');
				}
			});

			it('should return normalized MIME type', () => {
				const result = MimeType.create('IMAGE/JPEG');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.toString()).toBe('image/jpeg');
				}
			});
		});

		describe('file extension mapping', () => {
			it('should identify common file extension for PDF', () => {
				const result = MimeType.create('application/pdf');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.getCommonExtension()).toBe('.pdf');
				}
			});

			it('should identify common file extension for JPEG', () => {
				const result = MimeType.create('image/jpeg');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.getCommonExtension()).toBe('.jpg');
				}
			});

			it('should identify common file extension for PNG', () => {
				const result = MimeType.create('image/png');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.getCommonExtension()).toBe('.png');
				}
			});

			it('should identify common file extension for plain text', () => {
				const result = MimeType.create('text/plain');

				expect(result.isOk).toBe(true);
				if (result.isOk) {
					expect(result.value.getCommonExtension()).toBe('.txt');
				}
			});
		});
	});
});
