import { apiClient } from '$lib/api/client';

export interface StreamingConfig {
	endpoint: string;
	apiCalls: {
		name: string;
		url: string;
		progress: number;
		required?: boolean;
	}[];
}

export class StreamingService {
	static async createStreamingEndpoint(
		config: StreamingConfig,
		cookies: { get: (name: string) => string | undefined }
	): Promise<Response> {
		const token = cookies.get('auth-token');

		console.log(`🔄 Streaming ${config.endpoint} - Token present:`, !!token);

		if (!token) {
			console.log(`🔄 Streaming ${config.endpoint} - No token found`);
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
					send('loading', {
						message: `Starting ${config.endpoint} data fetch...`,
						progress: 0
					});

					// Execute API calls sequentially for streaming effect
					for (let i = 0; i < config.apiCalls.length; i++) {
						const apiCall = config.apiCalls[i];

						try {
							send('progress', {
								message: `Fetching ${apiCall.name}...`,
								progress: apiCall.progress - 5,
								type: apiCall.name
							});

							const data = await serverApiClient.get(apiCall.url).json();

							send('data', {
								type: apiCall.name,
								data: data,
								progress: apiCall.progress
							});

						} catch (error) {
							const errorMessage = error instanceof Error ? error.message : 'Unknown error';

							send('error', {
								type: apiCall.name,
								error: errorMessage,
								progress: apiCall.progress,
								required: apiCall.required ?? false
							});

							// If it's a required API call and fails, we might want to stop
							if (apiCall.required) {
								send('critical_error', {
									message: `Critical error: ${apiCall.name} failed`,
									error: errorMessage
								});
								break;
							}
						}

						// Add small delay for visual effect
						await new Promise(resolve => setTimeout(resolve, 100));
					}

					// Send completion
					send('complete', {
						message: `${config.endpoint} data loaded successfully!`,
						progress: 100
					});

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
	}
}

// Common API call configurations
export const STREAMING_CONFIGS = {
	employees: {
		endpoint: 'employees',
		apiCalls: [
			{ name: 'employees-list', url: 'employees?page=1&limit=50', progress: 30, required: true },
			{ name: 'departments', url: 'departments', progress: 60 },
			{ name: 'roles', url: 'roles', progress: 90 },
			{ name: 'employee-stats', url: 'employees?pageSize=1', progress: 100 }
		]
	},
	tasks: {
		endpoint: 'tasks',
		apiCalls: [
			{ name: 'tasks-list', url: 'tasks', progress: 25, required: true },
			{ name: 'task-stats', url: 'tasks?status=completed', progress: 50 },
			{ name: 'assignments', url: 'tasks?status=pending', progress: 75 },
      { name: 'templates', url: 'tasks/templates', progress: 100 }
		]
	},
	compliance: {
		endpoint: 'compliance',
		apiCalls: [
			{ name: 'compliance-items', url: 'employees/compliance', progress: 30, required: true },
			{ name: 'compliance-stats', url: 'compliance/stats', progress: 60 },
			{ name: 'expiring-items', url: 'employees/compliance?status=ExpiringSoon', progress: 90 },
			{ name: 'categories', url: 'employees/compliance?groupBy=itemType', progress: 100 }
		]
	},
	leave: {
		endpoint: 'leave',
		apiCalls: [
			{ name: 'leave-requests', url: 'leave/requests', progress: 30, required: true },
			{ name: 'leave-balances', url: 'leave/balances', progress: 60 },
			{ name: 'leave-policies', url: 'leave/policies', progress: 90 },
			{ name: 'pending-approvals', url: 'leave/requests?status=Pending', progress: 100 }
		]
	},
	reports: {
		endpoint: 'reports',
		apiCalls: [
			{ name: 'analytics-overview', url: 'analytics/overview', progress: 20 },
			{ name: 'employee-metrics', url: 'analytics/employees', progress: 40 },
			{ name: 'performance-data', url: 'analytics/performance', progress: 60 },
			{ name: 'compliance-reports', url: 'analytics/compliance', progress: 80 },
			{ name: 'financial-reports', url: 'analytics/financial', progress: 100 }
		]
	},
	hr: {
		endpoint: 'hr',
		apiCalls: [
			{ name: 'hr-dashboard', url: 'hr-requests', progress: 20, required: true },
			{ name: 'onboarding-status', url: 'employees/onboarding/status', progress: 40 },
			{ name: 'performance-reviews', url: 'employees/performance', progress: 60 },
			{ name: 'document-stats', url: 'documents?category=HR', progress: 80 },
			{ name: 'notification-summary', url: 'notifications?type=HR', progress: 100 }
		]
	},
	admin: {
		endpoint: 'admin',
		apiCalls: [
			{ name: 'system-health', url: 'monitoring/health', progress: 15, required: true },
			{ name: 'system-metrics', url: 'monitoring/metrics', progress: 30 },
			{ name: 'user-activity', url: 'monitoring/activity', progress: 45 },
			{ name: 'security-logs', url: 'monitoring/security', progress: 60 },
			{ name: 'system-config', url: 'admin/config', progress: 75 },
			{ name: 'backup-status', url: 'admin/backup', progress: 90 },
			{ name: 'maintenance-status', url: 'admin/maintenance', progress: 100 }
		]
	}
} as const;

// Type for streaming configs
export type StreamingConfigKey = keyof typeof STREAMING_CONFIGS;
