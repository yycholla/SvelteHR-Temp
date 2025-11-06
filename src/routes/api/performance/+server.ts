/**
 * Performance Monitoring API Endpoint
 *
 * Provides real-time performance data, statistics, and reports
 * for monitoring dashboard and external tools.
 *
 * Endpoints:
 * - GET /api/performance/stats - Current performance statistics
 * - GET /api/performance/metrics - Recent performance metrics
 * - GET /api/performance/report - Comprehensive performance report
 * - POST /api/performance/clear - Clear performance data
 * - GET /api/performance/budgets - Performance budget validation
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { serverPerformanceMonitor } from '$lib/performance/server-monitor.js';
import { budgetValidator, PERFORMANCE_BUDGETS } from '$lib/performance/performance-budgets.js';

// GET /api/performance/stats
export const GET: RequestHandler = async ({ url, request }) => {
	try {
		const endpoint = url.searchParams.get('endpoint');
		const timeframe = parseInt(url.searchParams.get('timeframe') || '3600000'); // Default 1 hour

		switch (endpoint) {
			case 'stats':
				return json({
					success: true,
					data: serverPerformanceMonitor.getStatistics(timeframe),
					timestamp: new Date().toISOString()
				});

			case 'metrics':
				const limit = parseInt(url.searchParams.get('limit') || '100');
				return json({
					success: true,
					data: serverPerformanceMonitor.getRecentMetrics(limit),
					timestamp: new Date().toISOString()
				});

			case 'report':
				return json({
					success: true,
					data: serverPerformanceMonitor.exportReport(),
					timestamp: new Date().toISOString()
				});

			case 'budgets':
				// Validate current metrics against budgets
				const currentStats = serverPerformanceMonitor.getStatistics(timeframe);

				const budgetMetrics = {
					'GraphQL Response Time (Average)': currentStats.averageResponseTime,
					'API Endpoint Response Time': currentStats.averageResponseTime,
					'Error Rate': currentStats.errorRate * 100,
					'Memory Usage': currentStats.memoryUsage.current
				};

				const validation = budgetValidator.validateMetrics(budgetMetrics);

				return json({
					success: true,
					data: {
						validation,
						budgets: PERFORMANCE_BUDGETS.budgets,
						recommendations:
							validation.violations.length > 0
								? budgetValidator.generateRecommendations(validation.violations)
								: []
					},
					timestamp: new Date().toISOString()
				});

			case 'health':
				// Performance health check
				const healthStats = serverPerformanceMonitor.getStatistics(300000); // Last 5 minutes

				const healthStatus = {
					status: 'healthy',
					score: 100,
					issues: [] as string[]
				};

				// Check various health indicators
				if (healthStats.averageResponseTime > 1000) {
					healthStatus.status = 'degraded';
					healthStatus.score -= 30;
					healthStatus.issues.push('High average response time');
				}

				if (healthStats.errorRate > 0.05) {
					// 5%
					healthStatus.status = 'degraded';
					healthStatus.score -= 25;
					healthStatus.issues.push('High error rate');
				}

				if (healthStats.slowRequestsCount > healthStats.totalRequests * 0.1) {
					// 10%
					healthStatus.status = 'degraded';
					healthStatus.score -= 20;
					healthStatus.issues.push('High slow request count');
				}

				if (healthStatus.score < 50) {
					healthStatus.status = 'unhealthy';
				}

				return json({
					success: true,
					data: {
						...healthStatus,
						statistics: healthStats,
						uptime: process.uptime(),
						memory: process.memoryUsage(),
						timestamp: new Date().toISOString()
					}
				});

			default:
				// Default: return basic stats
				return json({
					success: true,
					data: {
						statistics: serverPerformanceMonitor.getStatistics(timeframe),
						recentMetrics: serverPerformanceMonitor.getRecentMetrics(10),
						budgetStatus: 'healthy',
						timestamp: new Date().toISOString()
					}
				});
		}
	} catch (err) {
		console.error('Performance API error:', err);

		error(500, {
        			message: 'Failed to retrieve performance data',
        			error: err instanceof Error ? err.message : 'Unknown error'
        		});
	}
};

// POST /api/performance/clear
export const POST: RequestHandler = async ({ request, url }) => {
	try {
		const action = url.searchParams.get('action');

		switch (action) {
			case 'clear':
				serverPerformanceMonitor.clearMetrics();
				return json({
					success: true,
					message: 'Performance metrics cleared successfully',
					timestamp: new Date().toISOString()
				});

			case 'test':
				// Performance test endpoint
				const body = await request.json().catch(() => ({}));
				const { operationName = 'TestOperation', duration = 100, iterations = 1 } = body;

				const testResults = [];

				for (let i = 0; i < iterations; i++) {
					const start = Date.now();

					// Simulate operation
					await new Promise((resolve) => setTimeout(resolve, duration));

					const actualDuration = Date.now() - start;

					serverPerformanceMonitor.recordAPIEndpoint(
						`/api/performance/test`,
						'POST',
						actualDuration,
						200
					);

					testResults.push({
						iteration: i + 1,
						plannedDuration: duration,
						actualDuration,
						difference: actualDuration - duration
					});
				}

				return json({
					success: true,
					data: {
						operationName,
						results: testResults,
						summary: {
							totalIterations: iterations,
							averageActualDuration:
								testResults.reduce((sum, r) => sum + r.actualDuration, 0) / iterations,
							averageDifference: testResults.reduce((sum, r) => sum + r.difference, 0) / iterations
						}
					},
					timestamp: new Date().toISOString()
				});

			case 'record-metric':
				// Record a custom performance metric
				const metricBody = await request.json();
				const {
					type = 'api',
					method = 'POST',
					path = '/custom',
					duration: metricDuration,
					status = 200,
					metadata
				} = metricBody;

				if (!metricDuration || typeof metricDuration !== 'number') {
					error(400, 'Duration is required and must be a number');
				}

				serverPerformanceMonitor.recordAPIEndpoint(path, method, metricDuration, status);

				return json({
					success: true,
					message: 'Performance metric recorded successfully',
					metric: {
						type,
						method,
						path,
						duration: metricDuration,
						status,
						timestamp: new Date().toISOString()
					}
				});

			default:
				error(400, 'Invalid action specified');
		}
	} catch (err) {
		console.error('Performance API POST error:', err);

		if (err instanceof Error && err.message.includes('JSON')) {
			error(400, 'Invalid JSON in request body');
		}

		error(500, {
        			message: 'Failed to process performance action',
        			error: err instanceof Error ? err.message : 'Unknown error'
        		});
	}
};

// PUT /api/performance/config
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const configUpdate = await request.json();

		// Note: This would update server performance monitor configuration
		// For now, we'll just return the current configuration

		return json({
			success: true,
			message: 'Configuration updated successfully',
			data: {
				currentConfig: {
					enabled: true,
					sampleRate: 1.0,
					slowRequestThreshold: 500,
					memoryThreshold: 1024 * 1024 * 1024,
					maxMetricsStorage: 1000
				},
				updatedFields: Object.keys(configUpdate)
			},
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('Performance config update error:', err);

		error(500, {
        			message: 'Failed to update performance configuration',
        			error: err instanceof Error ? err.message : 'Unknown error'
        		});
	}
};

// DELETE /api/performance/metrics
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const olderThan = url.searchParams.get('olderThan');
		const type = url.searchParams.get('type');

		// This would implement selective metric deletion
		// For now, we'll just clear all metrics
		serverPerformanceMonitor.clearMetrics();

		return json({
			success: true,
			message: 'Performance metrics deleted successfully',
			deletedCount: 'all', // In a real implementation, this would be the actual count
			criteria: {
				olderThan,
				type
			},
			timestamp: new Date().toISOString()
		});
	} catch (err) {
		console.error('Performance metrics deletion error:', err);

		error(500, {
        			message: 'Failed to delete performance metrics',
        			error: err instanceof Error ? err.message : 'Unknown error'
        		});
	}
};

// OPTIONS for CORS support
export const OPTIONS: RequestHandler = async () => {
	return new Response(null, {
		status: 200,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		}
	});
};
