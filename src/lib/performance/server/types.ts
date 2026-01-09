export interface ServerPerformanceMetric {
	id: string;
	timestamp: number;
	type: 'request' | 'graphql' | 'database' | 'api';
	method?: string;
	path: string;
	duration: number;
	status: number;
	contentLength?: number;
	userAgent?: string;
	ip?: string;
	memory?: {
		heapUsed: number;
		heapTotal: number;
		external: number;
		rss: number;
	};
	error?: string;
	metadata?: Record<string, any>;
}

export interface ServerPerformanceConfig {
	enabled: boolean;
	sampleRate: number; // 0-1, percentage of requests to monitor
	slowRequestThreshold: number; // ms
	memoryThreshold: number; // bytes
	maxMetricsStorage: number;
	enableDetailedLogging: boolean;
	excludePaths: string[];
}
