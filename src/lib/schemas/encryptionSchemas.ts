// Zod validation schemas for encryption key management (Feature 024)
import { z } from 'zod';

// Encryption key algorithm schema
export const keyAlgorithmSchema = z.enum(['AES-GCM-256', 'AES-CBC-256']);

// Encryption key registration schema
export const encryptionKeySchema = z.object({
	keyIdentifier: z.string().min(1).max(255),
	encryptedKeyData: z.string().base64(), // Base64-encoded encrypted key
	keyAlgorithm: keyAlgorithmSchema.default('AES-GCM-256')
});

// Encryption key retrieval schema (response)
export const keyRetrievalSchema = z.object({
	keyId: z.string().uuid(),
	encryptedKeyData: z.string().base64(),
	keyAlgorithm: keyAlgorithmSchema,
	createdAt: z.date()
});

// Key rotation schema
export const keyRotationSchema = z.object({
	oldKeyId: z.string().uuid(),
	newKeyIdentifier: z.string().min(1).max(255),
	newEncryptedKeyData: z.string().base64(),
	newKeyAlgorithm: keyAlgorithmSchema.default('AES-GCM-256')
});

// Web Crypto API key format validation
export const cryptoKeySchema = z.object({
	type: z.enum(['secret', 'public', 'private']),
	extractable: z.boolean(),
	algorithm: z.object({
		name: z.string(),
		length: z.number().optional()
	}),
	usages: z.array(z.enum(['encrypt', 'decrypt', 'sign', 'verify', 'wrapKey', 'unwrapKey']))
});

// Client-side encryption metadata
export const clientEncryptionMetadataSchema = z.object({
	keyIdentifier: z.string(),
	algorithm: z.literal('AES-GCM'),
	ivLength: z.number().default(12), // 96 bits for AES-GCM
	tagLength: z.number().default(128), // 128 bits for authentication tag
	keyLength: z.number().default(256) // 256-bit key
});

// Encrypted file metadata
export const encryptedFileMetadataSchema = z.object({
	encryptedData: z.instanceof(ArrayBuffer),
	iv: z.instanceof(Uint8Array),
	keyIdentifier: z.string(),
	algorithm: z.literal('AES-GCM-256'),
	originalFilename: z.string(),
	originalFileSize: z.number().int().positive()
});

// Decryption request schema
export const decryptionRequestSchema = z.object({
	documentId: z.string().uuid(),
	encryptedData: z.instanceof(ArrayBuffer),
	keyId: z.string().uuid()
});

// Key derivation parameters (for PBKDF2 if needed)
export const keyDerivationSchema = z.object({
	algorithm: z.literal('PBKDF2'),
	salt: z.instanceof(Uint8Array),
	iterations: z.number().int().min(100000).default(600000), // OWASP recommendation
	hashAlgorithm: z.enum(['SHA-256', 'SHA-384', 'SHA-512']).default('SHA-256')
});

// Validation helpers for Web Crypto API
export function isValidAESKey(key: CryptoKey): boolean {
	return (
		key.type === 'secret' &&
		key.algorithm.name === 'AES-GCM' &&
		'length' in key.algorithm &&
		key.algorithm.length === 256 &&
		key.usages.includes('encrypt') &&
		key.usages.includes('decrypt')
	);
}

export function isValidIV(iv: Uint8Array): boolean {
	return iv.length === 12; // 96 bits for AES-GCM
}

// Base64 string validation helper
export function isValidBase64(str: string): boolean {
	try {
		const decoded = atob(str);
		const reencoded = btoa(decoded);
		return reencoded === str;
	} catch {
		return false;
	}
}

// Encryption key strength validation
export function validateKeyStrength(keyData: ArrayBuffer): {
	isValid: boolean;
	entropy: number;
	message?: string;
} {
	const bytes = new Uint8Array(keyData);

	// Check minimum key length (256 bits = 32 bytes)
	if (bytes.length < 32) {
		return {
			isValid: false,
			entropy: 0,
			message: 'Key must be at least 256 bits (32 bytes)'
		};
	}

	// Calculate Shannon entropy
	const frequency: Record<number, number> = {};
	for (const byte of bytes) {
		frequency[byte] = (frequency[byte] || 0) + 1;
	}

	let entropy = 0;
	for (const count of Object.values(frequency)) {
		const p = count / bytes.length;
		entropy -= p * Math.log2(p);
	}

	// Expect entropy > 7.5 for good randomness (max is 8 for perfect randomness)
	if (entropy < 7.5) {
		return {
			isValid: false,
			entropy,
			message: `Insufficient entropy (${entropy.toFixed(2)}/8). Key may not be sufficiently random.`
		};
	}

	return {
		isValid: true,
		entropy
	};
}

// Constant-time comparison for key identifiers (prevents timing attacks)
export function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}

// Type exports
export type EncryptionKeyData = z.infer<typeof encryptionKeySchema>;
export type KeyRetrievalData = z.infer<typeof keyRetrievalSchema>;
export type KeyRotationData = z.infer<typeof keyRotationSchema>;
export type ClientEncryptionMetadata = z.infer<typeof clientEncryptionMetadataSchema>;
export type EncryptedFileMetadata = z.infer<typeof encryptedFileMetadataSchema>;
export type DecryptionRequest = z.infer<typeof decryptionRequestSchema>;
export type KeyDerivationParams = z.infer<typeof keyDerivationSchema>;
