/**
 * Unit Test: Image Validation
 * Feature: 027-we-need-to
 *
 * Tests for image file validation including size, type, dimensions, and aspect ratio.
 * MUST FAIL until implementation in src/lib/utils/image-validation.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	validateImageFile,
	validateImageSize,
	validateImageType,
	validateAspectRatio,
	calculateAspectRatio,
	isValidAspectRatio
} from '$lib/utils/image-validation';

describe('Image Validation', () => {
	// Mock Image and URL.createObjectURL for browser APIs
	let mockImage: any;
	let originalImage: any;
	let originalCreateObjectURL: any;
	let originalRevokeObjectURL: any;

	beforeEach(() => {
		// Save originals
		originalImage = global.Image;
		originalCreateObjectURL = global.URL.createObjectURL;
		originalRevokeObjectURL = global.URL.revokeObjectURL;

		// Mock Image constructor
		mockImage = class MockImage {
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			width = 1920;
			height = 1080;
			src = '';

			constructor() {
				// Simulate successful image load after src is set
				setTimeout(() => {
					if (this.onload) {
						this.onload();
					}
				}, 0);
			}
		};

		global.Image = mockImage as any;

		// Mock URL.createObjectURL and revokeObjectURL
		global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
		global.URL.revokeObjectURL = vi.fn();
	});

	afterEach(() => {
		// Restore originals
		global.Image = originalImage;
		global.URL.createObjectURL = originalCreateObjectURL;
		global.URL.revokeObjectURL = originalRevokeObjectURL;
	});

	describe('validateImageFile', () => {
		it('should pass validation for valid image (JPEG, 5MB, 16:9)', async () => {
			const mockFile = new File(['x'.repeat(5 * 1024 * 1024)], 'test.jpg', {
				type: 'image/jpeg'
			});

			const result = await validateImageFile(mockFile, '16:9');

			expect(result.valid).toBe(true);
			expect(result.errors).toHaveLength(0);
		});

		it('should fail validation for file size > 10MB', async () => {
			const mockFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', {
				type: 'image/jpeg'
			});

			const result = await validateImageFile(mockFile, '16:9');

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('File size exceeds 10MB limit');
		});

		it('should fail validation for invalid file type', async () => {
			const mockFile = new File(['fake-content'], 'test.txt', { type: 'text/plain' });

			const result = await validateImageFile(mockFile, '16:9');

			expect(result.valid).toBe(false);
			expect(result.errors).toContain('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
		});

		it('should return multiple errors when multiple validations fail', async () => {
			const mockFile = new File(['x'.repeat(11 * 1024 * 1024)], 'bad.txt', {
				type: 'text/plain'
			});

			const result = await validateImageFile(mockFile, '16:9');

			expect(result.valid).toBe(false);
			expect(result.errors.length).toBeGreaterThan(1);
		});
	});

	describe('validateImageSize', () => {
		it('should pass for file size exactly 10MB', () => {
			const file = new File(['x'.repeat(10 * 1024 * 1024)], 'max.jpg', { type: 'image/jpeg' });

			const result = validateImageSize(file);

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
		});

		it('should pass for file size 1 byte under 10MB', () => {
			const file = new File(['x'.repeat(10 * 1024 * 1024 - 1)], 'almost-max.jpg', {
				type: 'image/jpeg'
			});

			const result = validateImageSize(file);

			expect(result.valid).toBe(true);
		});

		it('should fail for file size 1 byte over 10MB', () => {
			const file = new File(['x'.repeat(10 * 1024 * 1024 + 1)], 'over-max.jpg', {
				type: 'image/jpeg'
			});

			const result = validateImageSize(file);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('File size exceeds 10MB limit');
		});

		it('should pass for very small files (1KB)', () => {
			const file = new File(['x'.repeat(1024)], 'small.jpg', { type: 'image/jpeg' });

			const result = validateImageSize(file);

			expect(result.valid).toBe(true);
		});
	});

	describe('validateImageType', () => {
		it('should accept image/jpeg', () => {
			const file = new File(['fake'], 'test.jpg', { type: 'image/jpeg' });

			const result = validateImageType(file);

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
		});

		it('should accept image/png', () => {
			const file = new File(['fake'], 'test.png', { type: 'image/png' });

			const result = validateImageType(file);

			expect(result.valid).toBe(true);
		});

		it('should accept image/webp', () => {
			const file = new File(['fake'], 'test.webp', { type: 'image/webp' });

			const result = validateImageType(file);

			expect(result.valid).toBe(true);
		});

		it('should reject image/gif', () => {
			const file = new File(['fake'], 'animated.gif', { type: 'image/gif' });

			const result = validateImageType(file);

			expect(result.valid).toBe(false);
			expect(result.error).toBe('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
		});

		it('should reject image/svg+xml', () => {
			const file = new File(['<svg></svg>'], 'icon.svg', { type: 'image/svg+xml' });

			const result = validateImageType(file);

			expect(result.valid).toBe(false);
		});

		it('should reject non-image types', () => {
			const file = new File(['fake'], 'doc.pdf', { type: 'application/pdf' });

			const result = validateImageType(file);

			expect(result.valid).toBe(false);
		});

		it('should reject empty MIME type', () => {
			const file = new File(['fake'], 'unknown.dat', { type: '' });

			const result = validateImageType(file);

			expect(result.valid).toBe(false);
		});
	});

	describe('calculateAspectRatio', () => {
		it('should calculate 16:9 aspect ratio', () => {
			const width = 1920;
			const height = 1080;

			const ratio = calculateAspectRatio(width, height);

			expect(ratio).toBe('16:9');
		});

		it('should calculate 9:16 aspect ratio', () => {
			const width = 1080;
			const height = 1920;

			const ratio = calculateAspectRatio(width, height);

			expect(ratio).toBe('9:16');
		});

		it('should handle 16:9 with tolerance (1919x1080)', () => {
			// Slight deviation within tolerance
			const width = 1919;
			const height = 1080;

			const ratio = calculateAspectRatio(width, height);

			// Should still be recognized as 16:9 within tolerance
			expect(ratio).toBe('16:9');
		});

		it('should handle 9:16 with tolerance (1080x1919)', () => {
			const width = 1080;
			const height = 1919;

			const ratio = calculateAspectRatio(width, height);

			expect(ratio).toBe('9:16');
		});

		it('should return "unknown" for unsupported aspect ratio (4:3)', () => {
			const width = 1024;
			const height = 768;

			const ratio = calculateAspectRatio(width, height);

			expect(ratio).toBe('unknown');
		});

		it('should return "unknown" for unsupported aspect ratio (1:1)', () => {
			const width = 1000;
			const height = 1000;

			const ratio = calculateAspectRatio(width, height);

			expect(ratio).toBe('unknown');
		});

		it('should handle very large dimensions (4K 16:9)', () => {
			const width = 3840;
			const height = 2160;

			const ratio = calculateAspectRatio(width, height);

			expect(ratio).toBe('16:9');
		});

		it('should handle small dimensions (480x270)', () => {
			const width = 480;
			const height = 270;

			const ratio = calculateAspectRatio(width, height);

			expect(ratio).toBe('16:9');
		});
	});

	describe('validateAspectRatio', () => {
		it('should pass when image matches expected 16:9 ratio', async () => {
			// Mock image with 16:9 dimensions
			const mockImage = { width: 1920, height: 1080 };

			const result = await validateAspectRatio(mockImage as HTMLImageElement, '16:9');

			expect(result.valid).toBe(true);
			expect(result.error).toBeNull();
		});

		it('should pass when image matches expected 9:16 ratio', async () => {
			const mockImage = { width: 1080, height: 1920 };

			const result = await validateAspectRatio(mockImage as HTMLImageElement, '9:16');

			expect(result.valid).toBe(true);
		});

		it('should fail when image is 16:9 but 9:16 expected', async () => {
			const mockImage = { width: 1920, height: 1080 };

			const result = await validateAspectRatio(mockImage as HTMLImageElement, '9:16');

			expect(result.valid).toBe(false);
			expect(result.error).toContain('aspect ratio');
		});

		it('should fail when image is 9:16 but 16:9 expected', async () => {
			const mockImage = { width: 1080, height: 1920 };

			const result = await validateAspectRatio(mockImage as HTMLImageElement, '16:9');

			expect(result.valid).toBe(false);
		});

		it('should fail when image has unsupported aspect ratio (4:3)', async () => {
			const mockImage = { width: 1024, height: 768 };

			const result = await validateAspectRatio(mockImage as HTMLImageElement, '16:9');

			expect(result.valid).toBe(false);
			expect(result.error).toContain('Unsupported aspect ratio');
		});

		it('should allow slight deviation within tolerance', async () => {
			// 1919x1080 is very close to 16:9 (1920x1080)
			const mockImage = { width: 1919, height: 1080 };

			const result = await validateAspectRatio(mockImage as HTMLImageElement, '16:9');

			expect(result.valid).toBe(true);
		});
	});

	describe('isValidAspectRatio', () => {
		it('should return true for "16:9"', () => {
			expect(isValidAspectRatio('16:9')).toBe(true);
		});

		it('should return true for "9:16"', () => {
			expect(isValidAspectRatio('9:16')).toBe(true);
		});

		it('should return false for "4:3"', () => {
			expect(isValidAspectRatio('4:3')).toBe(false);
		});

		it('should return false for "1:1"', () => {
			expect(isValidAspectRatio('1:1')).toBe(false);
		});

		it('should return false for "unknown"', () => {
			expect(isValidAspectRatio('unknown')).toBe(false);
		});

		it('should return false for empty string', () => {
			expect(isValidAspectRatio('')).toBe(false);
		});

		it('should return false for invalid format', () => {
			expect(isValidAspectRatio('16x9')).toBe(false);
			expect(isValidAspectRatio('widescreen')).toBe(false);
		});
	});
});
