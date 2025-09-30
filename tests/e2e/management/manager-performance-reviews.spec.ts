/**
 * E2E Test: Manager Performance Reviews Journey
 * Feature: 016-repair-management-pages - Task T011
 * CRITICAL: This test MUST FAIL initially as per TDD approach
 *
 * Tests the complete manager workflow for creating, editing, and deleting
 * performance reviews for team members in their department only.
 *
 * Covers: FR-003, FR-014
 */

import { test, expect } from '@playwright/test';

test.describe('Manager Performance Reviews Journey', () => {
	test.beforeEach(async ({ page }) => {
		// Login as manager
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'manager@test.com');
		await page.fill('[data-testid="password-input"]', 'TestPassword123!');
		await page.click('[data-testid="login-submit"]');

		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('manager can create performance review for team member', async ({ page }) => {
		// Navigate to performance reviews page
		await page.goto('/dashboard/management/reviews');
		await expect(page).toHaveURL(/\/reviews/);

		// Verify "My Team" badge indicator
		const badge = page.locator('[data-testid="department-badge"]');
		await expect(badge).toContainText('My Team');

		// Click "Create Review" button
		await page.click('[data-testid="create-review-button"]');

		// Verify create review modal appears
		const modal = page.locator('[data-testid="create-review-modal"]');
		await expect(modal).toBeVisible();

		// Select employee from dropdown (should only show team members)
		await page.click('[data-testid="employee-select"]');
		await page.click('[data-testid="employee-option-john-doe"]');

		// Fill review period
		await page.selectOption('[data-testid="review-period"]', 'Q4 2025');

		// Fill review form
		await page.fill('[data-testid="overall-rating"]', '4.5');
		await page.fill('[data-testid="goals-achievement"]', '4.0');
		await page.fill('[data-testid="collaboration"]', '5.0');
		await page.fill('[data-testid="communication"]', '4.0');
		await page.fill('[data-testid="leadership"]', '4.5');

		await page.fill(
			'[data-testid="strengths"]',
			'Excellent technical skills, strong team player, takes initiative on complex problems'
		);
		await page.fill(
			'[data-testid="areas-for-improvement"]',
			'Could improve documentation practices and knowledge sharing'
		);
		await page.fill(
			'[data-testid="comments"]',
			'Consistently delivers high-quality work. Ready for senior role.'
		);

		// Submit review
		await page.click('[data-testid="submit-review"]');

		// Verify success notification
		const toast = page.locator('[data-testid="success-toast"]');
		await expect(toast).toBeVisible();
		await expect(toast).toContainText('Performance review created successfully');

		// Verify review appears in table
		const reviewsTable = page.locator('[data-testid="reviews-table"]');
		const newReview = reviewsTable.locator('[data-testid^="review-"]').first();
		await expect(newReview.locator('[data-testid="employee-name"]')).toContainText('John Doe');
		await expect(newReview.locator('[data-testid="review-period"]')).toContainText('Q4 2025');
		await expect(newReview.locator('[data-testid="overall-rating"]')).toContainText('4.5');
	});

	test('manager can edit existing performance review', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');

		// Find first review in table
		const firstReview = page.locator('[data-testid^="review-"]').first();
		await firstReview.locator('[data-testid="edit-button"]').click();

		// Verify edit modal appears with pre-filled data
		const modal = page.locator('[data-testid="edit-review-modal"]');
		await expect(modal).toBeVisible();

		// Verify fields are pre-populated
		await expect(page.locator('[data-testid="overall-rating"]')).toHaveValue(/\d+\.\d+/);

		// Update ratings
		await page.fill('[data-testid="overall-rating"]', '5.0');
		await page.fill('[data-testid="communication"]', '5.0');

		// Update comments
		await page.fill(
			'[data-testid="comments"]',
			'Updated: Exceeded expectations in all areas this quarter'
		);

		// Submit update
		await page.click('[data-testid="update-review"]');

		// Verify success notification
		await expect(page.locator('[data-testid="success-toast"]')).toContainText(
			'Performance review updated successfully'
		);

		// Verify updated values in table
		await expect(firstReview.locator('[data-testid="overall-rating"]')).toContainText('5.0');
	});

	test('manager can delete performance review', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');

		// Get initial row count
		const initialRows = page.locator('[data-testid^="review-"]');
		const initialCount = await initialRows.count();

		// Find first review and click delete
		const firstReview = initialRows.first();
		const employeeName = await firstReview.locator('[data-testid="employee-name"]').textContent();

		await firstReview.locator('[data-testid="delete-button"]').click();

		// Verify confirmation dialog
		const confirmDialog = page.locator('[data-testid="confirm-delete-dialog"]');
		await expect(confirmDialog).toBeVisible();
		await expect(confirmDialog).toContainText(
			`Are you sure you want to delete the performance review for ${employeeName}?`
		);

		// Confirm deletion
		await page.click('[data-testid="confirm-delete"]');

		// Verify success notification
		await expect(page.locator('[data-testid="success-toast"]')).toContainText(
			'Performance review deleted successfully'
		);

		// Verify row count decreased
		const updatedRows = page.locator('[data-testid^="review-"]');
		const updatedCount = await updatedRows.count();
		expect(updatedCount).toBe(initialCount - 1);
	});

	test('manager can view performance statistics for their department', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');

		// Verify statistics section
		const stats = page.locator('[data-testid="performance-statistics"]');
		await expect(stats).toBeVisible();

		// Check stat cards
		await expect(stats.locator('[data-testid="stat-total-reviews"]')).toBeVisible();
		await expect(stats.locator('[data-testid="stat-completed-reviews"]')).toBeVisible();
		await expect(stats.locator('[data-testid="stat-overdue-reviews"]')).toBeVisible();
		await expect(stats.locator('[data-testid="stat-completion-rate"]')).toBeVisible();

		// Check average ratings section
		const avgRatings = stats.locator('[data-testid="average-ratings"]');
		await expect(avgRatings).toBeVisible();
		await expect(avgRatings.locator('[data-testid="avg-overall"]')).toBeVisible();
		await expect(avgRatings.locator('[data-testid="avg-goals-achievement"]')).toBeVisible();
		await expect(avgRatings.locator('[data-testid="avg-collaboration"]')).toBeVisible();
	});

	test('manager can filter reviews by status', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');

		// Filter by "In Progress"
		await page.selectOption('[data-testid="status-filter"]', 'in_progress');

		const rows = page.locator('[data-testid^="review-"]');
		const count = await rows.count();

		// All visible reviews should have "In Progress" status
		for (let i = 0; i < count; i++) {
			const statusBadge = rows.nth(i).locator('[data-testid="status-badge"]');
			await expect(statusBadge).toContainText('In Progress');
		}
	});

	test('manager can filter reviews by period', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');

		// Filter by "Q4 2025"
		await page.selectOption('[data-testid="period-filter"]', 'Q4 2025');

		const rows = page.locator('[data-testid^="review-"]');
		const count = await rows.count();

		// All visible reviews should be for Q4 2025
		for (let i = 0; i < count; i++) {
			const period = rows.nth(i).locator('[data-testid="review-period"]');
			await expect(period).toContainText('Q4 2025');
		}
	});

	test('manager cannot create review for employee in other department', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');

		// Click create review
		await page.click('[data-testid="create-review-button"]');

		// Open employee dropdown
		await page.click('[data-testid="employee-select"]');

		// Employee dropdown should ONLY show team members from manager's department
		const employeeOptions = page.locator('[data-testid^="employee-option-"]');
		const count = await employeeOptions.count();

		// Verify all options have same department badge
		for (let i = 0; i < count; i++) {
			const option = employeeOptions.nth(i);
			// Should not show employees from other departments
			await expect(option).not.toHaveAttribute('data-department', 'other-department');
		}

		// If manager tries to manually submit with employee from other department (via API)
		// The GraphQL mutation should fail with permission error (tested in contract tests)
	});

	test('manager sees validation errors for invalid rating values', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');
		await page.click('[data-testid="create-review-button"]');

		// Select employee
		await page.click('[data-testid="employee-select"]');
		await page.click('[data-testid="employee-option-john-doe"]');

		// Try to enter invalid ratings
		await page.fill('[data-testid="overall-rating"]', '6.0'); // Invalid - exceeds max
		await page.fill('[data-testid="goals-achievement"]', '-1.0'); // Invalid - below min

		// Try to submit
		await page.click('[data-testid="submit-review"]');

		// Should see validation errors
		await expect(page.locator('[data-testid="rating-error-overall"]')).toContainText(
			'Rating must be between 1.0 and 5.0'
		);
		await expect(page.locator('[data-testid="rating-error-goals"]')).toContainText(
			'Rating must be between 1.0 and 5.0'
		);

		// Modal should remain open
		await expect(page.locator('[data-testid="create-review-modal"]')).toBeVisible();
	});

	test('manager navigation shows "My Team" badge for reviews page', async ({ page }) => {
		await page.goto('/dashboard/management/reviews');

		// Check sidebar navigation
		const navItem = page.locator('[data-testid="nav-reviews"]');
		await expect(navItem).toBeVisible();

		const badge = navItem.locator('[data-testid="nav-badge"]');
		await expect(badge).toContainText('My Team');
		await expect(badge).toHaveClass(/badge-blue/);
	});
});
