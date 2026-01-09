import type { ServerPerformanceConfig } from './types';

export const DEFAULT_CONFIG: ServerPerformanceConfig = {
	enabled: true,
	sampleRate: 1.0, // Monitor all requests in development
	slowRequestThreshold: 500, // 500ms
	memoryThreshold: 1024 * 1024 * 1024, // 1GB
	maxMetricsStorage: 1000,
	enableDetailedLogging: false,
	excludePaths: ['/favicon.ico', '/_app/', '/static/']
};
