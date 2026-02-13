import { describe, it, expect } from 'vitest';
import { FileSize } from './FileSize';
import { FileSizeValidationError } from '../errors/DocumentErrors';

describe('FileSize', () => {
	const MAX_FILE_SIZE = 52428800; // 50MB in bytes

	describe('create()', () => {
		describe('valid sizes', () => {
			it('should create file size with 0 bytes', () => {
				const result = FileSize.create(0);
				expect(result.isOk).toBe(true);
				expect(result.value?.bytes).toBe(0);
			});

			it('should create file size with 1 byte', () => {
				const result = FileSize.create(1);
				expect(result.isOk).toBe(true);
				expect(result.value?.bytes).toBe(1);
			});

			it('should create file size with typical size (1MB)', () => {
				const oneMB = 1048576;
				const result = FileSize.create(oneMB);
				expect(result.isOk).toBe(true);
				expect(result.value?.bytes).toBe(oneMB);
			});

			it('should create file size with maximum size (50MB)', () => {
				const result = FileSize.create(MAX_FILE_SIZE);
				expect(result.isOk).toBe(true);
				expect(result.value?.bytes).toBe(MAX_FILE_SIZE);
			});

			it('should create file size just under maximum', () => {
				const result = FileSize.create(MAX_FILE_SIZE - 1);
				expect(result.isOk).toBe(true);
				expect(result.value?.bytes).toBe(MAX_FILE_SIZE - 1);
			});
		});

		describe('validation', () => {
			it('should reject negative file size', () => {
				const result = FileSize.create(-1);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(FileSizeValidationError);
				expect(result.error?.message).toContain('must be non-negative');
			});

			it('should reject file size exceeding maximum', () => {
				const result = FileSize.create(MAX_FILE_SIZE + 1);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(FileSizeValidationError);
				expect(result.error?.message).toContain('exceeds');
			});

			it('should include max size in error message', () => {
				const result = FileSize.create(MAX_FILE_SIZE + 100);
				expect(result.isError).toBe(true);
				expect(result.error?.message).toContain(MAX_FILE_SIZE.toString());
			});

			it('should reject very large negative number', () => {
				const result = FileSize.create(-1000000);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(FileSizeValidationError);
			});

			it('should reject file size way over maximum', () => {
				const result = FileSize.create(100000000); // 100MB
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(FileSizeValidationError);
			});
		});
	});

	describe('bytes getter', () => {
		it('should return size in bytes', () => {
			const fileSize = FileSize.create(1024).value!;
			expect(fileSize.bytes).toBe(1024);
		});

		it('should return 0 for empty file', () => {
			const fileSize = FileSize.create(0).value!;
			expect(fileSize.bytes).toBe(0);
		});

		it('should return correct value for max size', () => {
			const fileSize = FileSize.create(MAX_FILE_SIZE).value!;
			expect(fileSize.bytes).toBe(MAX_FILE_SIZE);
		});
	});

	describe('kilobytes getter', () => {
		it('should convert bytes to kilobytes', () => {
			const fileSize = FileSize.create(2048).value!;
			expect(fileSize.kilobytes).toBe(2);
		});

		it('should return 0 for empty file', () => {
			const fileSize = FileSize.create(0).value!;
			expect(fileSize.kilobytes).toBe(0);
		});

		it('should handle fractional kilobytes', () => {
			const fileSize = FileSize.create(1536).value!; // 1.5KB
			expect(fileSize.kilobytes).toBe(1.5);
		});

		it('should convert 1024 bytes to 1 KB', () => {
			const fileSize = FileSize.create(1024).value!;
			expect(fileSize.kilobytes).toBe(1);
		});
	});

	describe('megabytes getter', () => {
		it('should convert bytes to megabytes', () => {
			const oneMB = 1048576;
			const fileSize = FileSize.create(oneMB).value!;
			expect(fileSize.megabytes).toBe(1);
		});

		it('should return 0 for empty file', () => {
			const fileSize = FileSize.create(0).value!;
			expect(fileSize.megabytes).toBe(0);
		});

		it('should handle fractional megabytes', () => {
			const halfMB = 524288;
			const fileSize = FileSize.create(halfMB).value!;
			expect(fileSize.megabytes).toBe(0.5);
		});

		it('should convert max size to megabytes correctly', () => {
			const fileSize = FileSize.create(MAX_FILE_SIZE).value!;
			expect(fileSize.megabytes).toBe(50);
		});

		it('should handle 10MB correctly', () => {
			const tenMB = 10485760;
			const fileSize = FileSize.create(tenMB).value!;
			expect(fileSize.megabytes).toBe(10);
		});
	});

	describe('equals()', () => {
		it('should return true for same byte size', () => {
			const size1 = FileSize.create(1024).value!;
			const size2 = FileSize.create(1024).value!;
			expect(size1.equals(size2)).toBe(true);
		});

		it('should return false for different byte sizes', () => {
			const size1 = FileSize.create(1024).value!;
			const size2 = FileSize.create(2048).value!;
			expect(size1.equals(size2)).toBe(false);
		});

		it('should return true for both zero', () => {
			const size1 = FileSize.create(0).value!;
			const size2 = FileSize.create(0).value!;
			expect(size1.equals(size2)).toBe(true);
		});

		it('should return true for max sizes', () => {
			const size1 = FileSize.create(MAX_FILE_SIZE).value!;
			const size2 = FileSize.create(MAX_FILE_SIZE).value!;
			expect(size1.equals(size2)).toBe(true);
		});
	});

	describe('humanReadable()', () => {
		it('should format bytes less than 1KB', () => {
			const fileSize = FileSize.create(512).value!;
			expect(fileSize.humanReadable()).toBe('512 B');
		});

		it('should format zero bytes', () => {
			const fileSize = FileSize.create(0).value!;
			expect(fileSize.humanReadable()).toBe('0 B');
		});

		it('should format kilobytes', () => {
			const fileSize = FileSize.create(2048).value!;
			expect(fileSize.humanReadable()).toBe('2.00 KB');
		});

		it('should format megabytes', () => {
			const fileSize = FileSize.create(2097152).value!; // 2MB
			expect(fileSize.humanReadable()).toBe('2.00 MB');
		});

		it('should format fractional megabytes', () => {
			const fileSize = FileSize.create(1572864).value!; // 1.5MB
			expect(fileSize.humanReadable()).toBe('1.50 MB');
		});

		it('should format max size', () => {
			const fileSize = FileSize.create(MAX_FILE_SIZE).value!;
			expect(fileSize.humanReadable()).toBe('50.00 MB');
		});

		it('should format size just over 1KB', () => {
			const fileSize = FileSize.create(1100).value!;
			expect(fileSize.humanReadable()).toBe('1.07 KB');
		});
	});
});
