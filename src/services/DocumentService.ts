// src/services/DocumentService.ts
import { Result } from '$domain/Result';
import {
	Document,
	DocumentError,
	DocumentNotFoundError,
	DocumentValidationError,
	DocumentTitle
} from '$domain/Document';
import type {
	DocumentRepository,
	CreateDocumentData,
	UpdateDocumentData,
	DocumentFilter
} from './ports/DocumentRepository';

export class DocumentService {
	constructor(private readonly repository: DocumentRepository) {}

	async getDocumentById(id: string): Promise<Result<Document, DocumentNotFoundError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to fetch document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<Document, DocumentNotFoundError>;
		}
	}

	async getAllDocuments(filter?: DocumentFilter): Promise<Result<Document[], DocumentError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createDocument(
		data: CreateDocumentData
	): Promise<Result<Document, DocumentValidationError>> {
		try {
			// Validate title before delegating to repository
			const titleResult = DocumentTitle.create(data.title);

			if (titleResult.isError) {
				return Result.error(titleResult.error);
			}

			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new DocumentValidationError(
					`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateDocument(
		id: string,
		data: UpdateDocumentData
	): Promise<Result<Document, DocumentError>> {
		try {
			// Validate title if provided
			if (data.title !== undefined) {
				const titleResult = DocumentTitle.create(data.title);

				if (titleResult.isError) {
					return Result.error(titleResult.error);
				}
			}

			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteDocument(id: string): Promise<Result<void, DocumentNotFoundError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			) as Result<void, DocumentNotFoundError>;
		}
	}

	async publishDocument(id: string): Promise<Result<Document, DocumentError>> {
		try {
			return await this.repository.publish(id);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to publish document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async archiveDocument(id: string): Promise<Result<Document, DocumentError>> {
		try {
			return await this.repository.archive(id);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to archive document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async getDocumentsByUploader(uploaderId: string): Promise<Result<Document[], DocumentError>> {
		try {
			return await this.repository.findByUploader(uploaderId);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to fetch documents by uploader: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async searchDocuments(query: string): Promise<Result<Document[], DocumentError>> {
		try {
			return await this.repository.searchByTitle(query);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async countDocuments(filter?: DocumentFilter): Promise<Result<number, DocumentError>> {
		try {
			return await this.repository.count(filter);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to count documents: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async documentExists(id: string): Promise<boolean> {
		try {
			return await this.repository.exists(id);
		} catch (error) {
			return false;
		}
	}
}
