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
export function encryptFile(
	data: Buffer,
	key: Buffer
): {
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
export function decryptFile(encrypted: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
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
	// Package as [Encrypted][AuthTag] since Rust backend will prepend IV
	// Final format in DB will be: [IV (prepended by Rust)][Encrypted][AuthTag]
	// This matches standard AES-GCM format where auth tag is at the end
	return Buffer.concat([encrypted, authTag]);
}

/**
 * Unpackage stored encrypted data into components
 * Reverses packageEncryptedData operation
 *
 * Expected format from DB: [IV (prepended by Rust)][Encrypted][AuthTag (16 bytes)]
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

	// Format: [IV (12)][Encrypted][AuthTag (16)]
	const iv = packagedData.subarray(0, IV_LENGTH);
	const authTag = packagedData.subarray(packagedData.length - AUTH_TAG_LENGTH); // Last 16 bytes
	const encrypted = packagedData.subarray(IV_LENGTH, packagedData.length - AUTH_TAG_LENGTH); // Between IV and auth tag

	return { iv, authTag, encrypted };
}

/**
 * Retrieve and decrypt file from database
 *
 * @param client - PostgreSQL client for database queries
 * @param documentId - UUID of document to retrieve
 * @returns Decrypted file data as Buffer
 *
 * @example
 * ```typescript
 * import { retrieveAndDecryptFile } from '$lib/server/encryption';
 *
 * const decryptedFile = await retrieveAndDecryptFile(client, documentId);
 * ```
 */
export async function retrieveAndDecryptFile(client: any, documentId: string): Promise<Buffer> {
	// Step 1: Get encrypted file data and encryption key ID
	const fileResult = await client.query(
		`SELECT encrypted_data, iv, encryption_key_id
		 FROM hr_public.encrypted_file_storage
		 WHERE document_id = $1`,
		[documentId]
	);

	if (fileResult.rows.length === 0) {
		throw new Error('Encrypted file not found in storage');
	}

	const { encrypted_data, iv, encryption_key_id } = fileResult.rows[0];

	// Step 2: Decrypt the encryption key using hr_public.decrypt_key_data function
	// This function uses: key_name || '_SERVER_SECRET_KEY_PLACEHOLDER' as the encryption password
	const keyResult = await client.query(
		`SELECT hr_public.decrypt_key_data(encrypted_key, key_name) as decrypted_key
		 FROM hr_public.encryption_keys
		 WHERE id = $1 AND is_active = true`,
		[encryption_key_id]
	);

	if (keyResult.rows.length === 0) {
		throw new Error('Encryption key not found or inactive');
	}

	const decryptedKeyBuffer = Buffer.from(keyResult.rows[0].decrypted_key);
	const ivBuffer = Buffer.from(iv);
	const encryptedDataBuffer = Buffer.from(encrypted_data);

	// Step 3: Unpackage encrypted data
	// IMPORTANT: Rust backend prepends IV before storing, so encrypted_data format is:
	// [IV_prepended (12)][IV_original (12)][Auth Tag (16)][Encrypted Data]
	// We need to skip the prepended IV and unpackage the rest

	if (encryptedDataBuffer.length < IV_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH) {
		throw new Error('Encrypted data is too small');
	}

	// Skip the prepended IV (first 12 bytes)
	const packagedData = encryptedDataBuffer.subarray(IV_LENGTH);

	// Unpackage: [IV_original (12)][Auth Tag (16)][Encrypted Data]
	const {
		iv: packagedIv,
		authTag,
		encrypted: actualEncrypted
	} = unpackageEncryptedData(packagedData);

	// Step 4: Decrypt the file using AES-256-GCM
	// Use IV from database column (not from package, though they should match)
	const decrypted = decryptFile(actualEncrypted, decryptedKeyBuffer, ivBuffer, authTag);

	return decrypted;
}

/**
 * Decrypt file data from GraphQL response
 * Handles base64 decoding and unpacking the encryption format used by Rust backend
 *
 * @param encryptedDataBase64 - Base64-encoded encrypted data from GraphQL
 * @param ivBase64 - Base64-encoded IV from GraphQL
 * @param encryptionKey - Decrypted encryption key buffer
 * @returns Decrypted file data as Buffer
 *
 * @example
 * ```typescript
 * import { decryptFileFromGraphQL } from '$lib/server/encryption';
 *
 * // Get encrypted data from GraphQL
 * const document = result.data.document;
 * const storage = document.encryptedFileStorage;
 *
 * // Decrypt using key from database
 * const decrypted = decryptFileFromGraphQL(
 *   storage.encryptedData,
 *   storage.iv,
 *   encryptionKeyBuffer
 * );
 * ```
 */
export function decryptFileFromGraphQL(
	encryptedDataBase64: string,
	ivBase64: string,
	encryptionKey: Buffer
): Buffer {
	// Decode base64 data from GraphQL
	const ivBuffer = Buffer.from(ivBase64, 'base64');
	const encryptedDataBuffer = Buffer.from(encryptedDataBase64, 'base64');

	// IMPORTANT: Rust backend prepends IV before storing, so encrypted_data format is:
	// [IV (12 bytes)][Ciphertext][Auth Tag (16 bytes)]
	// The IV is also stored separately in the iv column
	// In AES-GCM, the auth tag is always at the END of the ciphertext

	if (encryptedDataBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
		throw new Error('Encrypted data is too small');
	}

	// Skip the prepended IV (first 12 bytes)
	const dataAfterIv = encryptedDataBuffer.subarray(IV_LENGTH);

	// In AES-GCM, auth tag is at the END: [Ciphertext][Auth Tag (16)]
	const authTag = dataAfterIv.subarray(dataAfterIv.length - AUTH_TAG_LENGTH);
	const encrypted = dataAfterIv.subarray(0, dataAfterIv.length - AUTH_TAG_LENGTH);

	// Decrypt file using AES-256-GCM
	return decryptFile(encrypted, encryptionKey, ivBuffer, authTag);
}

/**
 * Retrieve decryption key from database
 * Uses hr_public.decrypt_key_data function to decrypt the stored encryption key
 *
 * @param client - PostgreSQL client (from transaction or pool)
 * @param encryptionKeyId - UUID of encryption key to retrieve
 * @returns Decrypted encryption key as Buffer
 *
 * @example
 * ```typescript
 * import { getDecryptionKey } from '$lib/server/encryption';
 *
 * const keyBuffer = await getDecryptionKey(client, keyId);
 * ```
 */
export async function getDecryptionKey(client: any, encryptionKeyId: string): Promise<Buffer> {
	const keyResult = await client.query(
		`SELECT hr_public.decrypt_key_data(encrypted_key, key_name) as decrypted_key
		 FROM hr_public.encryption_keys
		 WHERE id = $1 AND is_active = true`,
		[encryptionKeyId]
	);

	if (keyResult.rows.length === 0) {
		throw new Error('Encryption key not found or inactive');
	}

	const decryptedKey = keyResult.rows[0].decrypted_key;

	// The decrypt_key_data function returns bytea, which pg driver gives us as Buffer
	if (Buffer.isBuffer(decryptedKey)) {
		return decryptedKey;
	}

	// If it's a hex string, convert accordingly
	if (typeof decryptedKey === 'string') {
		// Try to detect if it's hex (bytea is often returned as \x... format)
		if (decryptedKey.startsWith('\\x')) {
			const hexString = decryptedKey.slice(2); // Remove \x prefix
			return Buffer.from(hexString, 'hex');
		}
		// Otherwise assume it's already hex or base64
		return Buffer.from(decryptedKey, 'hex');
	}

	return Buffer.from(decryptedKey);
}
