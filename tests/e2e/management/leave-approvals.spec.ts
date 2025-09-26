// E2E Test: Management Leave Approvals Page
// Created: 2025-09-24
// Task: T005 - E2E test Management Leave Approvals page
// CRITICAL: This test MUST FAIL initially as per TDD approach

import { test, expect } from '@playwright/test';

test.describe('Management Leave Approvals Page', () => {
	test.beforeEach(async ({ page }) => {
		// Login as manager
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'manager@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		// Wait for successful login and navigation
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('should display pending leave requests for manager approval', async ({ page }) => {
		// Navigate to leave approvals page
		await page.goto('/dashboard/management/leave-approvals');

		// Wait for page to load
		await expect(page.locator('h1')).toContainText('Leave Approvals');

		// Should show data table with pending requests
		await expect(page.locator('[data-testid="leave-approvals-table"]')).toBeVisible();

		// Check table headers
		await expect(page.locator('th')).toContainText([
			'Employee',
			'Leave Type',
			'Dates',
			'Days',
			'Status',
			'Actions'
		]);

		// Should have at least one pending request row
		await expect(page.locator('[data-testid="pending-request-row"]')).toHaveCount({ min: 1 });

		// Each row should have employee name, leave details, and action buttons
		const firstRow = page.locator('[data-testid="pending-request-row"]').first();
		await expect(firstRow.locator('[data-testid="employee-name"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="leave-type"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="leave-dates"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="days-requested"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="approve-button"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="deny-button"]')).toBeVisible();
	});

	test('should approve leave request with manager comments', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Click approve button for first pending request
		const firstRow = page.locator('[data-testid="pending-request-row"]').first();
		await firstRow.locator('[data-testid="approve-button"]').click();

		// Should open approval modal
		await expect(page.locator('[data-testid="approval-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText(
			'Approve Leave Request'
		);

		// Should show employee and request details
		await expect(page.locator('[data-testid="employee-details"]')).toBeVisible();
		await expect(page.locator('[data-testid="request-details"]')).toBeVisible();

		// Add manager comments
		await page.fill('[data-testid="manager-comments"]', 'Approved - team coverage arranged');

		// Confirm approval
		await page.click('[data-testid="confirm-approve"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Leave request approved successfully'
		);

		// Request should disappear from pending list or move to approved section
		await expect(page.locator('[data-testid="approval-modal"]')).not.toBeVisible();
	});

	test('should deny leave request with required manager comments', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Click deny button for first pending request
		const firstRow = page.locator('[data-testid="pending-request-row"]').first();
		await firstRow.locator('[data-testid="deny-button"]').click();

		// Should open denial modal
		await expect(page.locator('[data-testid="denial-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText('Deny Leave Request');

		// Try to deny without comments - should show validation error
		await page.click('[data-testid="confirm-deny"]');
		await expect(page.locator('[data-testid="comments-error"]')).toContainText(
			'Manager comments are required for denial'
		);

		// Add required manager comments
		await page.fill(
			'[data-testid="manager-comments"]',
			'Cannot approve due to project deadline conflicts'
		);

		// Confirm denial
		await page.click('[data-testid="confirm-deny"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Leave request denied'
		);

		// Modal should close
		await expect(page.locator('[data-testid="denial-modal"]')).not.toBeVisible();
	});

	test('should filter leave requests by date range', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Should have date filter controls
		await expect(page.locator('[data-testid="date-from-filter"]')).toBeVisible();
		await expect(page.locator('[data-testid="date-to-filter"]')).toBeVisible();

		// Set date range filter
		await page.fill('[data-testid="date-from-filter"]', '2025-01-01');
		await page.fill('[data-testid="date-to-filter"]', '2025-12-31');
		await page.click('[data-testid="apply-filters"]');

		// Should apply filters and update table
		await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		// All visible requests should be within date range
		const dateElements = page.locator('[data-testid="leave-dates"]');
		const count = await dateElements.count();
		expect(count).toBeGreaterThan(0);
	});

	test('should filter leave requests by leave type', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Should have leave type filter
		await expect(page.locator('[data-testid="leave-type-filter"]')).toBeVisible();

		// Select specific leave type
		await page.selectOption('[data-testid="leave-type-filter"]', 'annual');
		await page.click('[data-testid="apply-filters"]');

		// Should show only annual leave requests
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		const leaveTypes = page.locator('[data-testid="leave-type"]');
		const count = await leaveTypes.count();
		for (let i = 0; i < count; i++) {
			await expect(leaveTypes.nth(i)).toContainText('Annual');
		}
	});

	test('should search leave requests by employee name', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Should have search input
		await expect(page.locator('[data-testid="employee-search"]')).toBeVisible();

		// Search for specific employee
		await page.fill('[data-testid="employee-search"]', 'John');
		await page.press('[data-testid="employee-search"]', 'Enter');

		// Should show only matching employees
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		const employeeNames = page.locator('[data-testid="employee-name"]');
		const count = await employeeNames.count();
		for (let i = 0; i < count; i++) {
			await expect(employeeNames.nth(i)).toContainText(/John/i);
		}
	});

	test('should handle pagination for large datasets', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Should have pagination controls if more than page size
		if (await page.locator('[data-testid="pagination-next"]').isVisible()) {
			// Check page info
			await expect(page.locator('[data-testid="pagination-info"]')).toBeVisible();

			// Navigate to next page
			await page.click('[data-testid="pagination-next"]');

			// Should load new page of results
			await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
			await expect(page.locator('[data-testid="pending-request-row"]')).toHaveCount({ min: 1 });

			// Previous button should be enabled
			await expect(page.locator('[data-testid="pagination-prev"]')).toBeEnabled();
		}
	});

	test('should export leave requests to CSV', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Should have export button
		await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();

		// Start download
		const downloadPromise = page.waitForEvent('download');
		await page.click('[data-testid="export-csv"]');

		// Should download CSV file
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/leave-requests.*\.csv$/);
	});

	test('should handle empty state when no pending requests', async ({ page }) => {
		// Apply filters that will return no results
		await page.goto('/dashboard/management/leave-approvals');
		await page.fill('[data-testid="date-from-filter"]', '2020-01-01');
		await page.fill('[data-testid="date-to-filter"]', '2020-01-02');
		await page.click('[data-testid="apply-filters"]');

		// Should show empty state message
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
		await expect(page.locator('[data-testid="empty-state"]')).toContainText(
			'No pending leave requests found'
		);

		// Should suggest clearing filters
		await expect(page.locator('[data-testid="clear-filters"]')).toBeVisible();
	});

	test('should require manager role access', async ({ page }) => {
		// Logout and login as regular employee
		await page.goto('/logout');
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'employee@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		// Try to access leave approvals page
		await page.goto('/dashboard/management/leave-approvals');

		// Should redirect to unauthorized or show access denied
		await expect(page).toHaveURL(/\/(unauthorized|403)/);
		// OR
		await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
	});
});
