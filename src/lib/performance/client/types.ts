// Performance metric interfaces
export interface PerformanceMetric {
	id: string;
	timestamp: number;
	name: string;
	type: 'page-load' | 'graphql' | 'component' | 'real-time' | 'export' | 'memory' | 'navigation';
	duration: number;
	status: 'success' | 'warning' | 'error';
	metadata?: Record<string, any>;
	tags?: string[];
}

export interface CoreWebVitals {
	lcp: number | null; // Largest Contentful Paint
	fid: number | null; // First Input Delay
	cls: number | null; // Cumulative Layout Shift
	fcp: number | null; // First Contentful Paint
	ttfb: number | null; // Time to First Byte
}

export interface MemoryUsage {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
	jsHeapSizeLimit: number;
	timestamp: number;
}

export interface PerformanceBudget {
	pageLoad: number; // 1000ms
	graphqlResponse: number; // 200ms
	componentRender: number; // 16ms (60fps)
	realTimeUpdate: number; // 100ms
	exportOperation: number; // 5000ms
	memoryLimit: number; // 100MB
}

export interface PerformanceAlert {
	id: string;
	timestamp: number;
	type: 'budget-exceeded' | 'memory-leak' | 'performance-degradation';
	severity: 'low' | 'medium' | 'high' | 'critical';
	message: string;
	metric: PerformanceMetric;
	recommendations: string[];
}
