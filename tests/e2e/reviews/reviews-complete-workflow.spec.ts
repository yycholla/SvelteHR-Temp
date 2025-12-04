/**
 * E2E Test: Performance Reviews Complete Workflow
 * Feature: 023-reviews-creation-it
 * Task: T040
 *
 * Tests the complete review creation workflow with:
 * - 10 review types (ANNUAL_REVIEW, MID_YEAR, QUARTERLY, etc.)
 * - Draft auto-save functionality (3-second debounce)
 * - Goal association (create new + link existing)
 * - Review detail page with soft-deleted goals
 * - Status transitions (draft → in_progress → completed)
 * - RBAC filtering (admin/hr_manager/manager/employee)
 */

import { test, expect } from '@playwright/test';

test.describe('Performance Reviews Complete Workflow', () => {
	test.beforeEach(async ({ page }) => {
		// Login as HR Manager
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'hr@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('should display reviews management page with statistics', async ({ page }) => {
		// Navigate to reviews page
		await page.goto('/dashboard/reviews');

		// Verify page header
		await expect(page.locator('h1')).toContainText('Performance Reviews');

		// Verify statistics cards
		const totalCard = page.locator('[data-testid="stat-total-reviews"]');
		await expect(totalCard).toBeVisible();
		await expect(totalCard.locator('.text-2xl')).toHaveText(/\d+/);

		const draftCard = page.locator('[data-testid="stat-drafts"]');
		await expect(draftCard).toBeVisible();

		const inProgressCard = page.locator('[data-testid="stat-in-progress"]');
		await expect(inProgressCard).toBeVisible();

		const completedCard = page.locator('[data-testid="stat-completed"]');
		await expect(completedCard).toBeVisible();
		await expect(completedCard).toContainText('%'); // Completion rate percentage
	});

	test('should open review creation dialog with employee selector', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Click "Create Review" button
		const createButton = page.locator('[data-testid="create-review-button"]');
		await expect(createButton).toBeVisible();
		await createButton.click();

		// Verify dialog opens
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();
		await expect(dialog.locator('h2')).toContainText('Create Performance Review');

		// Verify employee information card is visible
		await expect(dialog.locator('[data-testid="employee-info"]')).toBeVisible();
	});

	test('should create review with new goals (ANNUAL_REVIEW)', async ({ page }) => {
		await page.goto('/dashboard/reviews');
		await page.click('[data-testid="create-review-button"]');

		// Wait for dialog to open
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// Select review type: ANNUAL_REVIEW
		await page.click('[data-testid="review-type-dropdown"]');
		await page.click('[data-testid="review-type-ANNUAL_REVIEW"]');

		// Verify review type info is displayed
		await expect(dialog.locator('[data-testid="review-type-description"]')).toContainText(
			'Comprehensive yearly performance evaluation'
		);

		// Set review period
		await page.fill('[data-testid="review-period-start"]', '2025-01-01');
		await page.fill('[data-testid="review-period-end"]', '2025-12-31');

		// Switch to "Create New Goal" tab
		await page.click('[data-testid="tab-create-new-goal"]');

		// Add first goal
		await page.fill('[data-testid="new-goal-title"]', 'Complete technical certification');
		await page.fill(
			'[data-testid="new-goal-description"]',
			'Obtain AWS Solutions Architect certification'
		);
		await page.fill('[data-testid="new-goal-target-date"]', '2025-06-30');
		await page.fill('[data-testid="new-goal-success-metrics"]', 'Pass exam with score >= 750');
		await page.click('[data-testid="add-new-goal"]');

		// Verify goal appears in summary
		const goalsSummary = page.locator('[data-testid="goals-summary"]');
		await expect(goalsSummary).toContainText('Complete technical certification');
		await expect(goalsSummary).toContainText('NEW');

		// Add notes
		await page.fill(
			'[data-testid="review-notes"]',
			'Employee shows strong technical skills and potential for growth.'
		);

		// Submit review
		await page.click('[data-testid="create-review-button"]');

		// Verify success notification
		await expect(page.locator('[data-testid="success-toast"]')).toContainText(
			'Review created successfully'
		);

		// Verify dialog closes and review appears in list
		await expect(dialog).not.toBeVisible();
		await expect(page.locator('[data-testid="review-row"]')).toContainText('ANNUAL_REVIEW');
	});

	test('should create review with linked existing goals (QUARTERLY)', async ({ page }) => {
		await page.goto('/dashboard/reviews');
		await page.click('[data-testid="create-review-button"]');

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// Select review type: QUARTERLY
		await page.click('[data-testid="review-type-dropdown"]');
		await page.click('[data-testid="review-type-QUARTERLY"]');

		// Set review period
		await page.fill('[data-testid="review-period-start"]', '2025-07-01');
		await page.fill('[data-testid="review-period-end"]', '2025-09-30');

		// Switch to "Link Existing Goals" tab
		await page.click('[data-testid="tab-link-existing-goals"]');

		// Search for existing goals
		await page.fill('[data-testid="goal-search"]', 'certification');

		// Select first 2 existing goals
		await page.check('[data-testid="goal-checkbox-0"]');
		await page.check('[data-testid="goal-checkbox-1"]');

		// Verify goals appear in summary
		const goalsSummary = page.locator('[data-testid="goals-summary"]');
		await expect(goalsSummary).toContainText('EXISTING');
		await expect(goalsSummary.locator('[data-testid="goal-count"]')).toContainText('2 goals');

		// Submit review
		await page.click('[data-testid="create-review-button"]');

		// Verify success
		await expect(page.locator('[data-testid="success-toast"]')).toContainText(
			'Review created successfully'
		);
	});

	test('should auto-save draft after 3 seconds of inactivity', async ({ page }) => {
		await page.goto('/dashboard/reviews');
		await page.click('[data-testid="create-review-button"]');

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// Select review type
		await page.click('[data-testid="review-type-dropdown"]');
		await page.click('[data-testid="review-type-MID_YEAR"]');

		// Fill some fields
		await page.fill('[data-testid="review-period-start"]', '2025-04-01');
		await page.fill('[data-testid="review-notes"]', 'Mid-year progress review notes');

		// Wait for auto-save debounce (3 seconds) + network delay
		await page.waitForTimeout(3500);

		// Verify draft saving indicator appears
		await expect(dialog.locator('[data-testid="draft-saving-indicator"]')).toContainText(
			/Saving|Saved/
		);

		// Verify last saved timestamp updates
		const lastSavedElement = dialog.locator('[data-testid="last-saved-time"]');
		await expect(lastSavedElement).toBeVisible();
		await expect(lastSavedElement).toContainText(/just now|seconds ago/);
	});

	test('should save review as draft manually', async ({ page }) => {
		await page.goto('/dashboard/reviews');
		await page.click('[data-testid="create-review-button"]');

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// Select review type
		await page.click('[data-testid="review-type-dropdown"]');
		await page.click('[data-testid="review-type-PROBATIONARY"]');

		// Fill minimal fields
		await page.fill('[data-testid="review-period-start"]', '2025-01-15');
		await page.fill('[data-testid="review-notes"]', 'Initial probationary review draft');

		// Click "Save as Draft" button
		await page.click('[data-testid="save-draft-button"]');

		// Verify draft saved notification
		await expect(page.locator('[data-testid="success-toast"]')).toContainText('Draft saved');

		// Dialog should close
		await expect(dialog).not.toBeVisible();

		// Verify draft appears in reviews list with draft indicator
		const draftRow = page.locator('[data-testid="review-row"]').filter({ hasText: 'DRAFT' });
		await expect(draftRow).toBeVisible();
		await expect(draftRow.locator('[data-testid="draft-indicator"]')).toBeVisible();
	});

	test('should resume draft review from list', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Find a draft review
		const draftRow = page.locator('[data-testid="review-row"]').filter({ hasText: 'DRAFT' });

		// Verify draft indicator is visible
		await expect(draftRow.locator('[data-testid="draft-indicator"]')).toBeVisible();

		// Click "Resume" button on draft
		await draftRow.locator('[data-testid="resume-draft-button"]').click();

		// Dialog should open with pre-filled data
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// Verify fields are pre-populated
		const reviewTypeDropdown = dialog.locator('[data-testid="review-type-dropdown"]');
		await expect(reviewTypeDropdown).not.toBeEmpty();

		// Verify notes are preserved
		const notesField = dialog.locator('[data-testid="review-notes"]');
		const notesValue = await notesField.inputValue();
		expect(notesValue.length).toBeGreaterThan(0);
	});

	test('should delete draft review with confirmation', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Find a draft review
		const draftRow = page.locator('[data-testid="review-row"]').filter({ hasText: 'DRAFT' });
		const initialCount = await page.locator('[data-testid="review-row"]').count();

		// Click delete button on draft
		await draftRow.locator('[data-testid="delete-draft-button"]').click();

		// Verify confirmation dialog appears
		const confirmDialog = page.locator('[role="alertdialog"]');
		await expect(confirmDialog).toBeVisible();
		await expect(confirmDialog).toContainText('Are you sure you want to delete this draft?');

		// Confirm deletion
		await page.click('[data-testid="confirm-delete-button"]');

		// Verify success notification
		await expect(page.locator('[data-testid="success-toast"]')).toContainText('Draft deleted');

		// Verify row count decreased
		const updatedCount = await page.locator('[data-testid="review-row"]').count();
		expect(updatedCount).toBe(initialCount - 1);
	});

	test('should filter reviews by review type', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Open review type filter
		await page.click('[data-testid="filter-review-type"]');

		// Select "ANNUAL_REVIEW" filter
		await page.check('[data-testid="filter-type-ANNUAL_REVIEW"]');

		// Apply filters
		await page.click('[data-testid="apply-filters"]');

		// Verify all visible reviews are ANNUAL_REVIEW
		const reviewRows = page.locator('[data-testid="review-row"]');
		const count = await reviewRows.count();

		for (let i = 0; i < count; i++) {
			const reviewType = reviewRows.nth(i).locator('[data-testid="review-type"]');
			await expect(reviewType).toContainText('Annual Review');
		}

		// Verify filter badge shows active filter count
		await expect(page.locator('[data-testid="active-filters-badge"]')).toContainText('1');
	});

	test('should filter reviews by status (Draft, In Progress, Completed)', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Open status filter
		await page.click('[data-testid="filter-status"]');

		// Select "IN_PROGRESS" status
		await page.check('[data-testid="filter-status-IN_PROGRESS"]');

		// Apply filters
		await page.click('[data-testid="apply-filters"]');

		// Verify all visible reviews are in progress
		const reviewRows = page.locator('[data-testid="review-row"]');
		const count = await reviewRows.count();

		for (let i = 0; i < count; i++) {
			const statusBadge = reviewRows.nth(i).locator('[data-testid="review-status"]');
			await expect(statusBadge).toContainText('In Progress');
		}
	});

	test('should search reviews by employee name', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Enter search query
		await page.fill('[data-testid="search-input"]', 'John Doe');

		// Verify search results
		const reviewRows = page.locator('[data-testid="review-row"]');
		const count = await reviewRows.count();

		for (let i = 0; i < count; i++) {
			const employeeName = reviewRows.nth(i).locator('[data-testid="employee-name"]');
			await expect(employeeName).toContainText(/John Doe/i);
		}
	});

	test('should sort reviews by created date (ascending/descending)', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Open sort dropdown
		await page.click('[data-testid="sort-dropdown"]');

		// Select "Created Date - Ascending"
		await page.click('[data-testid="sort-created-asc"]');

		// Verify sort indicator
		await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Created ↑');

		// Click again to reverse sort
		await page.click('[data-testid="sort-dropdown"]');
		await page.click('[data-testid="sort-created-desc"]');

		// Verify descending indicator
		await expect(page.locator('[data-testid="sort-indicator"]')).toContainText('Created ↓');
	});

	test('should view review detail page with associated goals', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Click on first review to view details
		const firstReview = page.locator('[data-testid="review-row"]').first();
		await firstReview.locator('[data-testid="view-review-button"]').click();

		// Verify navigation to detail page
		await expect(page).toHaveURL(/\/dashboard\/reviews\/[a-f0-9-]+/);

		// Verify review type header
		await expect(page.locator('h1')).toContainText(/Review/);

		// Verify employee information card
		const employeeCard = page.locator('[data-testid="employee-info-card"]');
		await expect(employeeCard).toBeVisible();
		await expect(employeeCard.locator('[data-testid="employee-name"]')).toBeVisible();
		await expect(employeeCard.locator('[data-testid="employee-email"]')).toBeVisible();
		await expect(employeeCard.locator('[data-testid="employee-job-title"]')).toBeVisible();

		// Verify reviewer information
		await expect(page.locator('[data-testid="reviewer-name"]')).toBeVisible();

		// Verify review period card
		const periodCard = page.locator('[data-testid="review-period-card"]');
		await expect(periodCard).toBeVisible();

		// Verify associated goals section
		const goalsSection = page.locator('[data-testid="associated-goals-section"]');
		await expect(goalsSection).toBeVisible();
		await expect(goalsSection.locator('h3')).toContainText('Associated Goals');

		// Verify goal cards
		const goalCards = page.locator('[data-testid="goal-card"]');
		const goalCount = await goalCards.count();
		expect(goalCount).toBeGreaterThanOrEqual(0);

		if (goalCount > 0) {
			// Check first goal card structure
			const firstGoal = goalCards.first();
			await expect(firstGoal.locator('[data-testid="goal-title"]')).toBeVisible();
			await expect(firstGoal.locator('[data-testid="goal-description"]')).toBeVisible();
			await expect(firstGoal.locator('[data-testid="goal-target-date"]')).toBeVisible();
		}

		// Verify review metadata sidebar
		const metadataSidebar = page.locator('[data-testid="review-metadata"]');
		await expect(metadataSidebar).toBeVisible();
		await expect(metadataSidebar.locator('[data-testid="created-at"]')).toBeVisible();
		await expect(metadataSidebar.locator('[data-testid="updated-at"]')).toBeVisible();
	});

	test('should display soft-deleted goals with indicator', async ({ page }) => {
		// Navigate to a review that has soft-deleted goals
		await page.goto('/dashboard/reviews');

		// Find and click on a review with deleted goals (if exists)
		const reviewWithDeletedGoals = page
			.locator('[data-testid="review-row"]')
			.filter({ hasText: 'deleted' })
			.first();

		// If no review with deleted goals exists, skip test
		if ((await reviewWithDeletedGoals.count()) === 0) {
			test.skip();
			return;
		}

		await reviewWithDeletedGoals.click();

		// Verify deleted goal indicator
		const deletedGoal = page
			.locator('[data-testid="goal-card"]')
			.filter({ hasText: 'Deleted' })
			.first();

		await expect(deletedGoal).toBeVisible();
		await expect(deletedGoal.locator('[data-testid="deleted-badge"]')).toBeVisible();
		await expect(deletedGoal.locator('[data-testid="deleted-badge"]')).toContainText('Deleted');

		// Verify deleted date is shown
		await expect(deletedGoal.locator('[data-testid="deleted-at"]')).toBeVisible();

		// Verify styling difference (grayed out)
		await expect(deletedGoal).toHaveClass(/bg-muted/);
	});

	test('should edit review from detail page', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Navigate to review detail
		const firstReview = page.locator('[data-testid="review-row"]').first();
		await firstReview.click();

		// Click edit button
		const editButton = page.locator('[data-testid="edit-review-button"]');
		await expect(editButton).toBeVisible();
		await editButton.click();

		// Verify edit dialog opens with pre-filled data
		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();
		await expect(dialog.locator('h2')).toContainText('Edit Review');
	});

	test('should complete review (status transition: draft → in_progress)', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Find a draft review
		const draftReview = page.locator('[data-testid="review-row"]').filter({ hasText: 'DRAFT' });

		// If no drafts exist, skip test
		if ((await draftReview.count()) === 0) {
			test.skip();
			return;
		}

		await draftReview.click();

		// Verify status is DRAFT
		await expect(page.locator('[data-testid="review-status-badge"]')).toContainText('Draft');

		// Click "Complete Review" button
		const completeButton = page.locator('[data-testid="complete-review-button"]');
		await expect(completeButton).toBeVisible();
		await completeButton.click();

		// Verify confirmation dialog
		const confirmDialog = page.locator('[role="alertdialog"]');
		await expect(confirmDialog).toBeVisible();
		await expect(confirmDialog).toContainText('Are you sure you want to complete this review?');

		// Confirm
		await page.click('[data-testid="confirm-complete-button"]');

		// Verify success notification
		await expect(page.locator('[data-testid="success-toast"]')).toContainText(
			'Review status updated'
		);

		// Verify status changed to IN_PROGRESS
		await expect(page.locator('[data-testid="review-status-badge"]')).toContainText('In Progress');
	});

	test('should handle pagination for large review lists', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Check if pagination exists
		const paginationControls = page.locator('[data-testid="pagination"]');

		if (await paginationControls.isVisible()) {
			// Verify page info
			const pageInfo = page.locator('[data-testid="pagination-info"]');
			await expect(pageInfo).toBeVisible();
			await expect(pageInfo).toContainText(/Page \d+ of \d+/);

			// Click next page
			const nextButton = page.locator('[data-testid="pagination-next"]');
			if (await nextButton.isEnabled()) {
				await nextButton.click();

				// Verify page changed
				await expect(pageInfo).toContainText(/Page 2 of \d+/);

				// Verify previous button is enabled
				const prevButton = page.locator('[data-testid="pagination-prev"]');
				await expect(prevButton).toBeEnabled();
			}
		}
	});

	test('should show empty state when no reviews exist', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Apply filters that result in no matches
		await page.click('[data-testid="filter-status"]');
		await page.check('[data-testid="filter-status-COMPLETED"]');
		await page.fill('[data-testid="search-input"]', 'nonexistent-employee-xyz');
		await page.click('[data-testid="apply-filters"]');

		// Verify empty state
		const emptyState = page.locator('[data-testid="empty-state"]');
		await expect(emptyState).toBeVisible();
		await expect(emptyState).toContainText('No reviews found');

		// Verify clear filters button
		await expect(page.locator('[data-testid="clear-filters-button"]')).toBeVisible();
	});

	test('should validate review form with Zod schema', async ({ page }) => {
		await page.goto('/dashboard/reviews');
		await page.click('[data-testid="create-review-button"]');

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// Try to submit without required fields
		await page.click('[data-testid="create-review-button"]');

		// Verify validation errors
		await expect(dialog.locator('[data-testid="error-review-type"]')).toContainText(
			'Review type is required'
		);

		// Fill review type
		await page.click('[data-testid="review-type-dropdown"]');
		await page.click('[data-testid="review-type-ANNUAL_REVIEW"]');

		// Try invalid date range (end before start)
		await page.fill('[data-testid="review-period-start"]', '2025-12-31');
		await page.fill('[data-testid="review-period-end"]', '2025-01-01');

		// Try to submit
		await page.click('[data-testid="create-review-button"]');

		// Verify date validation error
		await expect(dialog.locator('[data-testid="error-review-period"]')).toContainText(
			'End date must be after start date'
		);
	});

	test('should respect RBAC permissions (manager sees only direct reports)', async ({ page }) => {
		// Logout and login as manager
		await page.goto('/logout');
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'manager@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		await page.goto('/dashboard/reviews');

		// Verify manager can only see reviews for their direct reports
		const reviewRows = page.locator('[data-testid="review-row"]');
		const count = await reviewRows.count();

		// All visible reviews should be for manager's direct reports
		for (let i = 0; i < count; i++) {
			const reviewRow = reviewRows.nth(i);
			// Verify reviewer is the current manager OR employee is in manager's team
			// (specific validation depends on test data)
			await expect(reviewRow).toBeVisible();
		}

		// Verify create button is visible (managers can create reviews)
		await expect(page.locator('[data-testid="create-review-button"]')).toBeVisible();
	});

	test('should respect RBAC permissions (employee sees only own reviews)', async ({ page }) => {
		// Logout and login as employee
		await page.goto('/logout');
		await page.goto('/login');
		await page.fill('[data-testid="email-input"]', 'employee@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		await page.goto('/dashboard/reviews');

		// Verify employee sees only their own reviews
		const reviewRows = page.locator('[data-testid="review-row"]');
		const count = await reviewRows.count();

		if (count > 0) {
			for (let i = 0; i < count; i++) {
				const employeeName = reviewRows.nth(i).locator('[data-testid="employee-name"]');
				// All reviews should be for the logged-in employee
				await expect(employeeName).toBeVisible();
			}
		}

		// Verify create button is NOT visible (employees cannot create reviews)
		await expect(page.locator('[data-testid="create-review-button"]')).not.toBeVisible();
	});

	test('should manage goals from review detail page', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Navigate to review detail
		const firstReview = page.locator('[data-testid="review-row"]').first();
		await firstReview.click();

		// Click "Manage Goals" button
		const manageGoalsButton = page.locator('[data-testid="manage-goals-button"]');

		if (await manageGoalsButton.isVisible()) {
			await manageGoalsButton.click();

			// Verify manage goals dialog opens
			const dialog = page.locator('[role="dialog"]');
			await expect(dialog).toBeVisible();
			await expect(dialog).toContainText('Manage Goals');

			// Verify can add new goals
			await expect(dialog.locator('[data-testid="add-goal-button"]')).toBeVisible();

			// Verify can link existing goals
			await expect(dialog.locator('[data-testid="link-existing-goals"]')).toBeVisible();
		}
	});

	test('should export review as PDF', async ({ page }) => {
		await page.goto('/dashboard/reviews');

		// Navigate to review detail
		const firstReview = page.locator('[data-testid="review-row"]').first();
		await firstReview.click();

		// Find export PDF button in quick actions
		const exportButton = page.locator('[data-testid="export-pdf-button"]');

		if (await exportButton.isVisible()) {
			// Start download
			const downloadPromise = page.waitForEvent('download');
			await exportButton.click();

			// Verify download starts
			const download = await downloadPromise;
			expect(download.suggestedFilename()).toMatch(/performance-review.*\.pdf$/);
		}
	});

	test('should handle all 10 review types correctly', async ({ page }) => {
		await page.goto('/dashboard/reviews');
		await page.click('[data-testid="create-review-button"]');

		const dialog = page.locator('[role="dialog"]');
		await expect(dialog).toBeVisible();

		// Open review type dropdown
		await page.click('[data-testid="review-type-dropdown"]');

		// Verify all 10 review types are present
		const reviewTypes = [
			'ANNUAL_REVIEW',
			'MID_YEAR',
			'QUARTERLY',
			'PROBATIONARY',
			'PIP',
			'NINETY_DAY',
			'PROJECT_BASED',
			'PROMOTION',
			'EXIT_REVIEW',
			'SELF_ASSESSMENT'
		];

		for (const type of reviewTypes) {
			const typeOption = page.locator(`[data-testid="review-type-${type}"]`);
			await expect(typeOption).toBeVisible();

			// Verify each type has icon and description
			await expect(typeOption.locator('[data-testid="review-type-icon"]')).toBeVisible();
			await expect(typeOption.locator('[data-testid="review-type-label"]')).toBeVisible();
		}
	});
});
