// File storage abstraction service (Feature 024)
// Initial implementation: PostgreSQL BYTEA storage
// Future: S3-compatible object storage (MinIO, Cloudflare R2)

import type { FileMetadata } from '$lib/types/document';

export interface StorageResult {
	storagePath: string;
	bytesStored: number;
}

export interface RetrievalResult {
	data: ArrayBuffer;
	metadata: {
		filename: string;
		fileType: string;
		fileSize: number;
	};
}

// Store encrypted file data
export async function storeFile(
	encryptedData: ArrayBuffer,
	metadata: FileMetadata
): Promise<StorageResult> {
	// Convert ArrayBuffer to base64 for transmission
	const bytes = new Uint8Array(encryptedData);
	const base64Data = btoa(String.fromCharCode(...bytes));

	const response = await fetch('/api/storage/upload', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			encryptedData: base64Data,
			metadata
		})
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to store file');
	}

	return await response.json();
}

// Retrieve encrypted file data
export async function retrieveFile(storagePath: string): Promise<RetrievalResult> {
	const response = await fetch(`/api/storage/retrieve?path=${encodeURIComponent(storagePath)}`, {
		method: 'GET'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve file');
	}

	const result = await response.json();

	// Decode base64 to ArrayBuffer
	const binaryString = atob(result.encryptedData);
	const bytes = new Uint8Array(binaryString.length);
	for (let i = 0; i < binaryString.length; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return {
		data: bytes.buffer,
		metadata: result.metadata
	};
}

// Delete file from storage
export async function deleteFile(storagePath: string): Promise<void> {
	const response = await fetch(`/api/storage/delete`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ storagePath })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to delete file');
	}
}

// Check if storage path exists
export async function storagePathExists(storagePath: string): Promise<boolean> {
	try {
		const response = await fetch(`/api/storage/exists?path=${encodeURIComponent(storagePath)}`, {
			method: 'GET'
		});

		if (!response.ok) return false;

		const result = await response.json();
		return result.exists;
	} catch {
		return false;
	}
}

// Get storage statistics
export async function getStorageStats(): Promise<{
	totalFiles: number;
	totalBytes: number;
	userFiles: number;
	userBytes: number;
}> {
	const response = await fetch('/api/storage/stats', {
		method: 'GET'
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to get storage statistics');
	}

	return await response.json();
}
