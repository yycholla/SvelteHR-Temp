/**
 * E2E Test: Manager Leave Approvals Journey
 * Feature: 016-repair-management-pages - Task T010
 * CRITICAL: This test MUST FAIL initially as per TDD approach
 *
 * Tests the complete manager workflow for approving/rejecting leave requests
 * from their department only, with proper RBAC enforcement.
 *
 * Covers: FR-001, FR-002, FR-008, FR-009
 */

import { test, expect } from '@playwright/test';

test.describe('Manager Leave Approvals Journey', () => {
	test.beforeEach(async ({ page }) => {
		// Login as manager
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'manager@test.com');
		await page.fill('[data-testid="password-input"]', 'TestPassword123!');
		await page.click('[data-testid="login-submit"]');

		// Wait for successful login
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('manager can view and approve leave requests from their department', async ({ page }) => {
		// Step 1: Navigate to leave approvals page
		await page.goto('/dashboard/management/leave-approvals');
		await expect(page).toHaveURL(/\/leave-approvals/);

		// Step 2: Verify page shows department-scoped badge
		const departmentBadge = page.locator('[data-testid="department-badge"]');
		await expect(departmentBadge).toContainText('My Team');

		// Step 3: Verify pending requests table is visible
		const requestsTable = page.locator('[data-testid="leave-requests-table"]');
		await expect(requestsTable).toBeVisible();

		// Step 4: Verify table has correct headers
		const headers = requestsTable.locator('thead th');
		await expect(headers).toContainText(['Employee', 'Type', 'Dates', 'Days', 'Reason', 'Actions']);

		// Step 5: Find first pending request
		const firstRequest = requestsTable.locator('[data-testid^="leave-request-"]').first();
		await expect(firstRequest).toBeVisible();

		// Step 6: Click approve button
		const approveButton = firstRequest.locator('[data-testid="approve-button"]');
		await approveButton.click();

		// Step 7: Verify approval modal appears
		const approvalModal = page.locator('[data-testid="approval-modal"]');
		await expect(approvalModal).toBeVisible();

		// Step 8: Verify modal shows employee and request details
		await expect(approvalModal.locator('[data-testid="employee-name"]')).toBeVisible();
		await expect(approvalModal.locator('[data-testid="leave-dates"]')).toBeVisible();
		await expect(approvalModal.locator('[data-testid="leave-type"]')).toBeVisible();

		// Step 9: Fill review notes
		await page.fill(
			'[data-testid="review-notes"]',
			'Approved - team coverage confirmed for this period'
		);

		// Step 10: Submit approval
		await page.click('[data-testid="confirm-approval"]');

		// Step 11: Verify success toast notification
		const successToast = page.locator('[data-testid="success-toast"]');
		await expect(successToast).toBeVisible();
		await expect(successToast).toContainText('Leave request approved successfully');

		// Step 12: Verify modal closes
		await expect(approvalModal).not.toBeVisible();

		// Step 13: Verify request status updated in table
		await expect(firstRequest.locator('[data-testid="status-badge"]')).toContainText('Approved');
	});

	test('manager cannot see leave requests from other departments', async ({ page }) => {
		// Navigate to leave approvals page
		await page.goto('/dashboard/management/leave-approvals');

		// Get all visible leave request rows
		const requestRows = page.locator('[data-testid^="leave-request-"]');
		const count = await requestRows.count();

		// Each request should have department badge matching manager's department
		for (let i = 0; i < count; i++) {
			const row = requestRows.nth(i);
			const departmentBadge = row.locator('[data-testid="department-badge"]');

			// Should NOT show requests from other departments
			await expect(departmentBadge).not.toContainText('Other Department');
			await expect(departmentBadge).not.toContainText('Sales'); // Assuming manager is in Engineering

			// All requests should be from manager's department
			// This is enforced by RLS at database level
		}

		// Verify department filter shows only manager's department
		const departmentFilter = page.locator('[data-testid="department-filter"]');
		await expect(departmentFilter).toHaveValue('my-department');
		await expect(departmentFilter).toBeDisabled(); // Manager can't change this
	});

	test('manager can reject leave request with mandatory review notes', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Find first pending request
		const firstRequest = page.locator('[data-testid^="leave-request-"]').first();
		await firstRequest.locator('[data-testid="reject-button"]').click();

		// Verify rejection modal appears
		const rejectionModal = page.locator('[data-testid="rejection-modal"]');
		await expect(rejectionModal).toBeVisible();

		// Try to submit without review notes - should fail validation
		await page.click('[data-testid="confirm-rejection"]');
		await expect(page.locator('[data-testid="validation-error"]')).toContainText(
			'Review notes are required when rejecting a leave request'
		);

		// Fill mandatory review notes
		await page.fill(
			'[data-testid="review-notes"]',
			'Rejected - insufficient coverage during this period'
		);

		// Submit rejection
		await page.click('[data-testid="confirm-rejection"]');

		// Verify success notification
		const successToast = page.locator('[data-testid="success-toast"]');
		await expect(successToast).toBeVisible();
		await expect(successToast).toContainText('Leave request rejected');

		// Verify request status updated
		await expect(firstRequest.locator('[data-testid="status-badge"]')).toContainText('Rejected');
	});

	test('manager can view leave statistics for their department', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Verify statistics cards are visible
		const statsContainer = page.locator('[data-testid="leave-statistics"]');
		await expect(statsContainer).toBeVisible();

		// Check individual stat cards
		const pendingCard = statsContainer.locator('[data-testid="stat-pending"]');
		await expect(pendingCard).toBeVisible();
		await expect(pendingCard.locator('[data-testid="stat-label"]')).toContainText('Pending');
		await expect(pendingCard.locator('[data-testid="stat-value"]')).toBeVisible();

		const approvedCard = statsContainer.locator('[data-testid="stat-approved"]');
		await expect(approvedCard).toBeVisible();
		await expect(approvedCard.locator('[data-testid="stat-label"]')).toContainText('Approved');

		const rejectedCard = statsContainer.locator('[data-testid="stat-rejected"]');
		await expect(rejectedCard).toBeVisible();
		await expect(rejectedCard.locator('[data-testid="stat-label"]')).toContainText('Rejected');

		const approvalRateCard = statsContainer.locator('[data-testid="stat-approval-rate"]');
		await expect(approvalRateCard).toBeVisible();
		await expect(approvalRateCard.locator('[data-testid="stat-label"]')).toContainText(
			'Approval Rate'
		);

		// Statistics should be department-scoped (no organization-wide data)
		await expect(statsContainer.locator('[data-testid="department-scope-indicator"]')).toContainText(
			'My Department'
		);
	});

	test('manager can filter leave requests by status', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Select "Pending" filter
		await page.selectOption('[data-testid="status-filter"]', 'pending');
		const requestRows = page.locator('[data-testid^="leave-request-"]');
		const pendingCount = await requestRows.count();

		// All visible requests should have "Pending" status
		for (let i = 0; i < pendingCount; i++) {
			const statusBadge = requestRows.nth(i).locator('[data-testid="status-badge"]');
			await expect(statusBadge).toContainText('Pending');
		}

		// Select "Approved" filter
		await page.selectOption('[data-testid="status-filter"]', 'approved');
		const approvedRows = page.locator('[data-testid^="leave-request-"]');
		const approvedCount = await approvedRows.count();

		// All visible requests should have "Approved" status
		for (let i = 0; i < approvedCount; i++) {
			const statusBadge = approvedRows.nth(i).locator('[data-testid="status-badge"]');
			await expect(statusBadge).toContainText('Approved');
		}
	});

	test('manager can search for leave requests by employee name', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Type employee name in search box
		await page.fill('[data-testid="employee-search"]', 'John Doe');

		// Wait for search results to update
		await page.waitForTimeout(500); // Debounce delay

		// Verify filtered results
		const requestRows = page.locator('[data-testid^="leave-request-"]');
		const count = await requestRows.count();

		if (count > 0) {
			// All visible requests should match search term
			for (let i = 0; i < count; i++) {
				const employeeName = requestRows.nth(i).locator('[data-testid="employee-name"]');
				await expect(employeeName).toContainText(/John Doe/i);
			}
		} else {
			// No results message should appear
			await expect(page.locator('[data-testid="no-results"]')).toContainText(
				'No leave requests found'
			);
		}
	});

	test('manager sees department badge indicator in sidebar navigation', async ({ page }) => {
		await page.goto('/dashboard/management/leave-approvals');

		// Check sidebar navigation
		const navItem = page.locator('[data-testid="nav-leave-approvals"]');
		await expect(navItem).toBeVisible();

		// Manager should see "My Team" badge
		const badge = navItem.locator('[data-testid="nav-badge"]');
		await expect(badge).toBeVisible();
		await expect(badge).toContainText('My Team');
		await expect(badge).toHaveClass(/badge-blue/); // Blue badge for managers
	});

	test('manager without department assignment sees appropriate error', async ({ page }) => {
		// This test validates FR-049
		// Note: Requires test user setup with manager role but no department

		// Login as manager without department
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'manager-no-dept@test.com');
		await page.fill('[data-testid="password-input"]', 'TestPassword123!');
		await page.click('[data-testid="login-submit"]');

		// Attempt to access management page
		await page.goto('/dashboard/management/leave-approvals');

		// Should see error message
		const errorBanner = page.locator('[data-testid="error-banner"]');
		await expect(errorBanner).toBeVisible();
		await expect(errorBanner).toContainText(
			'No department assigned. Please contact an administrator to assign you to a department.'
		);

		// Data table should not be visible
		await expect(page.locator('[data-testid="leave-requests-table"]')).not.toBeVisible();
	});
});
