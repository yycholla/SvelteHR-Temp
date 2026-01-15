import { json } from '@sveltejs/kit';
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

export const POST: RequestHandler = async ({ request, fetch }) => {
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

		// Forward to backend to update integration status
		try {
			const backendUrl = process.env.PUBLIC_API_URL || 'http://sveltehr-backend:4000';
			const backendResponse = await fetch(`${backendUrl}/api/intuit/disconnect`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ realmId })
			});

			if (!backendResponse.ok) {
				logger.error('Backend failed to process disconnect', undefined, {
					status: backendResponse.status,
					realmId
				});
			}
		} catch (backendError) {
			logger.error('Failed to notify backend of disconnection', backendError as Error, {
				realmId
			});
			// Don't fail the webhook - we still acknowledge receipt
		}

		// Return success to Intuit
		return json({
			success: true,
			message: 'Disconnection processed successfully',
			realmId,
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

// GET endpoint for health check
export const GET: RequestHandler = async () => {
	return json({
		endpoint: 'intuit-disconnect-webhook',
		status: 'active',
		timestamp: new Date().toISOString(),
		methods: ['POST']
	});
};
