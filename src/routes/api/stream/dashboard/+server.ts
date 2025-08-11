import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiClient } from '$lib/api/client';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token = cookies.get('auth-token');
	
	console.log('🔄 Streaming endpoint - Token present:', !!token);
	
	if (!token) {
		console.log('🔄 Streaming endpoint - No token found');
		return new Response('Unauthorized', { status: 401 });
	}

	// Create server-side API client
	const serverApiClient = apiClient.extend({
		hooks: {
			beforeRequest: [
				(request) => {
					request.headers.set('Authorization', `Bearer ${token}`);
					request.headers.set('Content-Type', 'application/json');
				}
			]
		}
	});

	// Create a readable stream
	const stream = new ReadableStream({
		async start(controller) {
			const encoder = new TextEncoder();

			// Helper function to send data
			const send = (type: string, data: any) => {
				const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
				controller.enqueue(encoder.encode(message));
			};

			try {
				// Send initial loading state
				send('loading', { message: 'Starting data fetch...', progress: 0 });

				// Define all the API calls we need to make
				const apiCalls = [
					{ 
						name: 'employees', 
						call: () => serverApiClient.get('employees?pageSize=1').json(),
						progress: 15
					},
					{ 
						name: 'events', 
						call: () => serverApiClient.get('events').json(),
						progress: 30
					},
					{ 
						name: 'notifications', 
						call: () => serverApiClient.get('notifications/unread-count').json(),
						progress: 45
					},
					{ 
						name: 'monitoring', 
						call: () => serverApiClient.get('monitoring/metrics').json(),
						progress: 60
					},
					{ 
						name: 'compliance', 
						call: () => serverApiClient.get('compliance/stats').json(),
						progress: 75
					},
					{ 
						name: 'tasks', 
						call: () => serverApiClient.get('tasks').json(),
						progress: 90
					},
					{ 
						name: 'leave', 
						call: () => serverApiClient.get('leave/requests').json(),
						progress: 100
					}
				];

				// Execute API calls sequentially for streaming effect
				for (const apiCall of apiCalls) {
					try {
						send('progress', { 
							message: `Fetching ${apiCall.name}...`, 
							progress: apiCall.progress - 10,
							type: apiCall.name
						});

						const data = await apiCall.call();
						
						send('data', {
							type: apiCall.name,
							data: data,
							progress: apiCall.progress
						});

					} catch (error) {
						send('error', {
							type: apiCall.name,
							error: error instanceof Error ? error.message : 'Unknown error',
							progress: apiCall.progress
						});
					}

					// Add small delay for visual effect
					await new Promise(resolve => setTimeout(resolve, 100));
				}

				// Send completion
				send('complete', { message: 'All data loaded successfully!', progress: 100 });

			} catch (error) {
				send('error', { 
					message: error instanceof Error ? error.message : 'Unknown error occurred',
					progress: 0
				});
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Cache-Control'
		}
	});
};