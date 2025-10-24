// Server-side file encryption utilities (Feature 024)
// Uses Node.js crypto module for AES-256-GCM encryption
// This runs only on the server - never exposed to the client

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits (recommended for GCM)
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Generate a random encryption key for AES-256
 * @returns Buffer containing 256-bit encryption key
 */
export function generateEncryptionKey(): Buffer {
	return randomBytes(KEY_LENGTH);
}

/**
 * Generate a random initialization vector (IV) for AES-GCM
 * @returns Buffer containing 96-bit IV
 */
export function generateIV(): Buffer {
	return randomBytes(IV_LENGTH);
}

/**
 * Encrypt file data using AES-256-GCM
 *
 * @param data - File data to encrypt (Buffer from file upload)
 * @param key - 256-bit encryption key
 * @returns Object containing encrypted data, IV, and auth tag
 *
 * @example
 * ```typescript
 * const key = generateEncryptionKey();
 * const fileBuffer = Buffer.from(await file.arrayBuffer());
 * const { encrypted, iv, authTag } = encryptFile(fileBuffer, key);
 * ```
 */
export function encryptFile(data: Buffer, key: Buffer): {
	encrypted: Buffer;
	iv: Buffer;
	authTag: Buffer;
} {
	// Validate inputs
	if (!Buffer.isBuffer(data)) {
		throw new Error('Data must be a Buffer');
	}
	if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
		throw new Error(`Key must be a ${KEY_LENGTH}-byte Buffer`);
	}

	// Generate random IV for this encryption
	const iv = generateIV();

	// Create cipher
	const cipher = createCipheriv(ALGORITHM, key, iv, {
		authTagLength: AUTH_TAG_LENGTH
	});

	// Encrypt data
	const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

	// Get authentication tag (GCM mode)
	const authTag = cipher.getAuthTag();

	return { encrypted, iv, authTag };
}

/**
 * Decrypt file data using AES-256-GCM
 *
 * @param encrypted - Encrypted file data
 * @param key - 256-bit encryption key
 * @param iv - Initialization vector used during encryption
 * @param authTag - Authentication tag for GCM verification
 * @returns Decrypted file data as Buffer
 *
 * @throws Error if authentication fails (tampered data)
 *
 * @example
 * ```typescript
 * const decrypted = decryptFile(encryptedData, key, iv, authTag);
 * ```
 */
export function decryptFile(
	encrypted: Buffer,
	key: Buffer,
	iv: Buffer,
	authTag: Buffer
): Buffer {
	// Validate inputs
	if (!Buffer.isBuffer(encrypted)) {
		throw new Error('Encrypted data must be a Buffer');
	}
	if (!Buffer.isBuffer(key) || key.length !== KEY_LENGTH) {
		throw new Error(`Key must be a ${KEY_LENGTH}-byte Buffer`);
	}
	if (!Buffer.isBuffer(iv) || iv.length !== IV_LENGTH) {
		throw new Error(`IV must be a ${IV_LENGTH}-byte Buffer`);
	}
	if (!Buffer.isBuffer(authTag) || authTag.length !== AUTH_TAG_LENGTH) {
		throw new Error(`Auth tag must be a ${AUTH_TAG_LENGTH}-byte Buffer`);
	}

	// Create decipher
	const decipher = createDecipheriv(ALGORITHM, key, iv, {
		authTagLength: AUTH_TAG_LENGTH
	});

	// Set authentication tag
	decipher.setAuthTag(authTag);

	try {
		// Decrypt data
		const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
		return decrypted;
	} catch (error) {
		// Authentication failure or corrupted data
		throw new Error('Decryption failed: Invalid key, IV, or tampered data');
	}
}

/**
 * Encode encryption key to base64 for storage
 * @param key - Encryption key buffer
 * @returns Base64-encoded key string
 */
export function encodeKey(key: Buffer): string {
	return key.toString('base64');
}

/**
 * Decode encryption key from base64 storage format
 * @param encodedKey - Base64-encoded key string
 * @returns Encryption key buffer
 */
export function decodeKey(encodedKey: string): Buffer {
	return Buffer.from(encodedKey, 'base64');
}

/**
 * Combined encryption result with all components packaged together
 * This format is convenient for storage where IV and auth tag are kept with encrypted data
 */
export interface EncryptionResult {
	/** Encrypted file data */
	encryptedData: Buffer;
	/** Initialization vector used for encryption */
	iv: Buffer;
	/** Authentication tag for GCM verification */
	authTag: Buffer;
	/** Encryption key (store separately in encrypted_keys table) */
	key: Buffer;
	/** Base64-encoded key for GraphQL transmission */
	keyBase64: string;
}

/**
 * High-level function to encrypt a file and return all necessary components
 * Generates a new key for each file (recommended practice)
 *
 * @param fileData - File data to encrypt
 * @returns Complete encryption result with key, IV, auth tag, and encrypted data
 *
 * @example
 * ```typescript
 * const file = await request.formData().get('file');
 * const buffer = Buffer.from(await file.arrayBuffer());
 * const result = encryptFileWithNewKey(buffer);
 *
 * // Store key in database (encrypted by pgcrypto)
 * await registerEncryptionKey(result.keyBase64);
 *
 * // Store encrypted file with IV and auth tag
 * await storeEncryptedFile(result.encryptedData, result.iv, result.authTag);
 * ```
 */
export function encryptFileWithNewKey(fileData: Buffer): EncryptionResult {
	// Generate new encryption key
	const key = generateEncryptionKey();

	// Encrypt file
	const { encrypted, iv, authTag } = encryptFile(fileData, key);

	return {
		encryptedData: encrypted,
		iv,
		authTag,
		key,
		keyBase64: encodeKey(key)
	};
}

/**
 * Package encrypted data with IV and auth tag for storage
 * Format: [IV (12 bytes)][Auth Tag (16 bytes)][Encrypted Data (variable)]
 *
 * This allows storing everything as a single blob while keeping components accessible
 *
 * @param encrypted - Encrypted data
 * @param iv - Initialization vector
 * @param authTag - Authentication tag
 * @returns Combined buffer ready for storage
 */
export function packageEncryptedData(encrypted: Buffer, iv: Buffer, authTag: Buffer): Buffer {
	return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Unpackage stored encrypted data into components
 * Reverses packageEncryptedData operation
 *
 * @param packagedData - Combined buffer from storage
 * @returns Object with separated IV, auth tag, and encrypted data
 */
export function unpackageEncryptedData(packagedData: Buffer): {
	iv: Buffer;
	authTag: Buffer;
	encrypted: Buffer;
} {
	if (packagedData.length < IV_LENGTH + AUTH_TAG_LENGTH) {
		throw new Error('Invalid packaged data: too small');
	}

	const iv = packagedData.subarray(0, IV_LENGTH);
	const authTag = packagedData.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
	const encrypted = packagedData.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

	return { iv, authTag, encrypted };
}
