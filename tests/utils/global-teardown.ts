// Global Test Teardown for Playwright
// Database cleanup and test environment restoration
// Created: 2025-09-24

import { FullConfig } from '@playwright/test';
import { DatabaseTestUtils } from './test-helpers';
import { performanceMonitor } from './performance-monitor';
import { promises as fs } from 'fs';
import { resolve } from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global test teardown...');

  try {
    // Get test context for cleanup
    const testContextStr = process.env.TEST_CONTEXT;
    let testContext = null;

    if (testContextStr) {
      try {
        testContext = JSON.parse(testContextStr);
      } catch (error) {
        console.warn('⚠️  Failed to parse test context for cleanup');
      }
    }

    // Clean up test data
    if (testContext) {
      const { cleanupTestData } = await import('./test-helpers');
      await cleanupTestData(testContext);
      console.log('✅ Test data cleaned up');
    }

    // Clean up test database
    await DatabaseTestUtils.cleanupTestDatabase();
    console.log('✅ Test database cleaned up');

    // Generate final performance report
    if (performanceMonitor) {
      try {
        const performanceReport = performanceMonitor.stopMonitoring();
        await generatePerformanceReport(performanceReport);
        console.log('✅ Performance report generated');
      } catch (error) {
        console.warn('⚠️  Failed to generate performance report:', error);
      }
    }

    // Clean up authentication state files
    await cleanupAuthStates();
    console.log('✅ Authentication states cleaned up');

    // Clean up temporary test files
    await cleanupTempFiles();
    console.log('✅ Temporary files cleaned up');

    console.log('🎉 Global test teardown completed successfully');
  } catch (error) {
    console.error('❌ Global test teardown failed:', error);
    // Don't exit with error code in teardown to avoid masking test failures
  }
}

async function generatePerformanceReport(report: any) {
  const reportPath = resolve('./test-results/performance-summary.json');

  const summaryReport = {
    timestamp: new Date().toISOString(),
    totalTests: report.totalTests,
    averageResponseTime: Math.round(report.averageResponseTime * 100) / 100,
    medianResponseTime: Math.round(report.medianDuration * 100) / 100,
    p95ResponseTime: Math.round(report.p95Duration * 100) / 100,
    p99ResponseTime: Math.round(report.p99Duration * 100) / 100,
    successRate: Math.round(report.performanceTargets.passed /
      (report.performanceTargets.passed + report.performanceTargets.failed) * 10000) / 100,
    memoryUsage: {
      peakHeapUsed: Math.round(report.memoryUsage.peak.heapUsed / 1024 / 1024 * 100) / 100, // MB
      avgHeapUsed: Math.round(report.memoryUsage.average.heapUsed / 1024 / 1024 * 100) / 100, // MB
      finalHeapUsed: Math.round(report.memoryUsage.final.heapUsed / 1024 / 1024 * 100) / 100, // MB
    },
    performanceIssues: report.performanceTargets.warnings,
    slowestOperation: report.slowestTest ? {
      name: report.slowestTest.name,
      duration: Math.round(report.slowestTest.duration * 100) / 100,
      tags: report.slowestTest.tags,
    } : null,
    fastestOperation: report.fastestTest ? {
      name: report.fastestTest.name,
      duration: Math.round(report.fastestTest.duration * 100) / 100,
      tags: report.fastestTest.tags,
    } : null,
  };

  try {
    await fs.mkdir('./test-results', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(summaryReport, null, 2));

    // Also generate a human-readable report
    const readableReport = generateReadablePerformanceReport(summaryReport);
    await fs.writeFile('./test-results/performance-summary.txt', readableReport);
  } catch (error) {
    console.warn('⚠️  Failed to write performance report:', error);
  }
}

function generateReadablePerformanceReport(report: any): string {
  const lines = [
    '# SvelteHR Test Performance Report',
    `Generated: ${report.timestamp}`,
    '',
    '## Overview',
    `• Total Operations: ${report.totalTests}`,
    `• Success Rate: ${report.successRate}%`,
    `• Average Response Time: ${report.averageResponseTime}ms`,
    `• Median Response Time: ${report.medianResponseTime}ms`,
    `• 95th Percentile: ${report.p95ResponseTime}ms`,
    `• 99th Percentile: ${report.p99ResponseTime}ms`,
    '',
    '## Memory Usage',
    `• Peak Heap: ${report.memoryUsage.peakHeapUsed}MB`,
    `• Average Heap: ${report.memoryUsage.avgHeapUsed}MB`,
    `• Final Heap: ${report.memoryUsage.finalHeapUsed}MB`,
    '',
  ];

  if (report.slowestOperation) {
    lines.push('## Performance Extremes');
    lines.push(`• Slowest: ${report.slowestOperation.name} (${report.slowestOperation.duration}ms)`);
    if (report.fastestOperation) {
      lines.push(`• Fastest: ${report.fastestOperation.name} (${report.fastestOperation.duration}ms)`);
    }
    lines.push('');
  }

  if (report.performanceIssues.length > 0) {
    lines.push('## Performance Issues');
    report.performanceIssues.forEach((issue: string) => {
      lines.push(`• ${issue}`);
    });
    lines.push('');
  } else {
    lines.push('## Performance Issues');
    lines.push('🎉 No performance issues detected!');
    lines.push('');
  }

  lines.push('## Performance Targets');
  lines.push('• GraphQL Response Time: <200ms');
  lines.push('• Page Load Time: <1000ms');
  lines.push('• Component Render Time: <50ms');
  lines.push('• Database Query Time: <100ms');
  lines.push('• API Request Time: <500ms');

  return lines.join('\n');
}

async function cleanupAuthStates() {
  const authDir = './tests/.auth';

  try {
    const authFiles = [
      'admin-auth.json',
      'hr-manager-auth.json',
      'manager-auth.json',
      'employee-auth.json'
    ];

    await Promise.all(
      authFiles.map(async (file) => {
        try {
          await fs.unlink(resolve(authDir, file));
        } catch (error) {
          // File might not exist, which is fine
        }
      })
    );

    // Remove auth directory if empty
    try {
      await fs.rmdir(authDir);
    } catch (error) {
      // Directory might not be empty or might not exist
    }
  } catch (error) {
    console.warn('⚠️  Failed to cleanup auth states:', error);
  }
}

async function cleanupTempFiles() {
  const tempPaths = [
    './test-results/temp',
    './playwright-report/temp',
    './coverage/temp',
  ];

  await Promise.all(
    tempPaths.map(async (path) => {
      try {
        await fs.rm(resolve(path), { recursive: true, force: true });
      } catch (error) {
        // Path might not exist, which is fine
      }
    })
  );
}

export default globalTeardown;