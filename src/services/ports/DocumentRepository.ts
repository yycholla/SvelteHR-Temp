// src/services/ports/DocumentRepository.ts
import { Result } from '$domain/Result';
import {
	Document,
	DocumentError,
	DocumentNotFoundError,
	DocumentValidationError
} from '$domain/Document';

export interface DocumentFilter {
	type?: string[];
	status?: string[];
	uploadedBy?: string;
	search?: string;
	uploadedAfter?: Date;
	uploadedBefore?: Date;
	maxFileSize?: number;
	mimeTypes?: string[];
}

export interface CreateDocumentData {
	title: string;
	type: string;
	fileSize: number;
	mimeType: string;
	uploadedBy: string;
	status?: string;
	filePath: string;
	uploadedAt?: Date;
}

export interface UpdateDocumentData {
	title?: string;
	type?: string;
	status?: string;
	filePath?: string;
}

export interface DocumentRepository {
	/**
	 * Find a document by ID
	 * @returns Document if found, DocumentNotFoundError otherwise
	 */
	findById(id: string): Promise<Result<Document, DocumentNotFoundError>>;

	/**
	 * Find all documents matching filter
	 * @returns Array of documents (empty if none found)
	 */
	findAll(filter?: DocumentFilter): Promise<Result<Document[], DocumentError>>;

	/**
	 * Create a new document
	 * @returns Created document or validation error
	 */
	create(data: CreateDocumentData): Promise<Result<Document, DocumentValidationError>>;

	/**
	 * Update an existing document
	 * @returns Updated document or error
	 */
	update(id: string, data: UpdateDocumentData): Promise<Result<Document, DocumentError>>;

	/**
	 * Delete a document (soft delete - sets status to deleted)
	 * @returns Success or error
	 */
	delete(id: string): Promise<Result<void, DocumentNotFoundError>>;

	/**
	 * Publish a draft document
	 * @returns Published document or error
	 */
	publish(id: string): Promise<Result<Document, DocumentError>>;

	/**
	 * Archive a published document
	 * @returns Archived document or error
	 */
	archive(id: string): Promise<Result<Document, DocumentError>>;

	/**
	 * Get documents by uploader
	 * @returns Array of documents (empty if none)
	 */
	findByUploader(uploaderId: string): Promise<Result<Document[], DocumentError>>;

	/**
	 * Search documents by title
	 * @returns Array of matching documents (empty if none)
	 */
	searchByTitle(query: string): Promise<Result<Document[], DocumentError>>;

	/**
	 * Count documents by filter
	 * @returns Total count of matching documents
	 */
	count(filter?: DocumentFilter): Promise<Result<number, DocumentError>>;

	/**
	 * Check if document exists
	 * @returns true if document exists, false otherwise
	 */
	exists(id: string): Promise<boolean>;
}
