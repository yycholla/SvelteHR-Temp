/**
 * SSE Progress Stream API Endpoint
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T036
 * Created: 2025-10-02
 *
 * Server-Sent Events (SSE) endpoint for streaming real-time bulk rollback progress.
 * Endpoint: GET /api/rollback/bulk/:batchId/progress
 */

import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBatchProgress } from '$lib/services/bulk-rollback-processor.service';
import type { BatchProgress } from '$lib/services/bulk-rollback-processor.service';
import { extractJWTClaims } from '$lib/utils/rls-helpers';

const HEARTBEAT_INTERVAL = 15000; // 15 seconds
const POLL_INTERVAL = 100; // 100ms

/**
 * GET handler for SSE progress stream
 */
export const GET: RequestHandler = async ({ params, request, locals }) => {
	const { batchId } = params;

	// Validate authorization
	const authHeader = request.headers.get('authorization');
	if (!authHeader) {
		throw error(401, 'Missing authorization header');
	}

	const token = authHeader.replace('Bearer ', '');

	try {
		// Extract JWT claims
		const claims = extractJWTClaims(token);

		// Verify super_admin role
		if (claims.role !== 'super_admin') {
			throw error(403, 'Only super_admin can access bulk rollback progress');
		}

		// Validate batchId format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(batchId)) {
			throw error(400, 'Invalid batch ID format');
		}

		// Check if batch exists
		const initialProgress = await getBatchProgress(batchId);
		if (!initialProgress) {
			throw error(404, 'Batch not found');
		}

		// Create SSE stream
		const stream = new ReadableStream({
			async start(controller) {
				const encoder = new TextEncoder();

				// Send initial progress event
				sendProgressEvent(controller, encoder, initialProgress);

				// Set up polling interval
				let lastProgress = initialProgress;
				let heartbeatCounter = 0;

				const pollInterval = setInterval(async () => {
					try {
						// Fetch current progress
						const currentProgress = await getBatchProgress(batchId);

						if (!currentProgress) {
							// Batch no longer exists
							sendErrorEvent(controller, encoder, 'Batch no longer exists');
							clearInterval(pollInterval);
							controller.close();
							return;
						}

						// Check if progress changed
						const progressChanged =
							currentProgress.processedCount !== lastProgress.processedCount ||
							currentProgress.status !== lastProgress.status ||
							currentProgress.lastError !== lastProgress.lastError;

						if (progressChanged) {
							sendProgressEvent(controller, encoder, currentProgress);
							lastProgress = currentProgress;
						}

						// Send heartbeat every HEARTBEAT_INTERVAL
						heartbeatCounter += POLL_INTERVAL;
						if (heartbeatCounter >= HEARTBEAT_INTERVAL) {
							sendHeartbeat(controller, encoder);
							heartbeatCounter = 0;
						}

						// Check if batch is complete
						if (currentProgress.status === 'COMPLETED' || currentProgress.status === 'FAILED') {
							// Send final event
							sendCompletionEvent(controller, encoder, currentProgress);

							// Close stream after brief delay
							setTimeout(() => {
								clearInterval(pollInterval);
								controller.close();
							}, 1000);
						}
					} catch (pollError) {
						console.error('[SSE] Polling error:', pollError);
						sendErrorEvent(
							controller,
							encoder,
							pollError instanceof Error ? pollError.message : String(pollError)
						);
						clearInterval(pollInterval);
						controller.close();
					}
				}, POLL_INTERVAL);

				// Handle client disconnect
				request.signal.addEventListener('abort', () => {
					clearInterval(pollInterval);
					controller.close();
				});
			}
		});

		// Return SSE response
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no' // Disable nginx buffering
			}
		});
	} catch (err) {
		console.error('[SSE] Error setting up stream:', err);

		if (err && typeof err === 'object' && 'status' in err) {
			throw err; // Re-throw SvelteKit errors
		}

		throw error(500, 'Failed to establish SSE connection');
	}
};

/**
 * Sends a progress event
 */
function sendProgressEvent(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	progress: BatchProgress
) {
	const eventData = {
		batchId: progress.batchId,
		status: progress.status,
		processedCount: progress.processedCount,
		successfulCount: progress.successfulCount,
		failedCount: progress.failedCount,
		totalCount: progress.totalCount,
		currentLogId: progress.currentLogId,
		lastError: progress.lastError,
		timestamp: new Date().toISOString()
	};

	const event = `event: progress\ndata: ${JSON.stringify(eventData)}\n\n`;
	controller.enqueue(encoder.encode(event));
}

/**
 * Sends a completion event
 */
function sendCompletionEvent(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	progress: BatchProgress
) {
	const eventData = {
		batchId: progress.batchId,
		status: progress.status,
		processedCount: progress.processedCount,
		successfulCount: progress.successfulCount,
		failedCount: progress.failedCount,
		totalCount: progress.totalCount,
		lastError: progress.lastError,
		timestamp: new Date().toISOString()
	};

	const event = `event: complete\ndata: ${JSON.stringify(eventData)}\n\n`;
	controller.enqueue(encoder.encode(event));
}

/**
 * Sends an error event
 */
function sendErrorEvent(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder,
	errorMessage: string
) {
	const eventData = {
		error: errorMessage,
		timestamp: new Date().toISOString()
	};

	const event = `event: error\ndata: ${JSON.stringify(eventData)}\n\n`;
	controller.enqueue(encoder.encode(event));
}

/**
 * Sends a heartbeat comment
 */
function sendHeartbeat(
	controller: ReadableStreamDefaultController,
	encoder: TextEncoder
) {
	const heartbeat = `: heartbeat ${new Date().toISOString()}\n\n`;
	controller.enqueue(encoder.encode(heartbeat));
}
