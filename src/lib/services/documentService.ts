// Document operations service (Feature 024)
// High-level service coordinating encryption, storage, and metadata management

import type {
	AssignmentPayload,
	Document,
	DocumentFilter,
	DocumentMetadata,
	PaginatedDocuments,
	UploadProgress,
	UploadResult
} from '$lib/types/document';
import { encryptFileChunked, exportKey, generateEncryptionKey } from './encryption';
import { registerKey } from './keyManagement';
import { storeFile } from './storageService';
import { createAccessMetadata, logSuccessfulAccess } from './auditService';

// Prepare document for upload with client-side encryption
// Returns encrypted data and metadata ready for server-side GraphQL upload
export async function prepareDocumentUpload(
	file: File,
	metadata: DocumentMetadata,
	onProgress?: (progress: UploadProgress) => void
): Promise<{
	encryptedData: ArrayBuffer;
	uploadInput: {
		filename: string;
		fileType: string;
		fileSizeBytes: number;
		encryptionKeyId: string;
		category: string;
		sensitivityLevel: string;
		expirationDate?: string;
		metadataTags: Record<string, any>;
		assignToEmployees: string[];
		assignToDepartments: string[];
		iv: number[];
	};
}> {
	try {
		// Step 1: Generate encryption key
		onProgress?.({ stage: 'encrypting', progress: 0 });
		const encryptionKey = await generateEncryptionKey();

		// Step 2: Encrypt file
		const encryptionResult = await encryptFileChunked(
			file,
			encryptionKey,
			5 * 1024 * 1024, // 5MB chunks
			(encProgress) => {
				onProgress?.({
					stage: 'encrypting',
					progress: Math.round(encProgress.progress * 0.6) // 0-60% of total
				});
			}
		);

		// Step 3: Export and register encryption key
		onProgress?.({ stage: 'uploading', progress: 60 });
		const exportedKey = await exportKey(encryptionKey);
		const keyId = await registerKey(
			new TextEncoder().encode(exportedKey).buffer,
			encryptionResult.keyIdentifier
			// Note: user ID is determined server-side from authenticated session
		);

		// Step 4: Prepare upload input for GraphQL mutation
		onProgress?.({ stage: 'processing', progress: 80 });
		const uploadInput = {
			filename: file.name,
			fileType: file.type.split('/')[1]?.toUpperCase() || 'PDF',
			fileSizeBytes: file.size,
			encryptionKeyId: keyId,
			category: metadata.category,
			sensitivityLevel: metadata.sensitivityLevel,
			expirationDate: metadata.expirationDate?.toISOString(),
			metadataTags: metadata.metadataTags || {},
			assignToEmployees: metadata.assignToEmployees || [],
			assignToDepartments: metadata.assignToDepartments || [],
			iv: Array.from(encryptionResult.iv) // Convert Uint8Array to regular array for JSON
		};

		onProgress?.({ stage: 'complete', progress: 100 });

		return {
			encryptedData: encryptionResult.encryptedData,
			uploadInput
		};
	} catch (error) {
		console.error('Document preparation failed:', error);
		throw error;
	}
}

// Legacy function for backward compatibility - now delegates to prepareDocumentUpload
// This will be removed once all callers are updated to use server-side actions
export async function uploadDocument(
	file: File,
	metadata: DocumentMetadata,
	onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
	console.warn(
		'[documentService] uploadDocument is deprecated. Use prepareDocumentUpload + server-side GraphQL.'
	);

	const { encryptedData, uploadInput } = await prepareDocumentUpload(file, metadata, onProgress);

	// This legacy path should not be used - throw error to force migration
	throw new Error(
		'Direct client-side upload is no longer supported. Use server-side GraphQL upload.'
	);
}

// Assign document to employees or departments
export async function assignDocument(
	documentId: string,
	assignments: AssignmentPayload
): Promise<void> {
	const response = await fetch(`/api/documents/${documentId}/assign`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include', // Include cookies for authentication
		body: JSON.stringify(assignments)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to assign document');
	}
}

// Get document metadata
export async function getDocumentMetadata(documentId: string): Promise<Document> {
	const response = await fetch(`/api/documents/${documentId}`, {
		method: 'GET',
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve document metadata');
	}

	return await response.json();
}

// List documents with filters
export async function listDocuments(filters: DocumentFilter): Promise<PaginatedDocuments> {
	const params = new URLSearchParams();
	if (filters.employeeId) params.set('employeeId', filters.employeeId);
	if (filters.category) params.set('category', filters.category);
	if (filters.sensitivityLevel) params.set('sensitivityLevel', filters.sensitivityLevel);
	if (filters.page) params.set('page', filters.page.toString());
	if (filters.limit) params.set('limit', filters.limit.toString());
	if (filters.searchQuery) params.set('search', filters.searchQuery);

	const response = await fetch(`/api/documents?${params.toString()}`, {
		method: 'GET',
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to list documents');
	}

	return await response.json();
}

// Download document (encrypted)
export async function downloadDocument(
	documentId: string,
	fetchFn: typeof fetch = fetch
): Promise<Blob> {
	const response = await fetchFn(`/api/documents/${documentId}/download`, {
		method: 'GET',
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to download document');
	}

	// Log successful download
	await logSuccessfulAccess(
		documentId,
		'current_user',
		'download',
		createAccessMetadata(),
		fetchFn
	);

	return await response.blob();
}

// Delete document (soft delete)
export async function deleteDocument(documentId: string, reason?: string): Promise<void> {
	const response = await fetch(`/api/documents/${documentId}`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include', // Include cookies for authentication
		body: JSON.stringify({ reason })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to delete document');
	}
}

// Restore soft-deleted document
export async function restoreDocument(documentId: string, reason?: string): Promise<void> {
	const response = await fetch(`/api/documents/${documentId}/restore`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include', // Include cookies for authentication
		body: JSON.stringify({ reason })
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to restore document');
	}
}

// Update document metadata
export async function updateDocumentMetadata(
	documentId: string,
	updates: Partial<DocumentMetadata>
): Promise<Document> {
	const response = await fetch(`/api/documents/${documentId}`, {
		method: 'PATCH',
		headers: {
			'Content-Type': 'application/json'
		},
		credentials: 'include', // Include cookies for authentication
		body: JSON.stringify(updates)
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to update document metadata');
	}

	return await response.json();
}

// Search documents
export async function searchDocuments(
	query: string,
	filters?: Omit<DocumentFilter, 'searchQuery'>
): Promise<PaginatedDocuments> {
	return listDocuments({
		...filters,
		searchQuery: query
	});
}

// Get documents expiring soon
export async function getExpiringDocuments(daysUntilExpiration: number = 30): Promise<Document[]> {
	const response = await fetch(`/api/documents/expiring?days=${daysUntilExpiration}`, {
		method: 'GET',
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve expiring documents');
	}

	return await response.json();
}

// Get documents by category
export async function getDocumentsByCategory(category: string): Promise<Document[]> {
	const result = await listDocuments({ category, limit: 100 });
	return result.documents;
}

// Get user's recent documents
export async function getRecentDocuments(limit: number = 10): Promise<Document[]> {
	const response = await fetch(`/api/documents/recent?limit=${limit}`, {
		method: 'GET',
		credentials: 'include' // Include cookies for authentication
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || 'Failed to retrieve recent documents');
	}

	return await response.json();
}
