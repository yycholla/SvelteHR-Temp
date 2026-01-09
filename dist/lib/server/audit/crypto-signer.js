// Cryptographic Signing for Audit Logs (T028)
// Feature: 021-i-have-setup (Comprehensive Audit Logging)
// Implements ECDSA (ES256) signing and verification for tamper detection
// FR-006: Cryptographic signatures for audit logs
// FR-022: Signature verification for tamper detection
import { createSign, createVerify, createHash, generateKeyPairSync } from 'crypto';
/**
 * Generate ECDSA key pair using P-256 curve (prime256v1)
 * Algorithm: ES256 (ECDSA with SHA-256)
 * Performance: 3-5x faster than RSA for signing/verification
 *
 * @returns KeyPair with privateKey and publicKey as KeyObjects
 */
export function generateKeyPair() {
	const { privateKey, publicKey } = generateKeyPairSync('ec', {
		namedCurve: 'prime256v1' // P-256 curve for ES256
		// Don't specify encoding - returns KeyObject instead of string
	});
	return { privateKey, publicKey };
}
/**
 * Create canonical JSON representation for deterministic signing
 * Sorts all keys recursively to ensure consistent serialization
 *
 * @param obj - Object to canonicalize
 * @returns Canonical JSON string
 */
function canonicalizeJSON(obj) {
	if (obj === null || obj === undefined) {
		return JSON.stringify(obj);
	}
	if (typeof obj !== 'object') {
		return JSON.stringify(obj);
	}
	if (Array.isArray(obj)) {
		return '[' + obj.map(canonicalizeJSON).join(',') + ']';
	}
	// Sort object keys and recursively canonicalize
	const sortedKeys = Object.keys(obj).sort();
	const pairs = sortedKeys.map((key) => {
		return JSON.stringify(key) + ':' + canonicalizeJSON(obj[key]);
	});
	return '{' + pairs.join(',') + '}';
}
/**
 * Sign audit log entry with private key
 * Creates deterministic hash of log entry and signs it with ECDSA
 *
 * @param logEntry - Audit log entry object (any structure)
 * @param privateKey - ECDSA private key
 * @returns Base64-encoded signature string
 */
export function signAuditLog(logEntry, privateKey) {
	// Create canonical JSON representation for deterministic signing
	const canonicalData = canonicalizeJSON(logEntry);
	// Create signature using SHA-256 hash
	const sign = createSign('SHA256');
	sign.update(canonicalData);
	sign.end();
	// Sign and return Base64-encoded signature
	return sign.sign(privateKey, 'base64');
}
/**
 * Verify audit log signature
 * Checks if the signature matches the log entry using public key
 *
 * @param logEntry - Audit log entry object to verify
 * @param signature - Base64-encoded signature string
 * @param publicKey - ECDSA public key
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(logEntry, signature, publicKey) {
	try {
		// Create canonical JSON representation (must match signing process)
		const canonicalData = canonicalizeJSON(logEntry);
		// Create verification context
		const verify = createVerify('SHA256');
		verify.update(canonicalData);
		verify.end();
		// Verify signature
		return verify.verify(publicKey, signature, 'base64');
	} catch (error) {
		// Invalid signature format or verification error
		return false;
	}
}
/**
 * Export public key to PEM format string
 * Useful for storing public keys in database
 *
 * @param publicKey - KeyObject to export
 * @returns PEM-formatted public key string
 */
export function exportPublicKey(publicKey) {
	return publicKey.export({ type: 'spki', format: 'pem' }).toString();
}
/**
 * Export private key to PEM format string
 * WARNING: Store private keys securely (environment variables, key vault)
 *
 * @param privateKey - KeyObject to export
 * @returns PEM-formatted private key string
 */
export function exportPrivateKey(privateKey) {
	return privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
}
/**
 * Load public key from PEM string
 *
 * @param pemString - PEM-formatted public key
 * @returns KeyObject for verification
 */
export function loadPublicKey(pemString) {
	return createVerify('SHA256').constructor.prototype.constructor.createPublicKey(pemString);
}
/**
 * Load private key from PEM string
 *
 * @param pemString - PEM-formatted private key
 * @returns KeyObject for signing
 */
export function loadPrivateKey(pemString) {
	return createSign('SHA256').constructor.prototype.constructor.createPrivateKey(pemString);
}
/**
 * Generate public key ID for tracking key rotation
 * Uses first 8 characters of SHA-256 hash of public key
 *
 * @param publicKey - Public key to generate ID for
 * @returns Short key identifier string
 */
export function generatePublicKeyId(publicKey) {
	const pemKey = exportPublicKey(publicKey);
	const hash = createHash('sha256');
	hash.update(pemKey);
	return hash.digest('hex').substring(0, 16); // First 16 chars for uniqueness
}
// Export all utilities
export default {
	generateKeyPair,
	signAuditLog,
	verifySignature,
	exportPublicKey,
	exportPrivateKey,
	loadPublicKey,
	loadPrivateKey,
	generatePublicKeyId
};
