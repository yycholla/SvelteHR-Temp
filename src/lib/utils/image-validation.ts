/**
 * Image Validation Utilities
 * Feature: 027-we-need-to
 *
 * Validates event images for:
 * - File size (10MB limit)
 * - File type (JPEG, PNG, WebP only)
 * - Aspect ratio (16:9 or 9:16)
 */

/**
 * Validates an image file against all requirements
 * @param file - The image file to validate
 * @param expectedAspectRatio - Expected aspect ratio ('16:9' or '9:16')
 * @returns Validation result with errors array
 */
export async function validateImageFile(
	file: File,
	expectedAspectRatio: '16:9' | '9:16'
): Promise<{ valid: boolean; errors: string[] }> {
	const errors: string[] = [];

	// Validate file size
	const sizeValidation = validateImageSize(file);
	if (!sizeValidation.valid && sizeValidation.error) {
		errors.push(sizeValidation.error);
	}

	// Validate file type
	const typeValidation = validateImageType(file);
	if (!typeValidation.valid && typeValidation.error) {
		errors.push(typeValidation.error);
	}

	// If basic validations fail, don't proceed to aspect ratio check
	if (errors.length > 0) {
		return { valid: false, errors };
	}

	// Load image to check dimensions
	try {
		const img = await loadImage(file);
		const aspectRatioValidation = await validateAspectRatio(img, expectedAspectRatio);

		if (!aspectRatioValidation.valid && aspectRatioValidation.error) {
			errors.push(aspectRatioValidation.error);
		}
	} catch (error) {
		errors.push('Failed to load image for validation');
	}

	return {
		valid: errors.length === 0,
		errors
	};
}

/**
 * Validates file size does not exceed 10MB
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImageSize(file: File): { valid: boolean; error: string | null } {
	const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

	if (file.size > MAX_SIZE_BYTES) {
		return {
			valid: false,
			error: 'File size exceeds 10MB limit'
		};
	}

	return { valid: true, error: null };
}

/**
 * Validates file type is JPEG, PNG, or WebP
 * @param file - File to validate
 * @returns Validation result
 */
export function validateImageType(file: File): { valid: boolean; error: string | null } {
	const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

	if (!ALLOWED_TYPES.includes(file.type)) {
		return {
			valid: false,
			error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
		};
	}

	return { valid: true, error: null };
}

/**
 * Calculates aspect ratio from image dimensions
 * Returns '16:9', '9:16', or 'unknown'
 * Includes tolerance for slight variations
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Aspect ratio string
 */
export function calculateAspectRatio(width: number, height: number): '16:9' | '9:16' | 'unknown' {
	const ratio = width / height;
	const TOLERANCE = 0.05; // 5% tolerance

	const ratio16_9 = 16 / 9; // ~1.778
	const ratio9_16 = 9 / 16; // ~0.5625

	if (Math.abs(ratio - ratio16_9) <= TOLERANCE) {
		return '16:9';
	}

	if (Math.abs(ratio - ratio9_16) <= TOLERANCE) {
		return '9:16';
	}

	return 'unknown';
}

/**
 * Validates image aspect ratio matches expected ratio
 * @param img - Loaded HTMLImageElement
 * @param expectedRatio - Expected aspect ratio
 * @returns Validation result
 */
export async function validateAspectRatio(
	img: HTMLImageElement,
	expectedRatio: '16:9' | '9:16'
): Promise<{ valid: boolean; error: string | null }> {
	const actualRatio = calculateAspectRatio(img.width, img.height);

	if (actualRatio === 'unknown') {
		return {
			valid: false,
			error: 'Unsupported aspect ratio. Only 16:9 and 9:16 are allowed.'
		};
	}

	if (actualRatio !== expectedRatio) {
		return {
			valid: false,
			error: `Image aspect ratio is ${actualRatio}, but ${expectedRatio} was expected.`
		};
	}

	return { valid: true, error: null };
}

/**
 * Checks if aspect ratio string is valid
 * @param ratio - Aspect ratio string to check
 * @returns true if valid, false otherwise
 */
export function isValidAspectRatio(ratio: string): ratio is '16:9' | '9:16' {
	return ratio === '16:9' || ratio === '9:16';
}

/**
 * Loads an image file into an HTMLImageElement
 * @param file - File to load
 * @returns Promise resolving to HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(file);

		img.onload = () => {
			URL.revokeObjectURL(url);
			resolve(img);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load image'));
		};

		img.src = url;
	});
}
