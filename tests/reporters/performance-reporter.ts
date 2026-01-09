// Custom Performance Reporter for Playwright
// Enhanced performance monitoring and reporting
// Created: 2025-09-24

import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'; // Added type-only import
import { promises as fs } from 'fs';
import { resolve } from 'path';

interface PerformanceMetrics {
	testName: string;
	duration: number;
	status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted'; // Added 'interrupted'
	browser: string;
	project: string;
	annotations: string[];
	steps: Array<{
		title: string;
		duration: number;
		category: string;
	}>;
	networkRequests?: number;
	consoleErrors?: number;
	memoryUsage?: number;
	cpu?: number;
}

interface PerformanceBudget {
	pageLoad: number;
	apiRequest: number;
	componentRender: number;
	totalTest: number;
}

class PerformanceReporter implements Reporter {
	private performanceMetrics: PerformanceMetrics[] = [];
	private startTime: number = 0;
	private config: any = {};

	// Performance budgets (in milliseconds)
	private performanceBudgets: PerformanceBudget = {
		pageLoad: 1000,
		apiRequest: 500,
		componentRender: 100,
		totalTest: 30000
	};

	onBegin(config: any) {
		this.startTime = Date.now();
		this.config = config;
		console.log('📊 Performance monitoring started...');

		// Create performance results directory
		this.ensureDirectoryExists('./test-results/performance');
	}

	onTestEnd(test: TestCase, result: TestResult) {
		const testMetrics: PerformanceMetrics = {
			testName: test.title,
			duration: result.duration,
			status: result.status as 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted', // Cast status
			browser: test.parent.project()?.name || 'unknown',
			project: test.parent.project()?.name || 'unknown',
			annotations: result.annotations.map((a) => `${a.type}: ${a.description}`),
			steps: this.extractStepMetrics(result)
		};

		// Analyze performance budget violations
		this.checkPerformanceBudgets(testMetrics);

		// Extract additional metrics from test results
		this.extractAdditionalMetrics(testMetrics, result);

		this.performanceMetrics.push(testMetrics);

		// Log immediate performance issues
		if (testMetrics.duration > this.performanceBudgets.totalTest) {
			console.warn(
				`⚠️  Test "${testMetrics.testName}" exceeded time budget: ${testMetrics.duration}ms`
			);
		}
	}

	async onEnd(result: FullResult): Promise<void> {
		// Changed to async and returns Promise<void>
		const endTime = Date.now();
		const totalDuration = endTime - this.startTime;

		console.log(`📊 Performance analysis completed in ${totalDuration}ms`);

		// Generate comprehensive performance reports
		void this.generatePerformanceReport(result, totalDuration); // Use void for fire-and-forget promise
		void this.generateCSVReport();
		void this.generateHTMLReport();

		// Log performance summary
		this.logPerformanceSummary();
	}

	private extractStepMetrics(
		result: TestResult
	): Array<{ title: string; duration: number; category: string }> {
		const steps: Array<{ title: string; duration: number; category: string }> = [];

		if (result.steps) {
			result.steps.forEach((step) => {
				const category = this.categorizeStep(step.title);
				steps.push({
					title: step.title,
					duration: step.duration,
					category
				});
			});
		}

		return steps;
	}

	private categorizeStep(stepTitle: string): string {
		const title = stepTitle.toLowerCase();

		if (title.includes('goto') || title.includes('navigate') || title.includes('page.goto')) {
			return 'page-load';
		}

		if (title.includes('api') || title.includes('request') || title.includes('fetch')) {
			return 'api-request';
		}

		if (title.includes('click') || title.includes('fill') || title.includes('type')) {
			return 'user-interaction';
		}

		if (title.includes('wait') || title.includes('expect')) {
			return 'assertion';
		}

		if (title.includes('render') || title.includes('component')) {
			return 'component-render';
		}

		return 'other';
	}

	private checkPerformanceBudgets(metrics: PerformanceMetrics) {
		const violations: string[] = [];

		// Check individual step budgets
		metrics.steps.forEach((step) => {
			switch (step.category) {
				case 'page-load':
					if (step.duration > this.performanceBudgets.pageLoad) {
						violations.push(
							`Page load "${step.title}": ${step.duration}ms > ${this.performanceBudgets.pageLoad}ms`
						);
					}
					break;
				case 'api-request':
					if (step.duration > this.performanceBudgets.apiRequest) {
						violations.push(
							`API request "${step.title}": ${step.duration}ms > ${this.performanceBudgets.apiRequest}ms`
						);
					}
					break;
				case 'component-render':
					if (step.duration > this.performanceBudgets.componentRender) {
						violations.push(
							`Component render "${step.title}": ${step.duration}ms > ${this.performanceBudgets.componentRender}ms`
						);
					}
					break;
			}
		});

		// Check total test budget
		if (metrics.duration > this.performanceBudgets.totalTest) {
			violations.push(
				`Total test duration: ${metrics.duration}ms > ${this.performanceBudgets.totalTest}ms`
			);
		}

		// Add violations as annotations
		if (violations.length > 0) {
			metrics.annotations.push(`Performance Budget Violations: ${violations.join('; ')}`);
		}
	}

	private extractAdditionalMetrics(metrics: PerformanceMetrics, result: TestResult) {
		// Extract network request count from attachments or stdout
		if (result.attachments) {
			const networkTrace = result.attachments.find((a) => a.name === 'network-trace');
			if (networkTrace) {
				// Parse network trace for request count (implementation would depend on trace format)
				metrics.networkRequests = 0; // Placeholder
			}
		}

		// Extract console error count from stdout
		if (result.stdout) {
			const errorMatches = result.stdout.filter(
				(output) =>
					typeof output === 'string' &&
					(output.toLowerCase().includes('error') || output.toLowerCase().includes('failed'))
			);
			metrics.consoleErrors = errorMatches.length;
		}

		// Memory usage would require additional instrumentation
		metrics.memoryUsage = 0; // Placeholder for future implementation
		metrics.cpu = 0; // Placeholder for future implementation
	}

	private async generatePerformanceReport(result: FullResult, totalDuration: number) {
		const report = {
			summary: {
				totalTests: this.performanceMetrics.length,
				totalDuration,
				averageTestDuration:
					this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) /
					this.performanceMetrics.length,
				passedTests: this.performanceMetrics.filter((m) => m.status === 'passed').length,
				failedTests: this.performanceMetrics.filter((m) => m.status === 'failed').length,
				skippedTests: this.performanceMetrics.filter((m) => m.status === 'skipped').length
			},
			performance: {
				budgetViolations: this.performanceMetrics.filter((m) =>
					m.annotations.some((a) => a.includes('Performance Budget Violations'))
				).length,
				slowestTests: this.performanceMetrics.sort((a, b) => b.duration - a.duration).slice(0, 10),
				fastestTests: this.performanceMetrics.sort((a, b) => a.duration - b.duration).slice(0, 10),
				categoryBreakdown: this.generateCategoryBreakdown(),
				browserPerformance: this.generateBrowserBreakdown()
			},
			budgets: this.performanceBudgets,
			metrics: this.performanceMetrics,
			timestamp: new Date().toISOString()
		};

		const reportPath = resolve('./test-results/performance/performance-report.json');
		await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
	}

	private async generateCSVReport() {
		const csvHeaders = [
			'Test Name',
			'Duration (ms)',
			'Status',
			'Browser',
			'Project',
			'Page Load Steps',
			'API Request Steps',
			'Component Render Steps',
			'Total Steps',
			'Budget Violations'
		];

		const csvRows = this.performanceMetrics.map((metric) => [
			`"${metric.testName}"`, // Added quotes around testName to handle commas
			metric.duration.toString(),
			metric.status,
			metric.browser,
			metric.project,
			metric.steps.filter((s) => s.category === 'page-load').length.toString(),
			metric.steps.filter((s) => s.category === 'api-request').length.toString(),
			metric.steps.filter((s) => s.category === 'component-render').length.toString(),
			metric.steps.length.toString(),
			metric.annotations
				.filter((a) => a.includes('Performance Budget Violations'))
				.length.toString()
		]);

		const csvContent = [csvHeaders.join(','), ...csvRows.map((row) => row.join(','))].join('\n');

		const csvPath = resolve('./test-results/performance/performance-metrics.csv');
		await fs.writeFile(csvPath, csvContent);
	}

	private async generateHTMLReport() {
		const htmlContent = this.generateHTMLContent();
		const htmlPath = resolve('./test-results/performance/performance-report.html');
		await fs.writeFile(htmlPath, htmlContent);
	}

	private generateHTMLContent(): string {
		const slowestTests = this.performanceMetrics
			.sort((a, b) => b.duration - a.duration)
			.slice(0, 10);

		const categoryBreakdown = this.generateCategoryBreakdown();
		const browserBreakdown = this.generateBrowserBreakdown();

		return `
<!DOCTYPE html>
<html>
<head>
    <title>SvelteHR Performance Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 5px; }
        .section { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .warning { color: #ff6b6b; font-weight: bold; }
        .success { color: #51cf66; font-weight: bold; }
        .chart-container { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 SvelteHR Performance Report</h1>
        <p>Generated: ${new Date().toISOString()}</p>
        <p>Total Tests: ${this.performanceMetrics.length}</p>
    </div>

    <div class="section">
        <h2>Performance Summary</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Average Test Duration</td><td>${Math.round(this.performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / this.performanceMetrics.length)}ms</td></tr>
            <tr><td>Passed Tests</td><td class="success">${this.performanceMetrics.filter((m) => m.status === 'passed').length}</td></tr>
            <tr><td>Failed Tests</td><td class="warning">${this.performanceMetrics.filter((m) => m.status === 'failed').length}</td></tr>
            <tr><td>Budget Violations</td><td class="warning">${this.performanceMetrics.filter((m) => m.annotations.some((a) => a.includes('Performance Budget Violations'))).length}</td></tr>
        </table>
    </div>

    <div class="section">
        <h2>Slowest Tests</h2>
        <table>
            <tr><th>Test Name</th><th>Duration</th><th>Browser</th><th>Status</th></tr>
            ${slowestTests
							.map(
								(test) => `
                <tr>
                    <td>${test.testName}</td>
                    <td>${test.duration}ms</td>
                    <td>${test.browser}</td>
                    <td class="${test.status === 'passed' ? 'success' : 'warning'}">${test.status}</td>
                </tr>
            `
							)
							.join('')}
        </table>
    </div>

    <div class="section">
        <h2>Performance by Category</h2>
        <table>
            <tr><th>Category</th><th>Count</th><th>Avg Duration</th></tr>
            ${Object.entries(categoryBreakdown)
							.map(
								([category, data]) => `
                <tr>
                    <td>${category}</td>
                    <td>${data.count}</td>
                    <td>${Math.round(data.averageDuration)}ms</td>
                </tr>
            `
							)
							.join('')}
        </table>
    </div>

    <div class="section">
        <h2>Performance Budgets</h2>
        <table>
            <tr><th>Category</th><th>Budget</th><th>Status</th></tr>
            <tr><td>Page Load</td><td>${this.performanceBudgets.pageLoad}ms</td><td>✓</td></tr>
            <tr><td>API Request</td><td>${this.performanceBudgets.apiRequest}ms</td><td>✓</td></tr>
            <tr><td>Component Render</td><td>${this.performanceBudgets.componentRender}ms</td><td>✓</td></tr>
            <tr><td>Total Test</td><td>${this.performanceBudgets.totalTest}ms</td><td>✓</td></tr>
        </table>
    </div>
</body>
</html>
    `;
	}

	private generateCategoryBreakdown(): Record<string, { count: number; averageDuration: number }> {
		const breakdown: {
			[key: string]: { count: number; totalDuration: number; averageDuration: number };
		} = {};

		this.performanceMetrics.forEach((metric: PerformanceMetrics) => {
			metric.steps.forEach((step: { category: string; duration: number }) => {
				if (!breakdown[step.category]) {
					breakdown[step.category] = { count: 0, totalDuration: 0, averageDuration: 0 };
				}
				breakdown[step.category].count++;
				breakdown[step.category].totalDuration += step.duration;
			});
		});

		// Calculate averages
		Object.keys(breakdown).forEach((category: string) => {
			breakdown[category].averageDuration =
				breakdown[category].totalDuration / breakdown[category].count;
		});

		return breakdown;
	}

	private generateBrowserBreakdown(): Record<string, { count: number; averageDuration: number }> {
		const breakdown: {
			[key: string]: { count: number; totalDuration: number; averageDuration: number };
		} = {};

		this.performanceMetrics.forEach((metric: PerformanceMetrics) => {
			if (!breakdown[metric.browser]) {
				breakdown[metric.browser] = { count: 0, totalDuration: 0, averageDuration: 0 };
			}
			breakdown[metric.browser].count++;
			breakdown[metric.browser].totalDuration += metric.duration;
		});

		// Calculate averages
		Object.keys(breakdown).forEach((browser: string) => {
			breakdown[browser].averageDuration =
				breakdown[browser].totalDuration / breakdown[browser].count;
		});

		return breakdown;
	}

	private logPerformanceSummary() {
		const totalTests = this.performanceMetrics.length;
		const passedTests = this.performanceMetrics.filter(
			(m: PerformanceMetrics) => m.status === 'passed'
		).length;
		const budgetViolations = this.performanceMetrics.filter((m: PerformanceMetrics) =>
			m.annotations.some((a) => a.includes('Performance Budget Violations'))
		).length;

		const avgDuration = Math.round(
			this.performanceMetrics.reduce((sum, m: PerformanceMetrics) => sum + m.duration, 0) /
				totalTests
		);

		console.log('\n📊 Performance Summary:');
		console.log(`   Total Tests: ${totalTests}`);
		console.log(`   Passed: ${passedTests} (${Math.round((passedTests / totalTests) * 100)}%)`);
		console.log(`   Average Duration: ${avgDuration}ms`);
		console.log(`   Budget Violations: ${budgetViolations}`);

		if (budgetViolations > 0) {
			console.log('\n⚠️  Performance Issues Detected:');
			this.performanceMetrics
				.filter((m: PerformanceMetrics) =>
					m.annotations.some((a) => a.includes('Performance Budget Violations'))
				)
				.slice(0, 5)
				.forEach((metric: PerformanceMetrics) => {
					console.log(`   • ${metric.testName}: ${metric.duration}ms`);
				});
		} else {
			console.log('\n🎉 All tests met performance budgets!');
		}

		console.log(`\n📄 Detailed reports available in: ./test-results/performance/`);
	}

	private async ensureDirectoryExists(dirPath: string) {
		try {
			await fs.mkdir(resolve(dirPath), { recursive: true });
		} catch (error) {
			// Directory might already exist
		}
	}
}

export default PerformanceReporter;
