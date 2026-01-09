// Unit test: Encryption service (T052)
// Tests Web Crypto API wrapper functions

import { describe, expect, it } from 'vitest';
import {
	decryptFile,
	encryptFile,
	encryptFileChunked,
	generateEncryptionKey
} from '$lib/services/encryption';

/**
 * Unit Test: Encryption Service
 *
 * Tests the Web Crypto API wrapper for client-side encryption.
 * Validates:
 * - Key generation
 * - File encryption/decryption
 * - IV randomness
 * - Large file handling with progress callbacks
 * - AES-GCM-256 algorithm correctness
 */

describe('Encryption Service - Unit Tests', () => {
	describe('generateEncryptionKey()', () => {
		it('should return a valid CryptoKey', async () => {
			// Act
			const key = await generateEncryptionKey();

			// Assert
			expect(key).toBeDefined();
			expect(key.type).toBe('secret');
			expect(key.algorithm.name).toBe('AES-GCM');
			expect((key.algorithm as AesKeyAlgorithm).length).toBe(256);
			expect(key.extractable).toBe(true);
			expect(key.usages).toContain('encrypt');
			expect(key.usages).toContain('decrypt');
		});

		it('should generate different keys on each call', async () => {
			// Act
			const key1 = await generateEncryptionKey();
			const key2 = await generateEncryptionKey();

			// Export both keys to compare
			const key1Data = await crypto.subtle.exportKey('raw', key1);
			const key2Data = await crypto.subtle.exportKey('raw', key2);

			// Assert: Keys should be different
			expect(new Uint8Array(key1Data)).not.toEqual(new Uint8Array(key2Data));
		});
	});

	describe('encryptFile()', () => {
		it('should encrypt a file successfully', async () => {
			// Arrange
			const fileContent = 'This is a test file content';
			const blob = new Blob([fileContent], { type: 'text/plain' });
			const file = new File([blob], 'test.txt', { type: 'text/plain' });
			const key = await generateEncryptionKey();

			// Act
			const result = await encryptFile(file, key);

			// Assert
			expect(result).toHaveProperty('encryptedData');
			expect(result).toHaveProperty('iv');
			expect(result).toHaveProperty('keyIdentifier');

			expect(result.encryptedData).toBeInstanceOf(ArrayBuffer);
			expect(result.iv).toBeInstanceOf(Uint8Array);
			expect(result.iv.length).toBe(12); // 96-bit IV for AES-GCM

			// Encrypted data should be different from original
			const encryptedBytes = new Uint8Array(result.encryptedData);
			const originalBytes = new TextEncoder().encode(fileContent);
			expect(encryptedBytes).not.toEqual(originalBytes);
		});

		it('should produce different ciphertext for same input (IV randomness)', async () => {
			// Arrange
			const fileContent = 'Identical file content';
			const createFile = () => {
				const blob = new Blob([fileContent], { type: 'text/plain' });
				return new File([blob], 'test.txt', { type: 'text/plain' });
			};

			const key = await generateEncryptionKey();

			// Act: Encrypt same content twice
			const result1 = await encryptFile(createFile(), key);
			const result2 = await encryptFile(createFile(), key);

			// Assert: IVs should be different
			expect(result1.iv).not.toEqual(result2.iv);

			// Assert: Ciphertext should be different (due to different IVs)
			const ciphertext1 = new Uint8Array(result1.encryptedData);
			const ciphertext2 = new Uint8Array(result2.encryptedData);
			expect(ciphertext1).not.toEqual(ciphertext2);
		});

		it('should handle binary files', async () => {
			// Arrange: Create a binary file (simulated image)
			const binaryData = new Uint8Array(1024);
			for (let i = 0; i < binaryData.length; i++) {
				binaryData[i] = i % 256;
			}
			const blob = new Blob([binaryData], { type: 'image/png' });
			const file = new File([blob], 'image.png', { type: 'image/png' });
			const key = await generateEncryptionKey();

			// Act
			const result = await encryptFile(file, key);

			// Assert
			expect(result.encryptedData).toBeInstanceOf(ArrayBuffer);
			expect(result.encryptedData.byteLength).toBeGreaterThan(0);
		});
	});

	describe('decryptFile()', () => {
		it('should decrypt file and recover original content', async () => {
			// Arrange: Encrypt a file first
			const originalContent = 'Original file content for decryption test';
			const blob = new Blob([originalContent], { type: 'text/plain' });
			const file = new File([blob], 'test.txt', { type: 'text/plain' });
			const key = await generateEncryptionKey();

			const encrypted = await encryptFile(file, key);

			// Act: Decrypt the encrypted data
			const decryptedBlob = await decryptFile(encrypted.encryptedData, key, encrypted.iv);

			// Assert: Decrypted content matches original
			const decryptedText = await decryptedBlob.decryptedData.text();
			expect(decryptedText).toBe(originalContent);
		});

		it('should fail with wrong key', async () => {
			// Arrange: Encrypt with one key, decrypt with another
			const fileContent = 'Secret content';
			const blob = new Blob([fileContent], { type: 'text/plain' });
			const file = new File([blob], 'test.txt', { type: 'text/plain' });

			const correctKey = await generateEncryptionKey();
			const wrongKey = await generateEncryptionKey();

			const encrypted = await encryptFile(file, correctKey);

			// Act & Assert: Decryption with wrong key should fail
			await expect(decryptFile(encrypted.encryptedData, wrongKey, encrypted.iv)).rejects.toThrow();
		});

		it('should fail with wrong IV', async () => {
			// Arrange
			const fileContent = 'Test content';
			const blob = new Blob([fileContent], { type: 'text/plain' });
			const file = new File([blob], 'test.txt', { type: 'text/plain' });
			const key = await generateEncryptionKey();

			const encrypted = await encryptFile(file, key);

			// Create wrong IV
			const wrongIv = crypto.getRandomValues(new Uint8Array(12));

			// Act & Assert: Decryption with wrong IV should fail
			await expect(decryptFile(encrypted.encryptedData, key, wrongIv)).rejects.toThrow();
		});

		it('should handle binary files correctly', async () => {
			// Arrange: Binary data
			const binaryData = new Uint8Array(2048);
			for (let i = 0; i < binaryData.length; i++) {
				binaryData[i] = (i * 7) % 256; // Pattern
			}
			const blob = new Blob([binaryData], { type: 'application/octet-stream' });
			const file = new File([blob], 'binary.dat', { type: 'application/octet-stream' });
			const key = await generateEncryptionKey();

			const encrypted = await encryptFile(file, key);

			// Act
			const decryptedBlob = await decryptFile(encrypted.encryptedData, key, encrypted.iv);

			// Assert: Binary content matches
			const decryptedData = new Uint8Array(await decryptedBlob.decryptedData.arrayBuffer());
			expect(decryptedData).toEqual(binaryData);
		});
	});

	describe('encryptFileChunked() - Large files', () => {
		it('should encrypt 50MB file with progress callbacks', async () => {
			// Arrange: Create a 50MB file
			const fileSizeMB = 50;
			const fileSize = fileSizeMB * 1024 * 1024;
			const largeData = new Uint8Array(fileSize);

			// Fill with pattern (not random to be deterministic)
			for (let i = 0; i < largeData.length; i += 1024) {
				largeData[i] = (i / 1024) % 256;
			}

			const blob = new Blob([largeData], { type: 'application/octet-stream' });
			const file = new File([blob], 'large.dat', { type: 'application/octet-stream' });
			const key = await generateEncryptionKey();

			// Track progress callbacks
			const progressUpdates: number[] = [];
			const onProgress = (progress: any) => {
				progressUpdates.push(progress.progress);
			};

			// Act
			const result = await encryptFileChunked(file, key, 5 * 1024 * 1024, onProgress);

			// Assert: Encryption succeeded
			expect(result).toHaveProperty('encryptedData');
			expect(result).toHaveProperty('iv');
			expect(result.encryptedData).toBeInstanceOf(ArrayBuffer);

			// Assert: Progress callbacks were called
			expect(progressUpdates.length).toBeGreaterThan(0);
			expect(progressUpdates[progressUpdates.length - 1]).toBe(100); // Final progress is 100%

			// Assert: Progress increases monotonically
			for (let i = 1; i < progressUpdates.length; i++) {
				expect(progressUpdates[i]).toBeGreaterThanOrEqual(progressUpdates[i - 1]);
			}
		});

		it('should handle progress callback errors gracefully', async () => {
			// Arrange
			const fileSize = 10 * 1024 * 1024; // 10MB
			const data = new Uint8Array(fileSize);
			const blob = new Blob([data], { type: 'application/octet-stream' });
			const file = new File([blob], 'test.dat', { type: 'application/octet-stream' });
			const key = await generateEncryptionKey();

			// Callback that throws error
			const errorCallback = () => {
				throw new Error('Progress callback error');
			};

			// Act & Assert: Should not fail due to callback error
			await expect(
				encryptFileChunked(file, key, 5 * 1024 * 1024, errorCallback)
			).resolves.toBeDefined();
		});

		it('should decrypt large encrypted file correctly', async () => {
			// Arrange: Encrypt large file
			const fileSize = 10 * 1024 * 1024; // 10MB
			const originalData = new Uint8Array(fileSize);

			// Pattern for verification
			for (let i = 0; i < originalData.length; i += 1000) {
				originalData[i] = (i / 1000) % 256;
			}

			const blob = new Blob([originalData], { type: 'application/octet-stream' });
			const file = new File([blob], 'large.dat', { type: 'application/octet-stream' });
			const key = await generateEncryptionKey();

			const encrypted = await encryptFileChunked(file, key);

			// Act: Decrypt
			const decryptedBlob = await decryptFile(encrypted.encryptedData, key, encrypted.iv);

			// Assert: Content matches
			const decryptedData = new Uint8Array(await decryptedBlob.decryptedData.arrayBuffer());
			expect(decryptedData.length).toBe(originalData.length);

			// Verify pattern (sample check to avoid full comparison)
			for (let i = 0; i < originalData.length; i += 10000) {
				expect(decryptedData[i]).toBe(originalData[i]);
			}
		});
	});

	describe('Performance characteristics', () => {
		it('should encrypt 1MB file in reasonable time (<1s)', async () => {
			// Arrange
			const fileSize = 1 * 1024 * 1024;
			const data = new Uint8Array(fileSize);
			const blob = new Blob([data], { type: 'application/octet-stream' });
			const file = new File([blob], 'test.dat', { type: 'application/octet-stream' });
			const key = await generateEncryptionKey();

			// Act
			const startTime = performance.now();
			await encryptFile(file, key);
			const duration = performance.now() - startTime;

			// Assert: Should complete within 1 second
			expect(duration).toBeLessThan(1000);
		});
	});
});
