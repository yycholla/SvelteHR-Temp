import type { RequestHandler } from './$types';
import { getApiBaseUrl } from '$lib/server/api-url';

/**
 * SSE Proxy endpoint for webhook batch processing progress
 *
 * This endpoint proxies Server-Sent Events from the Rust backend to the frontend.
 * It forwards session cookies to authenticate the request on the backend.
 */
export const GET: RequestHandler = async ({ params, cookies, fetch }) => {
	const { batch_id } = params;

	// Get backend URL
	const backendUrl = getApiBaseUrl();
	const sseUrl = `${backendUrl}/api/webhooks/process/${batch_id}/progress`;

	try {
		// Make request to backend SSE endpoint with session cookies
		const response = await fetch(sseUrl, {
			headers: {
				Accept: 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});

		if (!response.ok) {
			return new Response(
				JSON.stringify({
					error: 'Failed to connect to progress stream',
					status: response.status
				}),
				{
					status: response.status,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}

		// Check if response body exists
		if (!response.body) {
			return new Response(JSON.stringify({ error: 'No response body from backend' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Create a new ReadableStream that proxies the backend SSE stream
		const stream = new ReadableStream({
			async start(controller) {
				const reader = response.body!.getReader();
				const decoder = new TextDecoder();

				try {
					while (true) {
						const { done, value } = await reader.read();

						if (done) {
							controller.close();
							break;
						}

						// Forward the chunk to the client
						controller.enqueue(value);
					}
				} catch (error) {
					console.error('SSE stream error:', error);
					controller.error(error);
				}
			}
		});

		// Return SSE response with proper headers
		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
				'X-Accel-Buffering': 'no' // Disable nginx buffering
			}
		});
	} catch (error) {
		console.error('Error connecting to SSE endpoint:', error);
		return new Response(
			JSON.stringify({
				error: 'Failed to establish SSE connection',
				message: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
