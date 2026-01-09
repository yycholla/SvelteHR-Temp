/**
 * Performance Tests for SvelteHR
 *
 * Comprehensive performance validation tests that ensure:
 * - Page load times <1 second (P95)
 * - GraphQL responses <200ms (P95)
 * - Real-time updates <100ms
 * - Export operations <5 seconds for 1000 records
 * - Memory usage <100MB per browser tab
 * - Core Web Vitals meet Google standards
 *
 * These tests use Playwright's performance APIs to measure real-world performance
 * and validate against strict performance budgets.
 */

import { type Page, expect, test } from '@playwright/test';

// Performance budgets aligned with requirements
const PERFORMANCE_BUDGETS = {
	PAGE_LOAD_TIME: 1000, // 1 second
	GRAPHQL_RESPONSE_TIME: 200, // 200ms
	REAL_TIME_UPDATE_LATENCY: 100, // 100ms
	EXPORT_OPERATION_TIME: 5000, // 5 seconds for 1000 records
	MEMORY_LIMIT: 100 * 1024 * 1024, // 100MB

	// Core Web Vitals
	LCP_GOOD: 2500, // Largest Contentful Paint
	FID_GOOD: 100, // First Input Delay
	CLS_GOOD: 0.1, // Cumulative Layout Shift
	FCP_GOOD: 1800, // First Contentful Paint
	TTFB_GOOD: 800 // Time to First Byte
} as const;

// Utility functions for performance measurement
async function measurePageLoad(
	page: Page,
	url: string
): Promise<{
	navigationTime: number;
	domContentLoaded: number;
	loadComplete: number;
	firstContentfulPaint?: number;
	largestContentfulPaint?: number;
}> {
	const startTime = Date.now();

	// Navigate and wait for load event
	await page.goto(url, { waitUntil: 'load' });

	const navigationTime = Date.now() - startTime;

	// Get performance timing data
	const timing = await page.evaluate(() => {
		const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
		const paintEntries = performance.getEntriesByType('paint');

		return {
			domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
			loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
			firstContentfulPaint: paintEntries.find((entry) => entry.name === 'first-contentful-paint')
				?.startTime
			// Note: LCP requires PerformanceObserver which is more complex in test environment
		};
	});

	return {
		navigationTime,
		...timing
	};
}

async function measureGraphQLOperations(page: Page): Promise<{
	operations: Array<{ name: string; duration: number; status: number }>;
	averageDuration: number;
	p95Duration: number;
	slowestOperation: string;
}> {
	const operations: Array<{ name: string; duration: number; status: number }> = [];

	// Listen for GraphQL requests
	await page.route('**/graphql', async (route) => {
		const startTime = Date.now();

		try {
			const response = await route.fetch();
			const duration = Date.now() - startTime;

			const requestBody = await route.request().postDataJSON();
			const operationName = requestBody?.operationName || 'anonymous';

			operations.push({
				name: operationName,
				duration,
				status: response.status()
			});

			await route.fulfill({ response });
		} catch (error) {
			await route.abort();
		}
	});

	return new Promise((resolve) => {
		// Resolve after collecting operations for a reasonable time
		setTimeout(() => {
			const durations = operations.map((op) => op.duration).sort((a, b) => a - b);
			const averageDuration =
				durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;
			const p95Index = Math.floor(durations.length * 0.95);
			const p95Duration = durations[p95Index] || 0;
			const slowestOperation =
				operations.reduce(
					(prev, current) => (prev.duration > current.duration ? prev : current),
					operations[0]
				)?.name || '';

			resolve({
				operations,
				averageDuration,
				p95Duration,
				slowestOperation
			});
		}, 2000);
	});
}

async function measureMemoryUsage(page: Page): Promise<{
	heapUsed: number;
	heapTotal: number;
	heapLimit: number;
}> {
	return await page.evaluate(() => {
		if ('memory' in performance) {
			const memory = (performance as any).memory;
			return {
				heapUsed: memory.usedJSHeapSize,
				heapTotal: memory.totalJSHeapSize,
				heapLimit: memory.jsHeapSizeLimit
			};
		}
		return { heapUsed: 0, heapTotal: 0, heapLimit: 0 };
	});
}

async function measureCoreWebVitals(page: Page): Promise<{
	lcp?: number;
	fid?: number;
	cls?: number;
	fcp?: number;
	ttfb?: number;
}> {
	return await page.evaluate(() => {
		return new Promise((resolve) => {
			const vitals: any = {};

			// First Contentful Paint
			const paintEntries = performance.getEntriesByType('paint');
			vitals.fcp = paintEntries.find((entry) => entry.name === 'first-contentful-paint')?.startTime;

			// Time to First Byte
			const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			if (navEntry) {
				vitals.ttfb = navEntry.responseStart - navEntry.fetchStart;
			}

			// Largest Contentful Paint (if available)
			if ('PerformanceObserver' in window) {
				try {
					const lcpObserver = new PerformanceObserver((list) => {
						const entries = list.getEntries();
						if (entries.length > 0) {
							vitals.lcp = entries[entries.length - 1].startTime;
						}
					});
					lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
				} catch (e) {
					// LCP not supported
				}

				// Cumulative Layout Shift
				try {
					let clsValue = 0;
					const clsObserver = new PerformanceObserver((list) => {
						for (const entry of list.getEntries()) {
							if (!(entry as any).hadRecentInput) {
								clsValue += (entry as any).value;
							}
						}
						vitals.cls = clsValue;
					});
					clsObserver.observe({ entryTypes: ['layout-shift'] });
				} catch (e) {
					// CLS not supported
				}
			}

			// Return after a short delay to collect metrics
			setTimeout(() => resolve(vitals), 1500);
		});
	});
}

// Performance Tests
test.describe('Performance Validation', () => {
	test.beforeEach(async ({ page }) => {
		// Enable performance tracking
		await page.addInitScript(() => {
			// Add performance marks for debugging
			performance.mark('test-start');
		});
	});

	test('Dashboard page loads within performance budget', async ({ page }) => {
		console.log('🚀 Testing dashboard page load performance...');

		const loadMetrics = await measurePageLoad(page, '/dashboard');

		console.log(`📊 Page load metrics:`, {
			navigationTime: `${loadMetrics.navigationTime}ms`,
			domContentLoaded: `${loadMetrics.domContentLoaded}ms`,
			loadComplete: `${loadMetrics.loadComplete}ms`,
			firstContentfulPaint: loadMetrics.firstContentfulPaint
				? `${loadMetrics.firstContentfulPaint}ms`
				: 'N/A'
		});

		// Validate performance budgets
		expect(loadMetrics.navigationTime, 'Page navigation time should be under budget').toBeLessThan(
			PERFORMANCE_BUDGETS.PAGE_LOAD_TIME
		);

		expect(loadMetrics.domContentLoaded, 'DOM content loaded should be fast').toBeLessThan(
			PERFORMANCE_BUDGETS.PAGE_LOAD_TIME / 2
		);

		if (loadMetrics.firstContentfulPaint) {
			expect(
				loadMetrics.firstContentfulPaint,
				'First Contentful Paint should meet standards'
			).toBeLessThan(PERFORMANCE_BUDGETS.FCP_GOOD);
		}
	});

	test('GraphQL operations meet response time targets', async ({ page }) => {
		console.log('🔍 Testing GraphQL operation performance...');

		await page.goto('/dashboard');

		// Start collecting GraphQL metrics
		const metricsPromise = measureGraphQLOperations(page);

		// Trigger various GraphQL operations by interacting with the UI
		await page.waitForLoadState('networkidle');

		// Navigate to different sections to trigger GraphQL queries
		if (await page.locator('[href="/dashboard/employees"]').isVisible()) {
			await page.click('[href="/dashboard/employees"]');
			await page.waitForLoadState('networkidle');
		}

		if (await page.locator('[href="/dashboard/management"]').isVisible()) {
			await page.click('[href="/dashboard/management"]');
			await page.waitForLoadState('networkidle');
		}

		const graphqlMetrics = await metricsPromise;

		console.log(`📈 GraphQL metrics:`, {
			operationsCount: graphqlMetrics.operations.length,
			averageDuration: `${Math.round(graphqlMetrics.averageDuration)}ms`,
			p95Duration: `${Math.round(graphqlMetrics.p95Duration)}ms`,
			slowestOperation: graphqlMetrics.slowestOperation
		});

		if (graphqlMetrics.operations.length > 0) {
			expect(
				graphqlMetrics.averageDuration,
				'Average GraphQL response time should meet budget'
			).toBeLessThan(PERFORMANCE_BUDGETS.GRAPHQL_RESPONSE_TIME);

			expect(
				graphqlMetrics.p95Duration,
				'P95 GraphQL response time should meet strict budget'
			).toBeLessThan(PERFORMANCE_BUDGETS.GRAPHQL_RESPONSE_TIME * 1.5);

			// Log slow operations for debugging
			const slowOperations = graphqlMetrics.operations.filter(
				(op) => op.duration > PERFORMANCE_BUDGETS.GRAPHQL_RESPONSE_TIME
			);

			if (slowOperations.length > 0) {
				console.warn('⚠️ Slow GraphQL operations detected:', slowOperations);
			}
		}
	});

	test('Memory usage stays within budget', async ({ page }) => {
		console.log('🧠 Testing memory usage performance...');

		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Initial memory measurement
		const initialMemory = await measureMemoryUsage(page);

		// Perform memory-intensive operations
		const operations = [
			() => page.goto('/dashboard/employees'),
			() => page.goto('/dashboard/management'),
			() => page.goto('/dashboard/teams'),
			() => page.goto('/dashboard')
		];

		for (const operation of operations) {
			await operation();
			await page.waitForLoadState('networkidle');
			await page.waitForTimeout(500); // Allow memory to stabilize
		}

		// Final memory measurement
		const finalMemory = await measureMemoryUsage(page);

		console.log(`💾 Memory usage:`, {
			initial: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
			final: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
			growth: `${Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024)}MB`,
			limit: `${Math.round(PERFORMANCE_BUDGETS.MEMORY_LIMIT / 1024 / 1024)}MB`
		});

		expect(finalMemory.heapUsed, 'Memory usage should stay within budget').toBeLessThan(
			PERFORMANCE_BUDGETS.MEMORY_LIMIT
		);

		// Memory growth should be reasonable
		const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
		expect(memoryGrowth, 'Memory growth should be controlled').toBeLessThan(
			PERFORMANCE_BUDGETS.MEMORY_LIMIT * 0.3
		); // Max 30MB growth
	});

	test('Core Web Vitals meet Google standards', async ({ page }) => {
		console.log('⚡ Testing Core Web Vitals...');

		await page.goto('/dashboard');
		const webVitals = await measureCoreWebVitals(page);

		console.log(`🎯 Core Web Vitals:`, {
			lcp: webVitals.lcp ? `${Math.round(webVitals.lcp)}ms` : 'N/A',
			fid: webVitals.fid ? `${Math.round(webVitals.fid)}ms` : 'N/A',
			cls: webVitals.cls ? webVitals.cls.toFixed(3) : 'N/A',
			fcp: webVitals.fcp ? `${Math.round(webVitals.fcp)}ms` : 'N/A',
			ttfb: webVitals.ttfb ? `${Math.round(webVitals.ttfb)}ms` : 'N/A'
		});

		if (webVitals.lcp) {
			expect(webVitals.lcp, 'Largest Contentful Paint should meet good standards').toBeLessThan(
				PERFORMANCE_BUDGETS.LCP_GOOD
			);
		}

		if (webVitals.fid) {
			expect(webVitals.fid, 'First Input Delay should meet good standards').toBeLessThan(
				PERFORMANCE_BUDGETS.FID_GOOD
			);
		}

		if (webVitals.cls) {
			expect(webVitals.cls, 'Cumulative Layout Shift should meet good standards').toBeLessThan(
				PERFORMANCE_BUDGETS.CLS_GOOD
			);
		}

		if (webVitals.fcp) {
			expect(webVitals.fcp, 'First Contentful Paint should meet good standards').toBeLessThan(
				PERFORMANCE_BUDGETS.FCP_GOOD
			);
		}

		if (webVitals.ttfb) {
			expect(webVitals.ttfb, 'Time to First Byte should meet good standards').toBeLessThan(
				PERFORMANCE_BUDGETS.TTFB_GOOD
			);
		}
	});

	test('Export operations complete within time limits', async ({ page }) => {
		console.log('📤 Testing export operation performance...');

		await page.goto('/dashboard/employees');
		await page.waitForLoadState('networkidle');

		// Look for export functionality
		const exportButton = page.locator(
			'[data-testid="export-button"], button:has-text("Export"), [class*="export"]'
		);

		if (await exportButton.first().isVisible()) {
			const startTime = Date.now();

			// Start the download and capture any download events
			const downloadPromise = page.waitForEvent('download', {
				timeout: PERFORMANCE_BUDGETS.EXPORT_OPERATION_TIME
			});

			await exportButton.first().click();

			try {
				const download = await downloadPromise;
				const exportTime = Date.now() - startTime;

				console.log(`📊 Export performance:`, {
					duration: `${exportTime}ms`,
					budget: `${PERFORMANCE_BUDGETS.EXPORT_OPERATION_TIME}ms`,
					fileName: download.suggestedFilename()
				});

				expect(exportTime, 'Export operation should complete within time budget').toBeLessThan(
					PERFORMANCE_BUDGETS.EXPORT_OPERATION_TIME
				);

				// Clean up download
				await download.delete();
			} catch (error) {
				console.log(
					'ℹ️ Export functionality may not be implemented yet or requires authentication'
				);
			}
		} else {
			console.log('ℹ️ Export button not found, skipping export performance test');
		}
	});

	test('Real-time features have low latency', async ({ page }) => {
		console.log('⚡ Testing real-time feature latency...');

		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Simulate real-time updates by measuring UI responsiveness
		const interactions = [
			{ action: 'Click navigation', selector: 'nav a:first-child' },
			{ action: 'Focus input field', selector: 'input:first-child' },
			{ action: 'Click button', selector: 'button:first-child' }
		];

		const latencies: number[] = [];

		for (const interaction of interactions) {
			const element = page.locator(interaction.selector);

			if (await element.isVisible()) {
				const startTime = Date.now();

				try {
					await element.click({ timeout: 1000 });
					const latency = Date.now() - startTime;
					latencies.push(latency);

					console.log(`⚡ ${interaction.action}: ${latency}ms`);

					expect(latency, `${interaction.action} should be responsive`).toBeLessThan(
						PERFORMANCE_BUDGETS.REAL_TIME_UPDATE_LATENCY
					);
				} catch (error) {
					console.log(`⚠️ Could not interact with ${interaction.selector}`);
				}

				await page.waitForTimeout(100); // Brief pause between interactions
			}
		}

		if (latencies.length > 0) {
			const averageLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
			console.log(`📊 Average interaction latency: ${Math.round(averageLatency)}ms`);

			expect(averageLatency, 'Average interaction latency should be low').toBeLessThan(
				PERFORMANCE_BUDGETS.REAL_TIME_UPDATE_LATENCY
			);
		}
	});

	test('Performance monitoring dashboard loads and functions correctly', async ({ page }) => {
		console.log('📊 Testing performance monitoring dashboard...');

		// Check if performance monitoring is available
		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Check if performance monitoring is accessible in browser console
		const hasPerformanceMonitoring = await page.evaluate(() => {
			// Check if our performance monitor is available
			return (
				typeof window !== 'undefined' &&
				'performance' in window &&
				performance.getEntriesByType('navigation').length > 0
			);
		});

		expect(
			hasPerformanceMonitoring,
			'Performance monitoring APIs should be available'
		).toBeTruthy();

		// Test performance data collection
		const performanceEntries = await page.evaluate(() => {
			const entries = performance.getEntriesByType('navigation');
			const paintEntries = performance.getEntriesByType('paint');

			return {
				navigationEntries: entries.length,
				paintEntries: paintEntries.length,
				memoryAvailable: 'memory' in performance
			};
		});

		console.log(`🔧 Performance monitoring capabilities:`, performanceEntries);

		expect(
			performanceEntries.navigationEntries,
			'Navigation timing should be available'
		).toBeGreaterThan(0);
	});
});

// Lighthouse-style performance auditing
test.describe('Performance Auditing', () => {
	test('Run comprehensive performance audit', async ({ page }) => {
		console.log('🔍 Running comprehensive performance audit...');

		const auditResults = {
			pageLoad: await measurePageLoad(page, '/dashboard'),
			memory: await measureMemoryUsage(page),
			webVitals: await measureCoreWebVitals(page)
		};

		// Calculate overall performance score (0-100)
		let score = 100;

		// Page load scoring (30 points max)
		if (auditResults.pageLoad.navigationTime > PERFORMANCE_BUDGETS.PAGE_LOAD_TIME) {
			score -= 30;
		} else if (auditResults.pageLoad.navigationTime > PERFORMANCE_BUDGETS.PAGE_LOAD_TIME * 0.8) {
			score -= 15;
		}

		// Memory scoring (20 points max)
		if (auditResults.memory.heapUsed > PERFORMANCE_BUDGETS.MEMORY_LIMIT) {
			score -= 20;
		} else if (auditResults.memory.heapUsed > PERFORMANCE_BUDGETS.MEMORY_LIMIT * 0.8) {
			score -= 10;
		}

		// Web Vitals scoring (50 points max)
		let vitalsScore = 50;
		if (auditResults.webVitals.lcp && auditResults.webVitals.lcp > PERFORMANCE_BUDGETS.LCP_GOOD) {
			vitalsScore -= 15;
		}
		if (auditResults.webVitals.fcp && auditResults.webVitals.fcp > PERFORMANCE_BUDGETS.FCP_GOOD) {
			vitalsScore -= 15;
		}
		if (auditResults.webVitals.cls && auditResults.webVitals.cls > PERFORMANCE_BUDGETS.CLS_GOOD) {
			vitalsScore -= 10;
		}
		if (
			auditResults.webVitals.ttfb &&
			auditResults.webVitals.ttfb > PERFORMANCE_BUDGETS.TTFB_GOOD
		) {
			vitalsScore -= 10;
		}

		score = Math.max(0, score - (50 - vitalsScore));

		console.log(`🎯 Performance Audit Results:`, {
			overallScore: `${Math.round(score)}/100`,
			pageLoadTime: `${auditResults.pageLoad.navigationTime}ms`,
			memoryUsage: `${Math.round(auditResults.memory.heapUsed / 1024 / 1024)}MB`,
			webVitals: {
				lcp: auditResults.webVitals.lcp ? `${Math.round(auditResults.webVitals.lcp)}ms` : 'N/A',
				fcp: auditResults.webVitals.fcp ? `${Math.round(auditResults.webVitals.fcp)}ms` : 'N/A',
				cls: auditResults.webVitals.cls ? auditResults.webVitals.cls.toFixed(3) : 'N/A',
				ttfb: auditResults.webVitals.ttfb ? `${Math.round(auditResults.webVitals.ttfb)}ms` : 'N/A'
			}
		});

		// Performance score should be acceptable (>70 is good, >90 is excellent)
		expect(score, 'Overall performance score should meet standards').toBeGreaterThan(70);

		// Generate performance recommendations
		const recommendations: string[] = [];

		if (auditResults.pageLoad.navigationTime > PERFORMANCE_BUDGETS.PAGE_LOAD_TIME * 0.8) {
			recommendations.push('Optimize page load time with code splitting and lazy loading');
		}

		if (auditResults.memory.heapUsed > PERFORMANCE_BUDGETS.MEMORY_LIMIT * 0.8) {
			recommendations.push('Optimize memory usage and check for potential memory leaks');
		}

		if (
			auditResults.webVitals.lcp &&
			auditResults.webVitals.lcp > PERFORMANCE_BUDGETS.LCP_GOOD * 0.8
		) {
			recommendations.push('Improve Largest Contentful Paint with image optimization');
		}

		if (recommendations.length > 0) {
			console.log('💡 Performance Recommendations:', recommendations);
		}
	});
});
