import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { logger } from '$lib/utils/logger';

/**
 * Intuit Disconnect Webhook Endpoint
 *
 * Called by Intuit when a user disconnects the SvelteHR app from QuickBooks.
 * This endpoint handles the disconnection notification and updates the
 * integration status in the database.
 *
 * Intuit Developer Portal Configuration:
 * - Disconnect URL: https://hr.mtncarerx.com/api/intuit/disconnect
 */

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse the webhook payload from Intuit
		const payload = await request.json();

		logger.info('Received Intuit disconnect notification', { payload });

		// Extract realm ID (QuickBooks company ID) from payload
		const realmId = payload.realmId || payload.realm_id;

		if (!realmId) {
			logger.warn('Disconnect notification missing realmId', { payload });
			return json({ error: 'Missing realmId' }, { status: 400 });
		}

		// TODO: Update integration status in database
		// This will be implemented when we have the GraphQL mutation ready
		// For now, just log the disconnection
		logger.info(`QuickBooks disconnection for realm: ${realmId}`, {
			realmId,
			timestamp: new Date().toISOString(),
			source: 'intuit_webhook'
		});

		// NOTE: Intuit disconnect callback is treated as notification-only at this layer.
		// Connection teardown is handled through authenticated integration flows.

		// Return success to Intuit
		return json({
			success: true,
			message: 'Disconnection processed successfully',
			realmId,
			next: '/intuit/disconnected',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		logger.error('Error processing Intuit disconnect webhook', error as Error);

		// Return 200 even on error to prevent Intuit from retrying
		// Log the error for manual review
		return json(
			{
				success: false,
				error: 'Internal server error',
				message: 'Disconnection notification received but processing failed'
			},
			{ status: 200 }
		);
	}
};

// GET endpoint used as user-facing disconnect URL.
export const GET: RequestHandler = async ({ url }) => {
	const params = new URLSearchParams(url.searchParams);
	const target = `/intuit/disconnected${params.toString() ? `?${params.toString()}` : ''}`;
	throw redirect(302, target);
};
