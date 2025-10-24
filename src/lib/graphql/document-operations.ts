// Document operations for GraphQL API
// Server-side document management with proper authentication

// Upload document mutation
export const UPLOAD_DOCUMENT = `
	mutation UploadDocument($input: UploadDocumentInput!) {
		uploadDocument(input: $input) {
			id
			title
			filePath
			fileSize
			mimeType
			accessLevel
			isEncrypted
			createdAt
			uploaderId
		}
	}
`;

// Get documents query with simple list (no Relay connection)
export const GET_DOCUMENTS = `
	query GetDocuments($limit: Int, $offset: Int) {
		documents(limit: $limit, offset: $offset) {
			id
			title
			description
			categoryId
			filePath
			fileSize
			mimeType
			accessLevel
			isEncrypted
			expiryDate
			versionNumber
			createdAt
			updatedAt
			uploaderId
			category {
				id
				name
			}
			assignments {
				id
				userId
				assignedBy
				dueDate
				completedAt
				createdAt
			}
		}
	}
`;

// Get single document
export const GET_DOCUMENT = `
	query GetDocument($id: UUID!) {
		document(id: $id) {
			id
			title
			description
			categoryId
			filePath
			fileSize
			mimeType
			accessLevel
			isEncrypted
			expiryDate
			createdAt
			updatedAt
			uploaderId
			category {
				id
				name
			}
			assignments {
				id
				userId
				assignedBy
				dueDate
				completedAt
				user {
					id
					email
					displayName
				}
			}
			accessLogs {
				id
				userId
				accessType
				createdAt
				user {
					id
					email
					displayName
				}
			}
		}
	}
`;

// Download document (this will be handled server-side)
export const DOWNLOAD_DOCUMENT = `
	query DownloadDocument($id: UUID!) {
		document(id: $id) {
			id
			title
			filePath
			isEncrypted
		}
	}
`;

// Delete document
export const DELETE_DOCUMENT = `
	mutation DeleteDocument($id: UUID!) {
		deleteDocument(id: $id)
	}
`;

// Update document metadata
export const UPDATE_DOCUMENT = `
	mutation UpdateDocument($id: UUID!, $input: UpdateDocumentInput!) {
		updateDocument(id: $id, input: $input) {
			id
			title
			description
			categoryId
			accessLevel
			expiryDate
			updatedAt
		}
	}
`;

// Assign document to users
export const ASSIGN_DOCUMENT = `
	mutation AssignDocument($documentId: UUID!, $input: CreateDocumentAssignmentInput!) {
		createDocumentAssignment(input: $input) {
			id
			documentId
			userId
			assignedBy
			dueDate
			createdAt
		}
	}
`;

// Get document categories
export const GET_DOCUMENT_CATEGORIES = `
	query GetDocumentCategories {
		documentCategories {
			id
			name
			description
		}
	}
`;
