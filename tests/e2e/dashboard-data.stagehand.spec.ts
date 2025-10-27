import { test, expect } from '@playwright/test';
import { z } from 'zod';
import {
	initStagehand,
	gotoPage,
	extractData,
	cleanupStagehand,
	CommonSchemas,
	createStagehandHelpers
} from '../utils/stagehand-helpers';

/**
 * E2E test for dashboard data display using Stagehand AI
 * Tests that real data is displayed instead of placeholders
 *
 * MIGRATION NOTE: This is the Stagehand version of dashboard-data.spec.ts
 * Benefits:
 * - More resilient to UI changes (no brittle selectors)
 * - Natural language makes tests more readable
 * - Automatic data extraction with type safety
 */

test.describe('Dashboard Data Display (Stagehand)', () => {
	test('should display real employee data instead of placeholders', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard');

			// Extract dashboard summary using AI
			const dashboardData = await extractData(stagehand, {
				instruction: 'Extract the employee count and department count from the dashboard summary',
				schema: CommonSchemas.dashboardSummary
			});

			// Should be within seed data range (40-50 employees)
			expect(dashboardData.employeeCount).toBeGreaterThanOrEqual(40);
			expect(dashboardData.employeeCount).toBeLessThanOrEqual(50);

			// Should not be obvious placeholder values
			expect(dashboardData.employeeCount).not.toBe(100);
			expect(dashboardData.employeeCount).not.toBe(1000);
			expect(dashboardData.employeeCount).not.toBe(999);

			// Should be within seed data range (10-15 departments)
			expect(dashboardData.departmentCount).toBeGreaterThanOrEqual(10);
			expect(dashboardData.departmentCount).toBeLessThanOrEqual(15);

			// Check for placeholder text using AI
			const placeholderCheck = await extractData(stagehand, {
				instruction: 'Check if the dashboard contains any placeholder text like "Lorem ipsum", "Placeholder", "Sample data", or "Mock data"',
				schema: z.object({
					hasPlaceholders: z.boolean().describe('True if placeholder text is found'),
					placeholderCount: z.number().describe('Number of placeholder instances found')
				})
			});

			expect(placeholderCheck.hasPlaceholders).toBe(false);
			expect(placeholderCheck.placeholderCount).toBe(0);

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('should show recent activities from database', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard');

			// Extract recent activities using AI
			const activitiesData = await extractData(stagehand, {
				instruction: 'Extract recent activities from the dashboard, including the activity description and any user names',
				schema: z.object({
					hasActivities: z.boolean().describe('True if activities section is visible'),
					activities: z.array(z.object({
						description: z.string().describe('Activity description'),
						userName: z.string().optional().describe('User name associated with activity'),
						timestamp: z.string().optional().describe('Activity timestamp')
					})).describe('List of recent activities')
				})
			});

			if (activitiesData.hasActivities && activitiesData.activities.length > 0) {
				// Check first 3 activities for realistic data
				const activitiesToCheck = activitiesData.activities.slice(0, 3);

				for (const activity of activitiesToCheck) {
					// Should not contain obvious placeholders
					expect(activity.description).not.toContain('Sample');
					expect(activity.description).not.toContain('Test');
					expect(activity.description).not.toContain('Placeholder');

					// Should have realistic usernames if present
					if (activity.userName) {
						expect(activity.userName).not.toContain('user123');
						expect(activity.userName).not.toContain('test@test.com');
					}
				}
			}

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('should display calculated metrics from real data', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard');

			// Extract metrics using AI
			const metricsData = await extractData(stagehand, {
				instruction: 'Extract all metrics from the dashboard including growth, retention, satisfaction percentages or rates',
				schema: z.object({
					hasMetrics: z.boolean().describe('True if metrics section is visible'),
					metrics: z.array(z.object({
						name: z.string().describe('Metric name (e.g., "Growth Rate", "Retention")'),
						value: z.string().describe('Metric value (percentage or number)'),
						isPercentage: z.boolean().describe('True if value is a percentage')
					})).describe('List of metrics displayed')
				})
			});

			if (metricsData.hasMetrics && metricsData.metrics.length > 0) {
				for (const metric of metricsData.metrics) {
					// Should not be obvious placeholder percentages
					expect(metric.value).not.toContain('99.9%');
					expect(metric.value).not.toContain('100%');
					expect(metric.value).not.toContain('12.34%');

					// Should contain realistic percentage or number
					const hasNumber = /\d+/.test(metric.value);
					expect(hasNumber).toBe(true);
				}
			}

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('should show proper empty states when data is minimal', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard');

			// Check for empty state messages using AI
			const emptyStatesData = await extractData(stagehand, {
				instruction: 'Find any sections that show "No data available", "No items", or "Nothing to show" messages. Check for upcoming events, pending approvals, and team announcements sections.',
				schema: z.object({
					emptySections: z.array(z.object({
						sectionName: z.string().describe('Name of the empty section'),
						emptyMessage: z.string().describe('The "no data" message displayed'),
						hasDataItems: z.boolean().describe('True if section has data items despite message')
					})).describe('List of sections with empty state messages')
				})
			});

			// Verify empty state messages are appropriate
			for (const section of emptyStatesData.emptySections) {
				if (!section.hasDataItems) {
					// Should show proper empty state message
					const hasValidEmptyMessage =
						section.emptyMessage.includes('No data available') ||
						section.emptyMessage.includes('No items') ||
						section.emptyMessage.includes('Nothing to show');

					expect(hasValidEmptyMessage).toBe(true);
				}
			}

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('should update data timestamps correctly', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard');

			// Extract timestamp information using AI
			const timestampData = await extractData(stagehand, {
				instruction: 'Find any "last updated" or timestamp information on the dashboard',
				schema: z.object({
					hasTimestamp: z.boolean().describe('True if timestamp is found'),
					timestamps: z.array(z.object({
						label: z.string().describe('Label for the timestamp (e.g., "Last Updated")'),
						value: z.string().describe('The timestamp value'),
						isRecent: z.boolean().describe('True if timestamp appears to be recent (current year)')
					})).optional()
				})
			});

			if (timestampData.hasTimestamp && timestampData.timestamps) {
				for (const timestamp of timestampData.timestamps) {
					// Should not show placeholder timestamps
					expect(timestamp.value).not.toContain('2023-01-01');
					expect(timestamp.value).not.toContain('January 1, 2000');
					expect(timestamp.value).not.toContain('Never');

					// Should contain recent date
					const now = new Date();
					const currentYear = now.getFullYear().toString();
					expect(timestamp.value).toContain(currentYear);
				}
			}

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('should display consistent data across page refreshes', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard');

			// Get initial data
			const initialData = await extractData(stagehand, {
				instruction: 'Extract the employee count',
				schema: z.object({
					employeeCount: z.number()
				})
			});

			// Refresh page
			await stagehand.page.reload({ waitUntil: 'networkidle' });

			// Get data after refresh
			const refreshedData = await extractData(stagehand, {
				instruction: 'Extract the employee count',
				schema: z.object({
					employeeCount: z.number()
				})
			});

			// Data should be consistent (from database, not random)
			expect(refreshedData.employeeCount).toBe(initialData.employeeCount);

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('should navigate to detail pages without errors', async () => {
		const stagehand = await initStagehand();

		try {
			await gotoPage(stagehand, '/dashboard');

			// Navigate to employees page using AI
			await stagehand.page.act('click on the link or button to view employees');

			// Wait for navigation
			await stagehand.page.waitForURL('**/employees**', { timeout: 10000 });

			// Check for errors
			const errorCheck = await extractData(stagehand, {
				instruction: 'Check if there are any error messages like "500" or "Internal Server Error" on the page',
				schema: z.object({
					hasErrors: z.boolean().describe('True if error messages are found'),
					errorMessage: z.string().optional().describe('The error message if found')
				})
			});

			expect(errorCheck.hasErrors).toBe(false);

			// Navigate back to dashboard
			await gotoPage(stagehand, '/dashboard');

			// Navigate to departments page using AI
			await stagehand.page.act('click on the link or button to view departments');

			// Wait for navigation
			await stagehand.page.waitForURL('**/departments**', { timeout: 10000 });

			// Check for errors again
			const secondErrorCheck = await extractData(stagehand, {
				instruction: 'Check if there are any error messages on the page',
				schema: z.object({
					hasErrors: z.boolean()
				})
			});

			expect(secondErrorCheck.hasErrors).toBe(false);

		} finally {
			await cleanupStagehand(stagehand);
		}
	});

	test('should verify data is not placeholder content (comprehensive check)', async () => {
		const stagehand = await initStagehand();
		const helpers = createStagehandHelpers(stagehand);

		try {
			await gotoPage(stagehand, '/dashboard');

			// Use helper to verify real data
			const dataVerification = await helpers.verifyRealData('dashboard content');

			expect(dataVerification.hasRealData).toBe(true);
			expect(dataVerification.containsPlaceholders).toBe(false);

			if (dataVerification.dataCount !== undefined) {
				expect(dataVerification.dataCount).toBeGreaterThan(0);
			}

		} finally {
			await cleanupStagehand(stagehand);
		}
	});
});
