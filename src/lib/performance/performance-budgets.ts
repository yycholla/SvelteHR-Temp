/**
 * Performance Budgets Configuration for SvelteHR
 *
 * Defines strict performance targets and budgets for various aspects
 * of the application. These budgets are enforced through monitoring,
 * testing, and CI/CD pipeline validation.
 *
 * Requirements:
 * - <200ms GraphQL response time (P95)
 * - <1 second page load time (P95)
 * - <100ms real-time update latency
 * - <5 seconds export operations for 1000 records
 * - <100MB memory usage per browser tab
 */

export interface PerformanceBudget {
	name: string;
	target: number;
	warning: number;
	critical: number;
	unit: 'ms' | 'bytes' | 'count' | 'percent' | 'score';
	description: string;
	enforcement: 'strict' | 'warning' | 'info';
	category: 'response-time' | 'resource' | 'user-experience' | 'throughput';
}

export interface PerformanceBudgetConfig {
	budgets: PerformanceBudget[];
	globalSettings: {
		enforceInProduction: boolean;
		enforceInDevelopment: boolean;
		enableAlerts: boolean;
		enableReporting: boolean;
		reportingInterval: number; // minutes
	};
	thresholds: {
		performanceScore: {
			excellent: number;
			good: number;
			needsImprovement: number;
		};
	};
}

/**
 * Performance budgets aligned with SvelteHR requirements
 */
export const PERFORMANCE_BUDGETS: PerformanceBudgetConfig = {
	budgets: [
		// GraphQL Response Time Budgets
		{
			name: 'GraphQL Response Time (Average)',
			target: 150,
			warning: 200,
			critical: 300,
			unit: 'ms',
			description: 'Average GraphQL operation response time',
			enforcement: 'strict',
			category: 'response-time'
		},
		{
			name: 'GraphQL Response Time (P95)',
			target: 200,
			warning: 300,
			critical: 500,
			unit: 'ms',
			description: '95th percentile GraphQL operation response time',
			enforcement: 'strict',
			category: 'response-time'
		},
		{
			name: 'GraphQL Query Complexity',
			target: 500,
			warning: 800,
			critical: 1200,
			unit: 'count',
			description: 'GraphQL query complexity score',
			enforcement: 'warning',
			category: 'throughput'
		},

		// Page Load Performance Budgets
		{
			name: 'Page Load Time (Average)',
			target: 800,
			warning: 1000,
			critical: 2000,
			unit: 'ms',
			description: 'Average page load time',
			enforcement: 'strict',
			category: 'response-time'
		},
		{
			name: 'Page Load Time (P95)',
			target: 1000,
			warning: 1500,
			critical: 3000,
			unit: 'ms',
			description: '95th percentile page load time',
			enforcement: 'strict',
			category: 'response-time'
		},
		{
			name: 'Time to First Byte (TTFB)',
			target: 600,
			warning: 800,
			critical: 1200,
			unit: 'ms',
			description: 'Server response time for initial byte',
			enforcement: 'warning',
			category: 'response-time'
		},

		// Core Web Vitals Budgets
		{
			name: 'Largest Contentful Paint (LCP)',
			target: 2000,
			warning: 2500,
			critical: 4000,
			unit: 'ms',
			description: 'Largest content element render time',
			enforcement: 'strict',
			category: 'user-experience'
		},
		{
			name: 'First Input Delay (FID)',
			target: 50,
			warning: 100,
			critical: 300,
			unit: 'ms',
			description: 'Time from user input to browser response',
			enforcement: 'strict',
			category: 'user-experience'
		},
		{
			name: 'Cumulative Layout Shift (CLS)',
			target: 0.05,
			warning: 0.1,
			critical: 0.25,
			unit: 'score',
			description: 'Visual stability during page load',
			enforcement: 'strict',
			category: 'user-experience'
		},
		{
			name: 'First Contentful Paint (FCP)',
			target: 1200,
			warning: 1800,
			critical: 3000,
			unit: 'ms',
			description: 'Time to first content render',
			enforcement: 'warning',
			category: 'user-experience'
		},

		// Real-time Feature Budgets
		{
			name: 'Real-time Update Latency',
			target: 50,
			warning: 100,
			critical: 250,
			unit: 'ms',
			description: 'Latency for real-time updates and WebSocket messages',
			enforcement: 'strict',
			category: 'response-time'
		},
		{
			name: 'Component Render Time',
			target: 16,
			warning: 32,
			critical: 100,
			unit: 'ms',
			description: 'Time to render individual components (60fps target)',
			enforcement: 'warning',
			category: 'response-time'
		},

		// Resource and Memory Budgets
		{
			name: 'JavaScript Heap Memory',
			target: 80 * 1024 * 1024, // 80MB
			warning: 100 * 1024 * 1024, // 100MB
			critical: 150 * 1024 * 1024, // 150MB
			unit: 'bytes',
			description: 'JavaScript heap memory usage per browser tab',
			enforcement: 'strict',
			category: 'resource'
		},
		{
			name: 'JavaScript Bundle Size',
			target: 500 * 1024, // 500KB
			warning: 1024 * 1024, // 1MB
			critical: 2048 * 1024, // 2MB
			unit: 'bytes',
			description: 'Total JavaScript bundle size',
			enforcement: 'warning',
			category: 'resource'
		},
		{
			name: 'CSS Bundle Size',
			target: 100 * 1024, // 100KB
			warning: 200 * 1024, // 200KB
			critical: 500 * 1024, // 500KB
			unit: 'bytes',
			description: 'Total CSS bundle size',
			enforcement: 'warning',
			category: 'resource'
		},

		// Export and Data Processing Budgets
		{
			name: 'Export Operation Time',
			target: 3000, // 3 seconds
			warning: 5000, // 5 seconds
			critical: 10000, // 10 seconds
			unit: 'ms',
			description: 'Time to export 1000 records',
			enforcement: 'strict',
			category: 'throughput'
		},
		{
			name: 'Data Table Render Time',
			target: 200,
			warning: 500,
			critical: 1000,
			unit: 'ms',
			description: 'Time to render data tables with 100 rows',
			enforcement: 'warning',
			category: 'response-time'
		},

		// Database and Server Performance Budgets
		{
			name: 'Database Query Time',
			target: 50,
			warning: 100,
			critical: 500,
			unit: 'ms',
			description: 'Database query execution time',
			enforcement: 'strict',
			category: 'response-time'
		},
		{
			name: 'API Endpoint Response Time',
			target: 200,
			warning: 500,
			critical: 2000,
			unit: 'ms',
			description: 'REST API endpoint response time',
			enforcement: 'strict',
			category: 'response-time'
		},

		// Error Rate and Reliability Budgets
		{
			name: 'Error Rate',
			target: 0.1,
			warning: 1.0,
			critical: 5.0,
			unit: 'percent',
			description: 'Percentage of requests resulting in errors',
			enforcement: 'strict',
			category: 'throughput'
		},
		{
			name: 'Cache Hit Rate',
			target: 90,
			warning: 80,
			critical: 70,
			unit: 'percent',
			description: 'Percentage of requests served from cache',
			enforcement: 'warning',
			category: 'throughput'
		}
	],

	globalSettings: {
		enforceInProduction: true,
		enforceInDevelopment: true,
		enableAlerts: true,
		enableReporting: true,
		reportingInterval: 60 // 1 hour
	},

	thresholds: {
		performanceScore: {
			excellent: 90,
			good: 70,
			needsImprovement: 50
		}
	}
};

/**
 * Budget validation utilities
 */
export class PerformanceBudgetValidator {
	private budgets: PerformanceBudget[];

	constructor(budgets: PerformanceBudget[] = PERFORMANCE_BUDGETS.budgets) {
		this.budgets = budgets;
	}

	/**
	 * Validate a metric against its budget
	 */
	validateMetric(
		budgetName: string,
		value: number
	): {
		passed: boolean;
		level: 'excellent' | 'good' | 'warning' | 'critical';
		budget: PerformanceBudget;
		message: string;
	} {
		const budget = this.budgets.find((b) => b.name === budgetName);

		if (!budget) {
			throw new Error(`Budget not found: ${budgetName}`);
		}

		let level: 'excellent' | 'good' | 'warning' | 'critical';
		let passed: boolean;

		if (value <= budget.target) {
			level = 'excellent';
			passed = true;
		} else if (value <= budget.warning) {
			level = 'good';
			passed = budget.enforcement !== 'strict';
		} else if (value <= budget.critical) {
			level = 'warning';
			passed = budget.enforcement === 'info';
		} else {
			level = 'critical';
			passed = false;
		}

		const message = this.generateMessage(budget, value, level);

		return { passed, level, budget, message };
	}

	/**
	 * Validate multiple metrics at once
	 */
	validateMetrics(metrics: Record<string, number>): {
		overallPassed: boolean;
		overallScore: number;
		results: Array<ReturnType<PerformanceBudgetValidator['validateMetric']>>;
		violations: Array<ReturnType<PerformanceBudgetValidator['validateMetric']>>;
	} {
		const results: Array<ReturnType<PerformanceBudgetValidator['validateMetric']>> = [];

		for (const [budgetName, value] of Object.entries(metrics)) {
			try {
				const result = this.validateMetric(budgetName, value);
				results.push(result);
			} catch (error) {
				console.warn(`Could not validate metric ${budgetName}:`, error);
			}
		}

		const violations = results.filter((r) => !r.passed);
		const overallPassed = violations.length === 0;

		// Calculate overall score (0-100)
		const scoreSum = results.reduce((sum, result) => {
			switch (result.level) {
				case 'excellent':
					return sum + 100;
				case 'good':
					return sum + 80;
				case 'warning':
					return sum + 60;
				case 'critical':
					return sum + 20;
			}
		}, 0);

		const overallScore = results.length > 0 ? Math.round(scoreSum / results.length) : 100;

		return {
			overallPassed,
			overallScore,
			results,
			violations
		};
	}

	/**
	 * Get budget by name
	 */
	getBudget(name: string): PerformanceBudget | undefined {
		return this.budgets.find((b) => b.name === name);
	}

	/**
	 * Get budgets by category
	 */
	getBudgetsByCategory(category: PerformanceBudget['category']): PerformanceBudget[] {
		return this.budgets.filter((b) => b.category === category);
	}

	/**
	 * Generate recommendations based on violations
	 */
	generateRecommendations(
		violations: Array<ReturnType<PerformanceBudgetValidator['validateMetric']>>
	): string[] {
		const recommendations: string[] = [];

		violations.forEach((violation) => {
			const { budget, level } = violation;

			switch (budget.category) {
				case 'response-time':
					if (budget.name.includes('GraphQL')) {
						recommendations.push(
							'Optimize GraphQL queries by reducing complexity and implementing better caching'
						);
						recommendations.push(
							'Consider database indexing improvements for frequently queried fields'
						);
					} else if (budget.name.includes('Page Load')) {
						recommendations.push(
							'Implement code splitting and lazy loading for better page load performance'
						);
						recommendations.push('Optimize image loading and compression');
					}
					break;

				case 'resource':
					if (budget.name.includes('Memory')) {
						recommendations.push(
							'Check for memory leaks in components and implement proper cleanup'
						);
						recommendations.push('Optimize data structures and reduce memory-intensive operations');
					} else if (budget.name.includes('Bundle')) {
						recommendations.push('Enable tree-shaking and remove unused dependencies');
						recommendations.push('Consider code splitting and dynamic imports');
					}
					break;

				case 'user-experience':
					recommendations.push('Optimize critical rendering path and reduce layout shifts');
					recommendations.push('Implement performance monitoring for Core Web Vitals');
					break;

				case 'throughput':
					if (budget.name.includes('Error Rate')) {
						recommendations.push('Implement better error handling and retry mechanisms');
					} else if (budget.name.includes('Cache')) {
						recommendations.push('Review cache strategies and implement better cache invalidation');
					}
					break;
			}
		});

		// Remove duplicates
		return [...new Set(recommendations)];
	}

	private generateMessage(budget: PerformanceBudget, value: number, level: string): string {
		const formattedValue = this.formatValue(value, budget.unit);
		const formattedTarget = this.formatValue(budget.target, budget.unit);

		switch (level) {
			case 'excellent':
				return `✅ ${budget.name}: ${formattedValue} (target: ${formattedTarget})`;
			case 'good':
				return `✔️ ${budget.name}: ${formattedValue} (target: ${formattedTarget}, within warning threshold)`;
			case 'warning':
				return `⚠️ ${budget.name}: ${formattedValue} exceeds warning threshold (target: ${formattedTarget})`;
			case 'critical':
				return `❌ ${budget.name}: ${formattedValue} critically exceeds target (${formattedTarget})`;
		}
	}

	private formatValue(value: number, unit: PerformanceBudget['unit']): string {
		switch (unit) {
			case 'ms':
				return `${Math.round(value * 100) / 100}ms`;
			case 'bytes':
				const mb = value / (1024 * 1024);
				if (mb >= 1) return `${Math.round(mb * 100) / 100}MB`;
				const kb = value / 1024;
				return `${Math.round(kb * 100) / 100}KB`;
			case 'percent':
				return `${Math.round(value * 100) / 100}%`;
			case 'score':
				return `${Math.round(value * 1000) / 1000}`;
			case 'count':
				return `${Math.round(value)}`;
			default:
				return `${value}`;
		}
	}
}

/**
 * Default budget validator instance
 */
export const budgetValidator = new PerformanceBudgetValidator();

/**
 * Quick validation helpers
 */
export function validateGraphQLResponse(duration: number): boolean {
	const result = budgetValidator.validateMetric('GraphQL Response Time (Average)', duration);
	return result.passed;
}

export function validatePageLoad(duration: number): boolean {
	const result = budgetValidator.validateMetric('Page Load Time (Average)', duration);
	return result.passed;
}

export function validateMemoryUsage(bytes: number): boolean {
	const result = budgetValidator.validateMetric('JavaScript Heap Memory', bytes);
	return result.passed;
}

export function validateCoreWebVitals(vitals: {
	lcp?: number;
	fid?: number;
	cls?: number;
	fcp?: number;
}): {
	passed: boolean;
	violations: string[];
} {
	const metrics: Record<string, number> = {};

	if (vitals.lcp !== undefined) metrics['Largest Contentful Paint (LCP)'] = vitals.lcp;
	if (vitals.fid !== undefined) metrics['First Input Delay (FID)'] = vitals.fid;
	if (vitals.cls !== undefined) metrics['Cumulative Layout Shift (CLS)'] = vitals.cls;
	if (vitals.fcp !== undefined) metrics['First Contentful Paint (FCP)'] = vitals.fcp;

	const validation = budgetValidator.validateMetrics(metrics);

	return {
		passed: validation.overallPassed,
		violations: validation.violations.map((v) => v.message)
	};
}

export default PERFORMANCE_BUDGETS;
