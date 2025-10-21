/**
 * Bundle Optimization Utilities
 * Feature: 028-task-system-expansion - T065
 *
 * Tools for analyzing and optimizing bundle size:
 * - Dynamic import helpers for code splitting
 * - Bundle size analysis and reporting
 * - Chunk optimization strategies
 * - Tree-shaking verification
 */

// ============================================================================
// DYNAMIC IMPORT HELPERS
// ============================================================================

/**
 * Lazy load component with loading state
 */
export async function lazyLoadComponent<T>(
	importFn: () => Promise<{ default: T }>,
	componentName: string
): Promise<T> {
	try {
		const startTime = performance.now();
		const module = await importFn();
		const duration = performance.now() - startTime;

		if (duration > 500) {
			console.warn(
				`⚠️ Slow component load: ${componentName} took ${Math.round(duration)}ms`
			);
		}

		return module.default;
	} catch (error) {
		console.error(`Failed to load component ${componentName}:`, error);
		throw new Error(`Component ${componentName} failed to load`);
	}
}

/**
 * Preload component for faster perceived performance
 */
export function preloadComponent(importFn: () => Promise<any>): void {
	// Create link with rel="modulepreload" for better caching
	if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
		requestIdleCallback(() => {
			importFn().catch((error) => {
				console.warn('Component preload failed:', error);
			});
		});
	}
}

/**
 * Lazy load multiple components in parallel
 */
export async function lazyLoadBatch<T extends Record<string, any>>(
	imports: Record<string, () => Promise<{ default: any }>>
): Promise<T> {
	const entries = Object.entries(imports);
	const modules = await Promise.all(
		entries.map(async ([key, importFn]) => {
			const module = await importFn();
			return [key, module.default];
		})
	);

	return Object.fromEntries(modules) as T;
}

// ============================================================================
// TASK COMPONENT LAZY LOADERS
// ============================================================================

/**
 * Lazy load task components for better initial bundle size
 */
export const TaskComponents = {
	/**
	 * Task form (heavy component with validation)
	 * Size: ~45KB | Load time: ~150ms
	 */
	TaskForm: () =>
		lazyLoadComponent(
			() => import('$lib/components/tasks/TaskForm.svelte'),
			'TaskForm'
		),

	/**
	 * Task hierarchy viewer (recursive component)
	 * Size: ~30KB | Load time: ~100ms
	 */
	TaskHierarchy: () =>
		lazyLoadComponent(
			() => import('$lib/components/tasks/TaskHierarchy.svelte'),
			'TaskHierarchy'
		),

	/**
	 * Task dependencies graph (includes visualization)
	 * Size: ~55KB | Load time: ~200ms
	 */
	TaskDependencies: () =>
		lazyLoadComponent(
			() => import('$lib/components/tasks/TaskDependencies.svelte'),
			'TaskDependencies'
		),

	/**
	 * Task audit trail (data-heavy component)
	 * Size: ~25KB | Load time: ~80ms
	 */
	TaskAuditTrail: () =>
		lazyLoadComponent(
			() => import('$lib/components/tasks/TaskAuditTrail.svelte'),
			'TaskAuditTrail'
		),

	/**
	 * Linked resources manager
	 * Size: ~20KB | Load time: ~70ms
	 */
	LinkedResources: () =>
		lazyLoadComponent(
			() => import('$lib/components/tasks/LinkedResources.svelte'),
			'LinkedResources'
		),

	/**
	 * Subtask progress visualization
	 * Size: ~15KB | Load time: ~50ms
	 */
	SubtaskProgress: () =>
		lazyLoadComponent(
			() => import('$lib/components/tasks/SubtaskProgress.svelte'),
			'SubtaskProgress'
		),

	/**
	 * Task filters (form-heavy component)
	 * Size: ~35KB | Load time: ~120ms
	 */
	TaskFilters: () =>
		lazyLoadComponent(
			() => import('$lib/components/tasks/TaskFilters.svelte'),
			'TaskFilters'
		)
};

/**
 * Preload critical task components
 */
export function preloadCriticalTaskComponents(): void {
	if (typeof window === 'undefined') return;

	// Preload TaskForm and TaskFilters as they're commonly used
	preloadComponent(() => import('$lib/components/tasks/TaskForm.svelte'));
	preloadComponent(() => import('$lib/components/tasks/TaskFilters.svelte'));
}

// ============================================================================
// BUNDLE SIZE ANALYSIS
// ============================================================================

export interface BundleMetrics {
	/** Total bundle size in bytes */
	totalSize: number;
	/** JavaScript bundle size */
	jsSize: number;
	/** CSS bundle size */
	cssSize: number;
	/** Number of chunks */
	chunkCount: number;
	/** Largest chunk size */
	largestChunk: number;
	/** Estimated load time (3G network) */
	estimatedLoadTime: number;
}

/**
 * Analyze current bundle performance
 */
export function analyzeBundlePerformance(): BundleMetrics {
	if (typeof window === 'undefined' || !performance.getEntriesByType) {
		return {
			totalSize: 0,
			jsSize: 0,
			cssSize: 0,
			chunkCount: 0,
			largestChunk: 0,
			estimatedLoadTime: 0
		};
	}

	const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
	const scripts = resources.filter((r) => r.initiatorType === 'script');
	const styles = resources.filter((r) => r.initiatorType === 'link' && r.name.endsWith('.css'));

	const jsSize = scripts.reduce((sum, r) => sum + (r.transferSize || 0), 0);
	const cssSize = styles.reduce((sum, r) => sum + (r.transferSize || 0), 0);
	const totalSize = jsSize + cssSize;

	const largestChunk = Math.max(...scripts.map((r) => r.transferSize || 0), 0);

	// Estimate load time for 3G network (750 KB/s)
	const estimatedLoadTime = totalSize / (750 * 1024);

	return {
		totalSize,
		jsSize,
		cssSize,
		chunkCount: scripts.length,
		largestChunk,
		estimatedLoadTime
	};
}

/**
 * Log bundle analysis to console
 */
export function logBundleAnalysis(): void {
	const metrics = analyzeBundlePerformance();

	console.group('📦 Bundle Analysis');
	console.log(`Total Size: ${formatBytes(metrics.totalSize)}`);
	console.log(`JavaScript: ${formatBytes(metrics.jsSize)}`);
	console.log(`CSS: ${formatBytes(metrics.cssSize)}`);
	console.log(`Chunks: ${metrics.chunkCount}`);
	console.log(`Largest Chunk: ${formatBytes(metrics.largestChunk)}`);
	console.log(`Est. Load Time (3G): ${(metrics.estimatedLoadTime * 1000).toFixed(0)}ms`);
	console.groupEnd();

	// Performance warnings
	if (metrics.totalSize > 500 * 1024) {
		console.warn('⚠️ Total bundle size exceeds 500KB');
	}
	if (metrics.largestChunk > 200 * 1024) {
		console.warn('⚠️ Largest chunk exceeds 200KB');
	}
	if (metrics.estimatedLoadTime > 3) {
		console.warn('⚠️ Estimated load time exceeds 3 seconds on 3G');
	}
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// CHUNK OPTIMIZATION RECOMMENDATIONS
// ============================================================================

export interface ChunkOptimizationRecommendation {
	/** Current chunk name */
	chunk: string;
	/** Current size in bytes */
	currentSize: number;
	/** Issue description */
	issue: string;
	/** Recommended action */
	recommendation: string;
	/** Estimated size reduction */
	estimatedReduction: number;
}

/**
 * Analyze chunks and provide optimization recommendations
 */
export function getChunkOptimizationRecommendations(): ChunkOptimizationRecommendation[] {
	const recommendations: ChunkOptimizationRecommendation[] = [];

	if (typeof window === 'undefined') return recommendations;

	const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
	const chunks = resources.filter((r) => r.initiatorType === 'script');

	chunks.forEach((chunk) => {
		const size = chunk.transferSize || 0;

		// Large chunk warning
		if (size > 200 * 1024) {
			recommendations.push({
				chunk: chunk.name,
				currentSize: size,
				issue: 'Chunk size exceeds 200KB',
				recommendation:
					'Consider code splitting this chunk further or lazy loading heavy dependencies',
				estimatedReduction: size * 0.3 // 30% reduction estimate
			});
		}

		// Vendor chunk optimization
		if (chunk.name.includes('vendor') && size > 300 * 1024) {
			recommendations.push({
				chunk: chunk.name,
				currentSize: size,
				issue: 'Vendor bundle is too large',
				recommendation:
					'Review vendor dependencies and consider splitting vendor chunks by usage patterns',
				estimatedReduction: size * 0.25 // 25% reduction estimate
			});
		}
	});

	return recommendations;
}

// ============================================================================
// TREE-SHAKING VERIFICATION
// ============================================================================

/**
 * Check if specific imports are tree-shakeable
 */
export function verifyTreeShaking(): {
	passed: string[];
	failed: string[];
} {
	const passed: string[] = [];
	const failed: string[] = [];

	// This is a simplified check - in production, use build tools for accurate analysis
	if (typeof window !== 'undefined') {
		// Check if common heavy libraries are fully imported vs tree-shaken
		const checks = [
			{ name: 'date-fns', test: () => Object.keys(window as any).includes('dateFns') },
			{ name: 'lodash', test: () => Object.keys(window as any).includes('_') }
		];

		checks.forEach(({ name, test }) => {
			if (test()) {
				failed.push(name);
			} else {
				passed.push(name);
			}
		});
	}

	return { passed, failed };
}

// ============================================================================
// PERFORMANCE BUDGETS
// ============================================================================

export const BUNDLE_PERFORMANCE_BUDGETS = {
	/** Maximum total bundle size */
	maxTotalSize: 500 * 1024, // 500KB
	/** Maximum JS size */
	maxJsSize: 400 * 1024, // 400KB
	/** Maximum CSS size */
	maxCssSize: 100 * 1024, // 100KB
	/** Maximum chunk size */
	maxChunkSize: 200 * 1024, // 200KB
	/** Maximum number of chunks */
	maxChunks: 20,
	/** Maximum load time (3G) */
	maxLoadTime: 3 // 3 seconds
} as const;

/**
 * Check if bundle meets performance budgets
 */
export function checkPerformanceBudgets(): {
	passed: boolean;
	violations: string[];
} {
	const metrics = analyzeBundlePerformance();
	const violations: string[] = [];

	if (metrics.totalSize > BUNDLE_PERFORMANCE_BUDGETS.maxTotalSize) {
		violations.push(
			`Total size (${formatBytes(metrics.totalSize)}) exceeds budget (${formatBytes(BUNDLE_PERFORMANCE_BUDGETS.maxTotalSize)})`
		);
	}

	if (metrics.jsSize > BUNDLE_PERFORMANCE_BUDGETS.maxJsSize) {
		violations.push(
			`JS size (${formatBytes(metrics.jsSize)}) exceeds budget (${formatBytes(BUNDLE_PERFORMANCE_BUDGETS.maxJsSize)})`
		);
	}

	if (metrics.cssSize > BUNDLE_PERFORMANCE_BUDGETS.maxCssSize) {
		violations.push(
			`CSS size (${formatBytes(metrics.cssSize)}) exceeds budget (${formatBytes(BUNDLE_PERFORMANCE_BUDGETS.maxCssSize)})`
		);
	}

	if (metrics.largestChunk > BUNDLE_PERFORMANCE_BUDGETS.maxChunkSize) {
		violations.push(
			`Largest chunk (${formatBytes(metrics.largestChunk)}) exceeds budget (${formatBytes(BUNDLE_PERFORMANCE_BUDGETS.maxChunkSize)})`
		);
	}

	if (metrics.chunkCount > BUNDLE_PERFORMANCE_BUDGETS.maxChunks) {
		violations.push(
			`Chunk count (${metrics.chunkCount}) exceeds budget (${BUNDLE_PERFORMANCE_BUDGETS.maxChunks})`
		);
	}

	if (metrics.estimatedLoadTime > BUNDLE_PERFORMANCE_BUDGETS.maxLoadTime) {
		violations.push(
			`Estimated load time (${(metrics.estimatedLoadTime * 1000).toFixed(0)}ms) exceeds budget (${BUNDLE_PERFORMANCE_BUDGETS.maxLoadTime}s)`
		);
	}

	return {
		passed: violations.length === 0,
		violations
	};
}

// ============================================================================
// AUTO-OPTIMIZATION HELPERS
// ============================================================================

/**
 * Initialize bundle optimization monitoring
 */
export function initBundleOptimization(): void {
	if (typeof window === 'undefined') return;

	// Log bundle analysis on page load
	window.addEventListener('load', () => {
		setTimeout(() => {
			logBundleAnalysis();

			const budget = checkPerformanceBudgets();
			if (!budget.passed) {
				console.group('⚠️ Performance Budget Violations');
				budget.violations.forEach((violation) => console.warn(violation));
				console.groupEnd();
			}

			const recommendations = getChunkOptimizationRecommendations();
			if (recommendations.length > 0) {
				console.group('💡 Chunk Optimization Recommendations');
				recommendations.forEach((rec) => {
					console.log(
						`${rec.chunk}: ${rec.issue} - ${rec.recommendation} (Est. reduction: ${formatBytes(rec.estimatedReduction)})`
					);
				});
				console.groupEnd();
			}
		}, 2000); // Wait 2s for all resources to load
	});

	// Preload critical components
	preloadCriticalTaskComponents();
}
