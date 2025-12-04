// In-memory document storage (Feature 024)
// Temporary storage until database integration is complete
// NOTE: Data is lost on server restart

import type { Document } from '$lib/types/document';

// In-memory storage
const documents: Map<string, Document> = new Map();
const encryptionKeys: Map<string, any> = new Map();
const fileStorage: Map<string, { data: string; metadata: any }> = new Map();

// Document operations
export const documentStore = {
	// Create document
	createDocument(document: Document): void {
		documents.set(document.id, document);
	},

	// Get document by ID
	getDocument(id: string): Document | undefined {
		return documents.get(id);
	},

	// List all documents
	listDocuments(): Document[] {
		return Array.from(documents.values());
	},

	// List documents for user based on role
	listDocumentsForUser(userId: string, userRole: string): Document[] {
		const allDocs = Array.from(documents.values());

		if (userRole === 'super_admin') {
			return allDocs;
		} else if (userRole === 'admin') {
			return allDocs.filter((doc) => !doc.is_deleted);
		} else {
			// Employee sees only documents uploaded by them or assigned to them
			return allDocs.filter((doc) => !doc.is_deleted && doc.uploaded_by === userId);
		}
	},

	// Update document
	updateDocument(id: string, updates: Partial<Document>): Document | null {
		const doc = documents.get(id);
		if (!doc) return null;

		const updated = { ...doc, ...updates };
		documents.set(id, updated);
		return updated;
	},

	// Delete document (soft delete)
	deleteDocument(id: string): boolean {
		const doc = documents.get(id);
		if (!doc) return false;

		doc.is_deleted = true;
		doc.deleted_at = new Date();
		documents.set(id, doc);
		return true;
	},

	// Hard delete (for testing)
	hardDeleteDocument(id: string): boolean {
		return documents.delete(id);
	},

	// Clear all documents (for testing)
	clearAll(): void {
		documents.clear();
		encryptionKeys.clear();
		fileStorage.clear();
	}
};

// Encryption key operations
export const keyStore = {
	// Store encryption key
	storeKey(keyId: string, keyData: any): void {
		encryptionKeys.set(keyId, keyData);
	},

	// Get encryption key
	getKey(keyId: string): any | undefined {
		return encryptionKeys.get(keyId);
	},

	// Delete encryption key
	deleteKey(keyId: string): boolean {
		return encryptionKeys.delete(keyId);
	}
};

// File storage operations
export const fileStore = {
	// Store file
	storeFile(storagePath: string, data: string, metadata: any): void {
		fileStorage.set(storagePath, { data, metadata });
	},

	// Get file
	getFile(storagePath: string): { data: string; metadata: any } | undefined {
		return fileStorage.get(storagePath);
	},

	// Delete file
	deleteFile(storagePath: string): boolean {
		return fileStorage.delete(storagePath);
	},

	// Check if file exists
	fileExists(storagePath: string): boolean {
		return fileStorage.has(storagePath);
	}
};
