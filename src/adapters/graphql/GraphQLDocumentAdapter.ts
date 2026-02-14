// src/adapters/graphql/GraphQLDocumentAdapter.ts
import { Client } from '@urql/core';
import { Result } from '$domain/Result';
import {
	Document,
	DocumentTitle,
	DocumentType,
	FileSize,
	MimeType,
	UploadedBy,
	DocumentStatus,
	DocumentError,
	DocumentNotFoundError,
	DocumentValidationError
} from '$domain/Document';
import type {
	DocumentRepository,
	CreateDocumentData,
	UpdateDocumentData,
	DocumentFilter
} from '$services/ports/DocumentRepository';
import { gql } from '@urql/core';

/**
 * GraphQL schema response shape
 */
interface GraphQLDocument {
	id: string;
	title: string;
	type: string;
	fileSize: number;
	mimeType: string;
	uploadedBy: string;
	status: string;
	filePath: string;
	uploadedAt: string;
	updatedAt: string;
}

// GraphQL queries
const GET_DOCUMENT = gql`
	query GetDocument($id: ID!) {
		document(id: $id) {
			id
			title
			type
			fileSize
			mimeType
			uploadedBy
			status
			filePath
			uploadedAt
			updatedAt
		}
	}
`;

const GET_ALL_DOCUMENTS = gql`
	query GetAllDocuments($filter: DocumentFilter) {
		documents(filter: $filter) {
			id
			title
			type
			fileSize
			mimeType
			uploadedBy
			status
			filePath
			uploadedAt
			updatedAt
		}
	}
`;

const CREATE_DOCUMENT = gql`
	mutation CreateDocument($input: CreateDocumentInput!) {
		createDocument(input: $input) {
			id
			title
			type
			fileSize
			mimeType
			uploadedBy
			status
			filePath
			uploadedAt
			updatedAt
		}
	}
`;

const UPDATE_DOCUMENT = gql`
	mutation UpdateDocument($id: ID!, $input: UpdateDocumentInput!) {
		updateDocument(id: $id, input: $input) {
			id
			title
			type
			fileSize
			mimeType
			uploadedBy
			status
			filePath
			uploadedAt
			updatedAt
		}
	}
`;

const DELETE_DOCUMENT = gql`
	mutation DeleteDocument($id: ID!) {
		deleteDocument(id: $id) {
			success
		}
	}
`;

/**
 * GraphQLDocumentAdapter implements DocumentRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * NOTE: This is a stub implementation. Full GraphQL mutations and queries
 * will be implemented when the backend Document schema is available.
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLDocumentAdapter(urqlClient);
 * const result = await adapter.findById('doc-123');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLDocumentAdapter implements DocumentRepository {
	constructor(private readonly client: Client) {}

	async findById(id: string): Promise<Result<Document, DocumentNotFoundError>> {
		try {
			const result = await this.client.query(GET_DOCUMENT, { id }).toPromise();

			if (result.error) {
				return Result.error(new DocumentNotFoundError(id));
			}

			if (!result.data?.document) {
				return Result.error(new DocumentNotFoundError(id));
			}

			return this.mapToDocument(result.data.document);
		} catch (error) {
			return Result.error(new DocumentNotFoundError(id));
		}
	}

	async findAll(filter?: DocumentFilter): Promise<Result<Document[], DocumentError>> {
		try {
			const result = await this.client.query(GET_ALL_DOCUMENTS, { filter }).toPromise();

			if (result.error) {
				return Result.error(new DocumentError(result.error.message));
			}

			const documents = result.data?.documents ?? [];
			const mappedDocuments: Document[] = [];

			// Resilient error handling: skip invalid documents instead of failing
			for (const docData of documents) {
				const docResult = this.mapToDocument(docData);
				if (docResult.isOk) {
					mappedDocuments.push(docResult.value);
				}
				// Skip invalid documents (e.g., invalid title, type, etc.)
			}

			return Result.ok(mappedDocuments);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to fetch documents: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(data: CreateDocumentData): Promise<Result<Document, DocumentValidationError>> {
		try {
			const result = await this.client.mutation(CREATE_DOCUMENT, { input: data }).toPromise();

			if (result.error) {
				return Result.error(new DocumentValidationError(result.error.message));
			}

			if (!result.data?.createDocument) {
				return Result.error(new DocumentValidationError('Failed to create document'));
			}

			return this.mapToDocument(result.data.createDocument);
		} catch (error) {
			return Result.error(
				new DocumentValidationError(
					`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(id: string, data: UpdateDocumentData): Promise<Result<Document, DocumentError>> {
		try {
			const result = await this.client.mutation(UPDATE_DOCUMENT, { id, input: data }).toPromise();

			if (result.error) {
				return Result.error(new DocumentError(result.error.message));
			}

			if (!result.data?.updateDocument) {
				return Result.error(new DocumentError('Failed to update document'));
			}

			return this.mapToDocument(result.data.updateDocument);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, DocumentNotFoundError>> {
		try {
			const result = await this.client.mutation(DELETE_DOCUMENT, { id }).toPromise();

			if (result.error) {
				return Result.error(new DocumentNotFoundError(id));
			}

			if (!result.data?.deleteDocument?.success) {
				return Result.error(new DocumentNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new DocumentNotFoundError(id));
		}
	}

	async publish(id: string): Promise<Result<Document, DocumentError>> {
		// Use update with status change
		return this.update(id, { status: 'published' });
	}

	async archive(id: string): Promise<Result<Document, DocumentError>> {
		// Use update with status change
		return this.update(id, { status: 'archived' });
	}

	async findByUploader(uploaderId: string): Promise<Result<Document[], DocumentError>> {
		// Use findAll with filter
		return this.findAll({ uploadedBy: uploaderId });
	}

	async searchByTitle(query: string): Promise<Result<Document[], DocumentError>> {
		// Use findAll with search filter
		return this.findAll({ search: query });
	}

	async count(filter?: DocumentFilter): Promise<Result<number, DocumentError>> {
		try {
			// Get all documents and count them
			const result = await this.findAll(filter);

			if (result.isError) {
				return Result.error(result.error);
			}

			return Result.ok(result.value.length);
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to count documents: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async exists(id: string): Promise<boolean> {
		try {
			const result = await this.findById(id);
			return result.isOk;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Map GraphQL data to Document domain entity
	 * Resilient: returns error Result instead of throwing
	 */
	private mapToDocument(data: GraphQLDocument): Result<Document, DocumentError> {
		try {
			// Create all value objects
			const titleResult = DocumentTitle.create(data.title);
			if (titleResult.isError) {
				return Result.error(titleResult.error);
			}

			const typeResult = DocumentType.create(data.type);
			if (typeResult.isError) {
				return Result.error(typeResult.error);
			}

			const fileSizeResult = FileSize.create(data.fileSize);
			if (fileSizeResult.isError) {
				return Result.error(fileSizeResult.error);
			}

			const mimeTypeResult = MimeType.create(data.mimeType);
			if (mimeTypeResult.isError) {
				return Result.error(mimeTypeResult.error);
			}

			const uploadedByResult = UploadedBy.create(data.uploadedBy);
			if (uploadedByResult.isError) {
				return Result.error(uploadedByResult.error);
			}

			const statusResult = DocumentStatus.create(data.status);
			if (statusResult.isError) {
				return Result.error(statusResult.error);
			}

			// Create Document entity
			return Document.create({
				id: data.id,
				title: titleResult.value,
				type: typeResult.value,
				fileSize: fileSizeResult.value,
				mimeType: mimeTypeResult.value,
				uploadedBy: uploadedByResult.value,
				status: statusResult.value,
				filePath: data.filePath,
				uploadedAt: new Date(data.uploadedAt),
				updatedAt: new Date(data.updatedAt)
			});
		} catch (error) {
			return Result.error(
				new DocumentError(
					`Failed to map document: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
