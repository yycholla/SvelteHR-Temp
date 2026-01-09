/**
 * Metrics Service
 *
 * Service for tracking and collecting application performance metrics.
 * Used by PerformanceDashboard and monitoring components.
 */

export interface Metric {
	name: string;
	value: number;
	timestamp: Date;
	tags?: Record<string, string>;
}

export interface MetricsService {
	track(metric: Metric): void;
	getMetrics(name?: string): Metric[];
	clear(): void;
}

class MetricsServiceImpl implements MetricsService {
	private metrics: Metric[] = [];

	track(metric: Metric): void {
		this.metrics.push(metric);
	}

	getMetrics(name?: string): Metric[] {
		if (name) {
			return this.metrics.filter((m) => m.name === name);
		}
		return this.metrics;
	}

	clear(): void {
		this.metrics = [];
	}
}

export const metricsService = new MetricsServiceImpl();
