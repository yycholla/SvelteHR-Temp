// Vitest Performance Test Setup
// Performance monitoring and benchmarking setup
// Created: 2025-09-24

import { afterAll, beforeAll } from 'vitest';
import {
	startPerformanceMonitoring,
	stopPerformanceMonitoring
} from '../utils/performance-monitor';
import './vitest-setup'; // Import base setup

beforeAll(() => {
	// Start performance monitoring
	startPerformanceMonitoring();
	console.log('Performance monitoring started for test suite...');
});

afterAll(() => {
	// Stop monitoring and generate report
	const report = stopPerformanceMonitoring();
	console.log('Performance test suite completed:');
	console.log(`- Total operations: ${report.totalTests}`);
	console.log(`- Average response time: ${Math.round(report.averageDuration)}ms`);
	console.log(
		`- Success rate: ${Math.round((report.performanceTargets.passed / (report.performanceTargets.passed + report.performanceTargets.failed)) * 100)}%`
	);
});
