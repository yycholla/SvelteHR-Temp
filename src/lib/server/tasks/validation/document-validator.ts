import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { ResourceValidationResult } from './types';

/**
 * Validate a document resource
 */
export async function validateDocumentResource(documentId: string): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidateDocument($documentId: UUID!) {
						documentById(id: $documentId) {
							id
							title
							fileName
							archived
							archivedAt
						}
					}
				`,
				variables: { documentId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch document'
			};
		}

		const data = await response.json();
		const document = data?.data?.documentById;

		if (!document) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Document not found'
			};
		}

		// Check if document is archived
		if (document.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: document.title || document.fileName,
				error: 'Document is archived'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: document.title || document.fileName,
			metadata: {
				fileName: document.fileName
			}
		};
	} catch (error) {
		logger.error('Error checking document', error as Error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking document'
		};
	}
}
