/**
 * Image Service
 * Feature: 025-events-flesh-out
 *
 * Service for uploading, resizing, optimizing, and validating event images.
 * Uses Sharp for image processing with 10MB limit enforcement.
 */

import sharp from 'sharp';
import { nanoid } from 'nanoid';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export interface ImageUploadOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number;
	format?: 'jpeg' | 'png' | 'webp';
}

export interface ImageUploadResult {
	success: boolean;
	url?: string;
	error?: string;
	optimizedSize?: number;
	originalSize?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const UPLOAD_DIR = 'static/uploads/events';
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Image Service Class
 */
export class ImageService {
	/**
	 * Validate image file before processing
	 */
	static validateImage(file: File): { isValid: boolean; error?: string } {
		// Check file size
		if (file.size > MAX_FILE_SIZE) {
			return {
				isValid: false,
				error: `Image exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
			};
		}

		// Check MIME type
		if (!ALLOWED_MIME_TYPES.includes(file.type)) {
			return {
				isValid: false,
				error: `Invalid image type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
			};
		}

		return { isValid: true };
	}

	/**
	 * Upload and optimize event image
	 */
	static async uploadEventImage(
		fileBuffer: Buffer,
		mimeType: string,
		options: ImageUploadOptions = {}
	): Promise<ImageUploadResult> {
		try {
			const originalSize = fileBuffer.length;

			// Validate size
			if (originalSize > MAX_FILE_SIZE) {
				return {
					success: false,
					error: `Image exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
				};
			}

			// Validate MIME type
			if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
				return {
					success: false,
					error: `Invalid image type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
				};
			}

			// Default options
			const maxWidth = options.maxWidth || 1920;
			const maxHeight = options.maxHeight || 1080;
			const quality = options.quality || 85;
			const format = options.format || 'webp';

			// Process image with Sharp
			let processedImage = sharp(fileBuffer);

			// Get metadata
			const metadata = await processedImage.metadata();

			// Resize if needed
			if (metadata.width && metadata.width > maxWidth) {
				processedImage = processedImage.resize(maxWidth, null, {
					withoutEnlargement: true,
					fit: 'inside'
				});
			} else if (metadata.height && metadata.height > maxHeight) {
				processedImage = processedImage.resize(null, maxHeight, {
					withoutEnlargement: true,
					fit: 'inside'
				});
			}

			// Convert to optimized format
			if (format === 'webp') {
				processedImage = processedImage.webp({ quality });
			} else if (format === 'jpeg') {
				processedImage = processedImage.jpeg({ quality, progressive: true });
			} else if (format === 'png') {
				processedImage = processedImage.png({ compressionLevel: 9 });
			}

			// Generate unique filename
			const filename = `${nanoid()}.${format}`;
			const relativePath = `${UPLOAD_DIR}/${filename}`;
			const absolutePath = path.join(process.cwd(), relativePath);

			// Ensure upload directory exists
			const uploadDir = path.dirname(absolutePath);
			if (!existsSync(uploadDir)) {
				await mkdir(uploadDir, { recursive: true });
			}

			// Write optimized image
			const optimizedBuffer = await processedImage.toBuffer();
			await writeFile(absolutePath, optimizedBuffer);

			return {
				success: true,
				url: `/uploads/events/${filename}`,
				optimizedSize: optimizedBuffer.length,
				originalSize
			};
		} catch (error) {
			console.error('Image upload error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown image processing error'
			};
		}
	}

	/**
	 * Resize image to specific dimensions
	 */
	static async resizeImage(
		fileBuffer: Buffer,
		width: number,
		height: number
	): Promise<Buffer | null> {
		try {
			const resized = await sharp(fileBuffer)
				.resize(width, height, {
					fit: 'cover',
					position: 'center'
				})
				.toBuffer();

			return resized;
		} catch (error) {
			console.error('Image resize error:', error);
			return null;
		}
	}

	/**
	 * Create thumbnail from image
	 */
	static async createThumbnail(fileBuffer: Buffer, size = 200): Promise<Buffer | null> {
		try {
			const thumbnail = await sharp(fileBuffer)
				.resize(size, size, {
					fit: 'cover',
					position: 'center'
				})
				.webp({ quality: 80 })
				.toBuffer();

			return thumbnail;
		} catch (error) {
			console.error('Thumbnail creation error:', error);
			return null;
		}
	}

	/**
	 * Optimize existing image file
	 */
	static async optimizeImage(
		fileBuffer: Buffer,
		options: ImageUploadOptions = {}
	): Promise<Buffer | null> {
		try {
			const quality = options.quality || 85;
			const format = options.format || 'webp';

			let optimized = sharp(fileBuffer);

			if (format === 'webp') {
				optimized = optimized.webp({ quality });
			} else if (format === 'jpeg') {
				optimized = optimized.jpeg({ quality, progressive: true });
			} else if (format === 'png') {
				optimized = optimized.png({ compressionLevel: 9 });
			}

			return await optimized.toBuffer();
		} catch (error) {
			console.error('Image optimization error:', error);
			return null;
		}
	}

	/**
	 * Get image metadata
	 */
	static async getImageMetadata(fileBuffer: Buffer): Promise<sharp.Metadata | null> {
		try {
			const metadata = await sharp(fileBuffer).metadata();
			return metadata;
		} catch (error) {
			console.error('Error getting image metadata:', error);
			return null;
		}
	}

	/**
	 * Delete event image (cleanup)
	 */
	static async deleteEventImage(imageUrl: string): Promise<boolean> {
		try {
			const { unlink } = await import('fs/promises');
			const filename = path.basename(imageUrl);
			const absolutePath = path.join(process.cwd(), UPLOAD_DIR, filename);

			// Check if file exists before deletion
			if (existsSync(absolutePath)) {
				await unlink(absolutePath);
			}

			// Also delete thumbnail if exists
			const thumbnailFilename = `thumb_${filename}`;
			const thumbnailPath = path.join(process.cwd(), UPLOAD_DIR, thumbnailFilename);
			if (existsSync(thumbnailPath)) {
				await unlink(thumbnailPath);
			}

			return true;
		} catch (error) {
			console.error('Error deleting image:', error);
			return false;
		}
	}
}
