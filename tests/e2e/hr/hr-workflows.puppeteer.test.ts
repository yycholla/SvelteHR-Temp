// E2E Test: HR Workflows (Puppeteer)
// Feature: 039-puppeteer-build-out - Phase 5 (T019)
// Purpose: Test HR workflow interactions - leave management, attendance, performance
//
// Puppeteer provides better Arch Linux support than Playwright

import { beforeEach, describe, expect, test } from 'vitest';
import {
	clickElement,
	countElements,
	fillInput,
	getElementText,
	gotoPage,
	isElementVisible,
	login,
	pageContainsText,
	waitFor,
	waitForElement
} from '../../utils/puppeteer-helpers';

describe('HR Workflows - Leave Management (Puppeteer)', () => {
	// Setup: Login as manager before tests
	beforeEach(async () => {
		await login('admin@mountainhr.dev', 'admin123');
	});

	test('manager can view leave requests table', async () => {
		await gotoPage('/dashboard/management/leave-approvals');

		// Wait for leave requests table to load
		await waitForElement('[data-testid="hr-leave-requests-table"]');

		// Verify table is visible
		const hasTable = await isElementVisible('[data-testid="hr-leave-requests-table"]');
		expect(hasTable).toBe(true);
	});

	test('manager can approve leave request', async () => {
		await gotoPage('/dashboard/management/leave-approvals');
		await waitForElement('[data-testid="hr-leave-requests-table"]');

		// Check if there are any pending requests
		const hasApproveButton = await isElementVisible('[data-testid="hr-approve-button"]');

		if (hasApproveButton) {
			// Click first approve button
			await clickElement('[data-testid="hr-approve-button"]');

			// Wait for action to complete
			await waitFor(1000);

			// Verify success message or status update
			const hasSuccessMessage =
				(await pageContainsText('approved')) || (await pageContainsText('Approved'));
			expect(hasSuccessMessage).toBe(true);
		} else {
			// No pending requests - verify empty state or all approved
			const hasEmptyState =
				(await pageContainsText('No pending')) || (await pageContainsText('no requests'));
			expect(hasEmptyState).toBe(true);
		}
	});

	test('manager can reject leave request', async () => {
		await gotoPage('/dashboard/management/leave-approvals');
		await waitForElement('[data-testid="hr-leave-requests-table"]');

		// Check if there are any pending requests
		const hasRejectButton = await isElementVisible('[data-testid="hr-reject-button"]');

		if (hasRejectButton) {
			// Click first reject button
			await clickElement('[data-testid="hr-reject-button"]');

			// Wait for action to complete
			await waitFor(1000);

			// Verify success message or status update
			const hasRejectMessage =
				(await pageContainsText('rejected')) || (await pageContainsText('Rejected'));
			expect(hasRejectMessage).toBe(true);
		} else {
			// No pending requests
			const hasEmptyState = await pageContainsText('No pending');
			expect(hasEmptyState).toBe(true);
		}
	});

	test('leave requests table shows request details', async () => {
		await gotoPage('/dashboard/management/leave-approvals');
		await waitForElement('[data-testid="hr-leave-requests-table"]');

		// Verify table has content
		const tableHasContent = await countElements('[data-testid="hr-leave-requests-table"] tr');

		if (tableHasContent > 0) {
			// Check for key columns
			const hasEmployeeName = await pageContainsText('Employee');
			const hasLeaveType = await pageContainsText('Type');
			const hasDates = await pageContainsText('Date');

			expect(hasEmployeeName || hasLeaveType || hasDates).toBe(true);
		}
	});
});

describe('HR Workflows - Employee Leave Requests (Puppeteer)', () => {
	beforeEach(async () => {
		await login('admin@mountainhr.dev', 'admin123');
	});

	test('employee can view leave balance cards', async () => {
		await gotoPage('/dashboard/profile/leave/requests');

		// Wait for leave balance cards
		await waitForElement('[data-testid="hr-leave-balance-card"]');

		// Verify balance cards are visible
		const hasBalanceCards = await isElementVisible('[data-testid="hr-leave-balance-card"]');
		expect(hasBalanceCards).toBe(true);

		// Check for balance information
		const hasBalanceInfo =
			(await pageContainsText('Available')) ||
			(await pageContainsText('balance')) ||
			(await pageContainsText('days'));
		expect(hasBalanceInfo).toBe(true);
	});

	test('employee can view leave request history', async () => {
		await gotoPage('/dashboard/profile/leave/requests');

		// Wait for leave requests table
		await waitForElement('[data-testid="hr-leave-requests-table"]');

		// Verify table is visible
		const hasTable = await isElementVisible('[data-testid="hr-leave-requests-table"]');
		expect(hasTable).toBe(true);
	});

	test('leave balance cards display different leave types', async () => {
		await gotoPage('/dashboard/profile/leave/requests');
		await waitForElement('[data-testid="hr-leave-balance-card"]');

		// Count leave balance cards (should have multiple types)
		const cardCount = await countElements('[data-testid="hr-leave-balance-card"]');
		expect(cardCount).toBeGreaterThanOrEqual(1);

		// Verify leave type names are displayed
		const hasLeaveTypes =
			(await pageContainsText('Annual')) ||
			(await pageContainsText('Sick')) ||
			(await pageContainsText('Personal')) ||
			(await pageContainsText('Vacation'));
		expect(hasLeaveTypes).toBe(true);
	});
});

describe('HR Workflows - Attendance Tracking (Puppeteer)', () => {
	beforeEach(async () => {
		await login('admin@mountainhr.dev', 'admin123');
	});

	test('employee can view attendance statistics', async () => {
		await gotoPage('/dashboard/profile/attendance');

		// Wait for attendance stats to load
		await waitForElement('[data-testid="hr-attendance-stats"]');

		// Verify stats are visible
		const hasStats = await isElementVisible('[data-testid="hr-attendance-stats"]');
		expect(hasStats).toBe(true);

		// Check for key metrics
		const hasMetrics =
			(await pageContainsText('Present')) ||
			(await pageContainsText('Absent')) ||
			(await pageContainsText('Late')) ||
			(await pageContainsText('Hours'));
		expect(hasMetrics).toBe(true);
	});

	test('employee can view attendance history', async () => {
		await gotoPage('/dashboard/profile/attendance');

		// Wait for attendance tab/table
		await waitForElement('[data-testid="hr-attendance-tab"]');

		// Verify attendance history is visible
		const hasHistory = await isElementVisible('[data-testid="hr-attendance-tab"]');
		expect(hasHistory).toBe(true);
	});

	test('attendance statistics show realistic data', async () => {
		await gotoPage('/dashboard/profile/attendance');
		await waitForElement('[data-testid="hr-attendance-stats"]');

		// Get attendance stats text
		const statsText = await getElementText('[data-testid="hr-attendance-stats"]');

		// Should contain numeric data
		const hasNumbers = /\d+/.test(statsText);
		expect(hasNumbers).toBe(true);

		// Should not contain placeholder text
		const hasPlaceholder =
			statsText.includes('Sample') || statsText.includes('Lorem') || statsText.includes('N/A');
		expect(hasPlaceholder).toBe(false);
	});

	test('attendance page loads without errors', async () => {
		await gotoPage('/dashboard/profile/attendance');

		// Verify no error messages
		const hasError =
			(await pageContainsText('500')) ||
			(await pageContainsText('Error')) ||
			(await pageContainsText('failed'));
		expect(hasError).toBe(false);

		// Verify page elements loaded
		const hasStats = await isElementVisible('[data-testid="hr-attendance-stats"]');
		const hasTab = await isElementVisible('[data-testid="hr-attendance-tab"]');
		expect(hasStats || hasTab).toBe(true);
	});
});

describe('HR Workflows - Performance Reviews (Puppeteer)', () => {
	beforeEach(async () => {
		await login('admin@mountainhr.dev', 'admin123');
	});

	test('employee can view performance statistics', async () => {
		await gotoPage('/dashboard/profile/performance');

		// Wait for performance stats
		await waitForElement('[data-testid="hr-performance-stats"]');

		// Verify stats are visible
		const hasStats = await isElementVisible('[data-testid="hr-performance-stats"]');
		expect(hasStats).toBe(true);

		// Check for performance metrics
		const hasMetrics =
			(await pageContainsText('Goal')) ||
			(await pageContainsText('Rating')) ||
			(await pageContainsText('Score')) ||
			(await pageContainsText('Review'));
		expect(hasMetrics).toBe(true);
	});

	test('employee can view performance goals', async () => {
		await gotoPage('/dashboard/profile/performance');

		// Wait for performance tab
		await waitForElement('[data-testid="hr-performance-tab"]');

		// Verify goals section is visible
		const hasGoals = await isElementVisible('[data-testid="hr-performance-tab"]');
		expect(hasGoals).toBe(true);
	});

	test('performance statistics display meaningful data', async () => {
		await gotoPage('/dashboard/profile/performance');
		await waitForElement('[data-testid="hr-performance-stats"]');

		// Get performance stats text
		const statsText = await getElementText('[data-testid="hr-performance-stats"]');

		// Should contain data
		expect(statsText.length).toBeGreaterThan(0);

		// Should not be obvious placeholders
		const hasPlaceholder =
			statsText.includes('Lorem ipsum') ||
			statsText.includes('Sample data') ||
			statsText.includes('N/A');
		expect(hasPlaceholder).toBe(false);
	});

	test('performance page layout is properly structured', async () => {
		await gotoPage('/dashboard/profile/performance');

		// Verify main sections are present
		const hasStats = await isElementVisible('[data-testid="hr-performance-stats"]');
		const hasTab = await isElementVisible('[data-testid="hr-performance-tab"]');

		// At least one section should be visible
		expect(hasStats || hasTab).toBe(true);

		// Page should not show errors
		const hasError = await pageContainsText('Error loading');
		expect(hasError).toBe(false);
	});
});

describe('HR Workflows - Cross-Feature Integration (Puppeteer)', () => {
	beforeEach(async () => {
		await login('admin@mountainhr.dev', 'admin123');
	});

	test('can navigate between HR workflow pages', async () => {
		// Start at leave requests
		await gotoPage('/dashboard/profile/leave/requests');
		await waitForElement('[data-testid="hr-leave-balance-card"]');

		// Navigate to attendance
		await gotoPage('/dashboard/profile/attendance');
		await waitForElement('[data-testid="hr-attendance-stats"]');

		// Navigate to performance
		await gotoPage('/dashboard/profile/performance');
		await waitForElement('[data-testid="hr-performance-stats"]');

		// All pages loaded successfully
		expect(true).toBe(true);
	});

	test('HR workflow pages maintain consistent layout', async () => {
		const pages = [
			'/dashboard/profile/leave/requests',
			'/dashboard/profile/attendance',
			'/dashboard/profile/performance'
		];

		for (const pagePath of pages) {
			await gotoPage(pagePath);
			await waitFor(500);

			// Each page should have a statistics section
			const hasStats =
				(await isElementVisible('[data-testid="hr-leave-balance-card"]')) ||
				(await isElementVisible('[data-testid="hr-attendance-stats"]')) ||
				(await isElementVisible('[data-testid="hr-performance-stats"]'));

			expect(hasStats).toBe(true);
		}
	});

	test('manager can access both approval and employee views', async () => {
		// Manager view - approvals
		await gotoPage('/dashboard/management/leave-approvals');
		await waitForElement('[data-testid="hr-leave-requests-table"]');
		const hasManagerView = await isElementVisible('[data-testid="hr-leave-requests-table"]');
		expect(hasManagerView).toBe(true);

		// Employee view - own requests
		await gotoPage('/dashboard/profile/leave/requests');
		await waitForElement('[data-testid="hr-leave-balance-card"]');
		const hasEmployeeView = await isElementVisible('[data-testid="hr-leave-balance-card"]');
		expect(hasEmployeeView).toBe(true);
	});
});
