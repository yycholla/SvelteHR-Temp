/**
 * GraphQL operations for Intuit QuickBooks OAuth flow
 */

import { client } from '$lib/graphql/client';
import { GET_INTUIT_AUTH_URL, DISCONNECT_INTUIT } from './queries';

/**
 * Get the OAuth authorization URL for QuickBooks
 * @returns Authorization URL and state parameter
 */
export async function getIntuitAuthUrl(): Promise<{ url: string; state: string }> {
	const result = await client.query(GET_INTUIT_AUTH_URL, {}).toPromise();

	if (result.error) {
		throw new Error(result.error.message);
	}

	return result.data.intuit.authorizationUrl;
}

/**
 * Disconnect from QuickBooks
 * @returns Success status
 */
export async function disconnectIntuit(): Promise<{ success: boolean; error?: string }> {
	const result = await client.mutation(DISCONNECT_INTUIT, {}).toPromise();

	if (result.error) {
		throw new Error(result.error.message);
	}

	return result.data.intuit.disconnect;
}
