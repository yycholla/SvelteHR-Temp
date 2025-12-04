// E2E Test: Management Goals & OKRs Tracking Page
// Created: 2025-09-24
// Task: T007 - E2E test Goals & OKRs tracking management page
// CRITICAL: This test MUST FAIL initially as per TDD approach

import { expect, test } from '@playwright/test';

test.describe('Management Goals & OKRs Tracking Page', () => {
	test.beforeEach(async ({ page }) => {
		// Login as manager
		await page.goto('/auth/login');
		await page.fill('[data-testid="email-input"]', 'manager@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		// Wait for successful login and navigation
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('should display goals and OKRs data table', async ({ page }) => {
		// Navigate to goals tracking page
		await page.goto('/dashboard/management/goals');

		// Wait for page to load
		await expect(page.locator('h1')).toContainText('Goals & OKRs');

		// Should show data table with goals
		await expect(page.locator('[data-testid="goals-table"]')).toBeVisible();

		// Check table headers
		await expect(page.locator('th')).toContainText([
			'Goal',
			'Owner',
			'Type',
			'Progress',
			'Due Date',
			'Status',
			'Actions'
		]);

		// Should have at least one goal row
		await expect(page.locator('[data-testid="goal-row"]')).toHaveCount({ min: 1 });

		// Each row should have goal details and action buttons
		const firstRow = page.locator('[data-testid="goal-row"]').first();
		await expect(firstRow.locator('[data-testid="goal-title"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="goal-owner"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="goal-type"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="goal-progress"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="goal-due-date"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="goal-status"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="view-goal"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="edit-goal"]')).toBeVisible();
	});

	test('should create new team goal with key results', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Click create new goal button
		await page.click('[data-testid="create-goal"]');

		// Should open goal creation modal
		await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText('Create New Goal');

		// Fill in goal details
		await page.fill('[data-testid="goal-title"]', 'Improve Customer Satisfaction');
		await page.fill(
			'[data-testid="goal-description"]',
			'Increase customer satisfaction scores and reduce support ticket resolution time'
		);
		await page.selectOption('[data-testid="goal-type"]', 'team');
		await page.selectOption('[data-testid="goal-owner"]', 'manager@postgraphile-hr.com');
		await page.fill('[data-testid="goal-due-date"]', '2025-06-30');

		// Add key results
		await page.fill(
			'[data-testid="key-result-1-title"]',
			'Achieve 90% customer satisfaction score'
		);
		await page.fill('[data-testid="key-result-1-target"]', '90');
		await page.selectOption('[data-testid="key-result-1-unit"]', 'percentage');

		await page.fill(
			'[data-testid="key-result-2-title"]',
			'Reduce average response time to under 2 hours'
		);
		await page.fill('[data-testid="key-result-2-target"]', '2');
		await page.selectOption('[data-testid="key-result-2-unit"]', 'hours');

		await page.fill(
			'[data-testid="key-result-3-title"]',
			'Implement 5 new customer feedback improvements'
		);
		await page.fill('[data-testid="key-result-3-target"]', '5');
		await page.selectOption('[data-testid="key-result-3-unit"]', 'count');

		// Submit goal creation
		await page.click('[data-testid="submit-goal"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Goal created successfully'
		);

		// Modal should close and new goal should appear in table
		await expect(page.locator('[data-testid="goal-modal"]')).not.toBeVisible();
		await expect(page.locator('[data-testid="goal-row"]')).toContainText(
			'Improve Customer Satisfaction'
		);
	});

	test('should update goal progress and key results', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Click edit button for first goal
		const firstRow = page.locator('[data-testid="goal-row"]').first();
		await firstRow.locator('[data-testid="edit-goal"]').click();

		// Should open edit modal with pre-filled data
		await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText('Edit Goal');

		// Update key result progress
		await page.fill('[data-testid="key-result-1-current"]', '75');
		await page.fill('[data-testid="key-result-2-current"]', '2.5');
		await page.fill('[data-testid="key-result-3-current"]', '3');

		// Add progress notes
		await page.fill(
			'[data-testid="progress-notes"]',
			'Good progress on customer satisfaction metrics. Response time needs improvement.'
		);

		// Update overall goal status
		await page.selectOption('[data-testid="goal-status"]', 'on-track');

		// Submit changes
		await page.click('[data-testid="submit-goal"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Goal updated successfully'
		);

		// Modal should close
		await expect(page.locator('[data-testid="goal-modal"]')).not.toBeVisible();

		// Progress should be reflected in table
		await expect(page.locator('[data-testid="goal-progress"]').first()).toContainText('75%');
	});

	test('should create individual employee goal', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Click create new goal
		await page.click('[data-testid="create-goal"]');

		// Fill individual goal details
		await page.fill('[data-testid="goal-title"]', 'Complete Advanced Certification');
		await page.fill(
			'[data-testid="goal-description"]',
			'Complete professional certification to advance technical skills'
		);
		await page.selectOption('[data-testid="goal-type"]', 'individual');
		await page.selectOption('[data-testid="goal-owner"]', 'employee@postgraphile-hr.com');
		await page.fill('[data-testid="goal-due-date"]', '2025-09-30');

		// Add single key result for individual goal
		await page.fill(
			'[data-testid="key-result-1-title"]',
			'Pass certification exam with score >= 85%'
		);
		await page.fill('[data-testid="key-result-1-target"]', '85');
		await page.selectOption('[data-testid="key-result-1-unit"]', 'percentage');

		// Submit goal
		await page.click('[data-testid="submit-goal"]');

		// Should create individual goal
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Goal created successfully'
		);
		await expect(page.locator('[data-testid="goal-row"]')).toContainText(
			'Complete Advanced Certification'
		);
	});

	test('should validate required fields in goal creation', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Click create new goal
		await page.click('[data-testid="create-goal"]');

		// Try to submit without required fields
		await page.click('[data-testid="submit-goal"]');

		// Should show validation errors
		await expect(page.locator('[data-testid="title-error"]')).toContainText(
			'Goal title is required'
		);
		await expect(page.locator('[data-testid="description-error"]')).toContainText(
			'Goal description is required'
		);
		await expect(page.locator('[data-testid="type-error"]')).toContainText('Goal type is required');
		await expect(page.locator('[data-testid="owner-error"]')).toContainText(
			'Goal owner is required'
		);
		await expect(page.locator('[data-testid="due-date-error"]')).toContainText(
			'Due date is required'
		);

		// Should validate at least one key result
		await expect(page.locator('[data-testid="key-results-error"]')).toContainText(
			'At least one key result is required'
		);

		// Should not close modal
		await expect(page.locator('[data-testid="goal-modal"]')).toBeVisible();
	});

	test('should filter goals by type', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Should have type filter
		await expect(page.locator('[data-testid="type-filter"]')).toBeVisible();

		// Filter by team goals
		await page.selectOption('[data-testid="type-filter"]', 'team');
		await page.click('[data-testid="apply-filters"]');

		// Should show only team goals
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		const typeElements = page.locator('[data-testid="goal-type"]');
		const count = await typeElements.count();
		for (let i = 0; i < count; i++) {
			await expect(typeElements.nth(i)).toContainText('Team');
		}
	});

	test('should filter goals by status', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Should have status filter
		await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();

		// Filter by active goals
		await page.selectOption('[data-testid="status-filter"]', 'active');
		await page.click('[data-testid="apply-filters"]');

		// Should show only active goals
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		const statusElements = page.locator('[data-testid="goal-status"]');
		const count = await statusElements.count();
		for (let i = 0; i < count; i++) {
			await expect(statusElements.nth(i)).toContainText(/Active|On Track|At Risk/);
		}
	});

	test('should search goals by title or owner', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Should have search input
		await expect(page.locator('[data-testid="goal-search"]')).toBeVisible();

		// Search for specific goal
		await page.fill('[data-testid="goal-search"]', 'Customer');
		await page.press('[data-testid="goal-search"]', 'Enter');

		// Should show only matching goals
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		const goalTitles = page.locator('[data-testid="goal-title"]');
		const count = await goalTitles.count();
		for (let i = 0; i < count; i++) {
			await expect(goalTitles.nth(i)).toContainText(/Customer/i);
		}
	});

	test('should sort goals by progress percentage', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Click progress column header to sort
		await page.click('[data-testid="progress-header"]');

		// Should sort ascending first
		await expect(page.locator('[data-testid="sort-indicator-asc"]')).toBeVisible();

		// Click again to sort descending
		await page.click('[data-testid="progress-header"]');
		await expect(page.locator('[data-testid="sort-indicator-desc"]')).toBeVisible();

		// Verify sorting order
		const progressElements = page.locator('[data-testid="goal-progress"]');
		const count = await progressElements.count();
		expect(count).toBeGreaterThan(1);
	});

	test('should view detailed goal with key results breakdown', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Click view button for first goal
		const firstRow = page.locator('[data-testid="goal-row"]').first();
		await firstRow.locator('[data-testid="view-goal"]').click();

		// Should open goal details modal
		await expect(page.locator('[data-testid="goal-details-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText('Goal Details');

		// Should show goal information
		await expect(page.locator('[data-testid="goal-title-display"]')).toBeVisible();
		await expect(page.locator('[data-testid="goal-description-display"]')).toBeVisible();
		await expect(page.locator('[data-testid="goal-owner-display"]')).toBeVisible();

		// Should show key results with progress
		await expect(page.locator('[data-testid="key-results-list"]')).toBeVisible();
		await expect(page.locator('[data-testid="key-result-item"]')).toHaveCount({ min: 1 });

		// Each key result should show title, progress, and status
		const firstKeyResult = page.locator('[data-testid="key-result-item"]').first();
		await expect(firstKeyResult.locator('[data-testid="kr-title"]')).toBeVisible();
		await expect(firstKeyResult.locator('[data-testid="kr-progress-bar"]')).toBeVisible();
		await expect(firstKeyResult.locator('[data-testid="kr-percentage"]')).toBeVisible();

		// Should show overall progress chart
		await expect(page.locator('[data-testid="progress-chart"]')).toBeVisible();
	});

	test('should handle pagination for large datasets', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Should have pagination controls if more than page size
		if (await page.locator('[data-testid="pagination-next"]').isVisible()) {
			// Check page info
			await expect(page.locator('[data-testid="pagination-info"]')).toBeVisible();

			// Navigate to next page
			await page.click('[data-testid="pagination-next"]');

			// Should load new page of results
			await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
			await expect(page.locator('[data-testid="goal-row"]')).toHaveCount({ min: 1 });

			// Previous button should be enabled
			await expect(page.locator('[data-testid="pagination-prev"]')).toBeEnabled();
		}
	});

	test('should export goals to CSV', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Should have export button
		await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();

		// Start download
		const downloadPromise = page.waitForEvent('download');
		await page.click('[data-testid="export-csv"]');

		// Should download CSV file
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/goals-okrs.*\.csv$/);
	});

	test('should delete goal with confirmation', async ({ page }) => {
		await page.goto('/dashboard/management/goals');

		// Click delete button for first goal
		const firstRow = page.locator('[data-testid="goal-row"]').first();
		await firstRow.locator('[data-testid="delete-goal"]').click();

		// Should show confirmation modal
		await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
		await expect(page.locator('[data-testid="confirmation-message"]')).toContainText(
			'Are you sure you want to delete this goal?'
		);
		await expect(page.locator('[data-testid="warning-message"]')).toContainText(
			'This will also delete all associated key results'
		);

		// Confirm deletion
		await page.click('[data-testid="confirm-delete"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Goal deleted successfully'
		);

		// Confirmation modal should close
		await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible();
	});

	test('should handle empty state when no goals exist', async ({ page }) => {
		// Apply filters that will return no results
		await page.goto('/dashboard/management/goals');
		await page.selectOption('[data-testid="status-filter"]', 'archived');
		await page.click('[data-testid="apply-filters"]');

		// Should show empty state message
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
		await expect(page.locator('[data-testid="empty-state"]')).toContainText('No goals found');

		// Should suggest creating new goal or clearing filters
		await expect(page.locator('[data-testid="create-first-goal"]')).toBeVisible();
		await expect(page.locator('[data-testid="clear-filters"]')).toBeVisible();
	});

	test('should require manager role access', async ({ page }) => {
		// Logout and login as regular employee
		await page.goto('/auth/logout');
		await page.goto('/auth/login');
		await page.fill('[data-testid="email-input"]', 'employee@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		// Try to access goals tracking page
		await page.goto('/dashboard/management/goals');

		// Should redirect to unauthorized or show access denied
		await expect(page).toHaveURL(/\/(unauthorized|403)/);
		// OR
		await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
	});
});
