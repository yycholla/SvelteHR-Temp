// src/lib/services/documentServiceFactory.ts
import type { RequestEvent } from '@sveltejs/kit';
import { DocumentService } from '$services/DocumentService';
import { GraphQLDocumentAdapter } from '$adapters/graphql/GraphQLDocumentAdapter';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';

/**
 * Factory function to create a DocumentService instance with GraphQL adapter
 *
 * @param event - SvelteKit RequestEvent containing fetch and cookies
 * @returns Configured DocumentService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts
 * export const load = async (event) => {
 *   const documentService = createDocumentService(event);
 *   const result = await documentService.getAllDocuments();
 *   return { documents: result.isOk ? result.value : [] };
 * };
 * ```
 */
export function createDocumentService(event: RequestEvent): DocumentService {
	const client = createUrqlClient(
		event.fetch,
		event.locals.accessToken,
		undefined,
		serializeCookies(event.cookies)
	);

	const adapter = new GraphQLDocumentAdapter(client);
	return new DocumentService(adapter);
}
