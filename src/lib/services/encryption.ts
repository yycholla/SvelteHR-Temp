// Client-side encryption service using Web Crypto API (Feature 024)
// Implements AES-GCM-256 encryption for secure document storage

export interface EncryptionResult {
	encryptedData: ArrayBuffer;
	iv: Uint8Array;
	keyIdentifier: string;
}

export interface DecryptionResult {
	decryptedData: Blob;
	originalFilename: string;
}

export interface EncryptionProgress {
	stage: 'preparing' | 'encrypting' | 'complete';
	progress: number; // 0-100
	bytesProcessed?: number;
	totalBytes?: number;
}

// Generate a new AES-GCM-256 encryption key
export async function generateEncryptionKey(): Promise<CryptoKey> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available (server-side or unsupported browser)');
	}

	return await window.crypto.subtle.generateKey(
		{
			name: 'AES-GCM',
			length: 256
		},
		true, // extractable
		['encrypt', 'decrypt']
	);
}

// Generate a unique key identifier
export function generateKeyIdentifier(): string {
	const timestamp = Date.now();
	const randomBytes = new Uint8Array(16);
	window.crypto.getRandomValues(randomBytes);
	const randomHex = Array.from(randomBytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return `key_${timestamp}_${randomHex}`;
}

// Encrypt a file with progress callback
export async function encryptFile(
	file: File,
	key: CryptoKey,
	onProgress?: (progress: EncryptionProgress) => void
): Promise<EncryptionResult> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}

	// Generate random initialization vector (IV) - 96 bits for AES-GCM
	const iv = window.crypto.getRandomValues(new Uint8Array(12));

	// Generate key identifier
	const keyIdentifier = generateKeyIdentifier();

	// Report progress: preparing
	onProgress?.({
		stage: 'preparing',
		progress: 0,
		totalBytes: file.size
	});

	// Read file as ArrayBuffer
	const fileData = await file.arrayBuffer();

	// Report progress: encrypting
	onProgress?.({
		stage: 'encrypting',
		progress: 50,
		bytesProcessed: 0,
		totalBytes: file.size
	});

	// Encrypt the file data
	const encryptedData = await window.crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv: iv as any,
			tagLength: 128 // 128-bit authentication tag
		},
		key,
		fileData
	);

	// Report progress: complete
	onProgress?.({
		stage: 'complete',
		progress: 100,
		bytesProcessed: file.size,
		totalBytes: file.size
	});

	return {
		encryptedData,
		iv,
		keyIdentifier
	};
}

// Encrypt a file in chunks (for large files with better progress tracking)
export async function encryptFileChunked(
	file: File,
	key: CryptoKey,
	chunkSize: number = 1024 * 1024 * 5, // 5MB chunks
	onProgress?: (progress: EncryptionProgress) => void
): Promise<EncryptionResult> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}

	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const keyIdentifier = generateKeyIdentifier();

	onProgress?.({
		stage: 'preparing',
		progress: 0,
		totalBytes: file.size
	});

	// For files under 10MB, use simple encryption
	if (file.size < 10 * 1024 * 1024) {
		return encryptFile(file, key, onProgress);
	}

	// For larger files, read and encrypt in chunks
	const chunks: ArrayBuffer[] = [];
	let bytesProcessed = 0;

	const reader = new FileReader();

	for (let offset = 0; offset < file.size; offset += chunkSize) {
		const chunk = file.slice(offset, Math.min(offset + chunkSize, file.size));

		const chunkData = await new Promise<ArrayBuffer>((resolve, reject) => {
			reader.onload = () => resolve(reader.result as ArrayBuffer);
			reader.onerror = () => reject(reader.error);
			reader.readAsArrayBuffer(chunk);
		});

		// Encrypt chunk
		const encryptedChunk = await window.crypto.subtle.encrypt(
			{
				name: 'AES-GCM',
				iv: iv as any
			},
			key,
			chunkData
		);

		chunks.push(encryptedChunk);
		bytesProcessed += chunk.size;

		// Report progress
		onProgress?.({
			stage: 'encrypting',
			progress: Math.round((bytesProcessed / file.size) * 100),
			bytesProcessed,
			totalBytes: file.size
		});
	}

	// Combine encrypted chunks
	const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const combined = new Uint8Array(totalLength);
	let position = 0;

	for (const chunk of chunks) {
		combined.set(new Uint8Array(chunk), position);
		position += chunk.byteLength;
	}

	onProgress?.({
		stage: 'complete',
		progress: 100,
		bytesProcessed: file.size,
		totalBytes: file.size
	});

	return {
		encryptedData: combined.buffer,
		iv,
		keyIdentifier
	};
}

// Decrypt encrypted data back to a Blob
export async function decryptFile(
	encryptedData: ArrayBuffer,
	key: CryptoKey,
	iv: Uint8Array,
	filename: string = 'decrypted_file',
	mimeType: string = 'application/octet-stream'
): Promise<DecryptionResult> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}

	// Decrypt the data
	const decryptedData = await window.crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv: iv as any,
			tagLength: 128
		},
		key,
		encryptedData
	);

	// Convert to Blob
	const blob = new Blob([decryptedData], { type: mimeType });

	return {
		decryptedData: blob,
		originalFilename: filename
	};
}

// Export encryption key to base64-encoded format (for server storage)
export async function exportKey(key: CryptoKey): Promise<string> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}

	const exported = await window.crypto.subtle.exportKey('raw', key);
	const exportedArray = new Uint8Array(exported);

	// Convert to base64
	return btoa(String.fromCharCode(...exportedArray));
}

// Import encryption key from base64-encoded format
export async function importKey(base64Key: string): Promise<CryptoKey> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}

	// Decode base64
	const binaryString = atob(base64Key);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	// Import as CryptoKey
	return await window.crypto.subtle.importKey(
		'raw',
		bytes as any,
		{
			name: 'AES-GCM',
			length: 256
		},
		true,
		['encrypt', 'decrypt']
	);
}

// Derive key from password (PBKDF2) - for future use
export async function deriveKeyFromPassword(
	password: string,
	salt: Uint8Array,
	iterations: number = 600000
): Promise<CryptoKey> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}

	// Import password as key material
	const passwordKey = await window.crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(password),
		'PBKDF2',
		false,
		['deriveBits', 'deriveKey']
	);

	// Derive AES-GCM key
	return await window.crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt: salt as any,
			iterations,
			hash: 'SHA-256'
		},
		passwordKey,
		{
			name: 'AES-GCM',
			length: 256
		},
		true,
		['encrypt', 'decrypt']
	);
}

// Generate random salt for key derivation
export function generateSalt(): Uint8Array {
	return window.crypto.getRandomValues(new Uint8Array(16));
}

// Validate encryption key
export function isValidEncryptionKey(key: CryptoKey): boolean {
	return (
		key.type === 'secret' &&
		key.algorithm.name === 'AES-GCM' &&
		'length' in key.algorithm &&
		key.algorithm.length === 256 &&
		key.usages.includes('encrypt') &&
		key.usages.includes('decrypt')
	);
}

// Calculate file hash (for integrity verification)
export async function calculateFileHash(file: File): Promise<string> {
	if (typeof window === 'undefined' || !window.crypto?.subtle) {
		throw new Error('Web Crypto API not available');
	}

	const fileData = await file.arrayBuffer();
	const hashBuffer = await window.crypto.subtle.digest('SHA-256', fileData);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
