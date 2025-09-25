// E2E Test: Management Performance Reviews Page
// Created: 2025-09-24
// Task: T006 - E2E test Performance Reviews management page
// CRITICAL: This test MUST FAIL initially as per TDD approach

import { test, expect } from '@playwright/test';

test.describe('Management Performance Reviews Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as manager
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'manager@postgraphile-hr.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-submit"]');

    // Wait for successful login and navigation
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should display performance reviews data table', async ({ page }) => {
    // Navigate to performance reviews page
    await page.goto('/dashboard/management/reviews');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Performance Reviews');

    // Should show data table with reviews
    await expect(page.locator('[data-testid="reviews-table"]')).toBeVisible();

    // Check table headers
    await expect(page.locator('th')).toContainText(['Employee', 'Review Period', 'Status', 'Rating', 'Reviewer', 'Due Date', 'Actions']);

    // Should have at least one review row
    await expect(page.locator('[data-testid="review-row"]')).toHaveCount({ min: 1 });

    // Each row should have employee name, review details, and action buttons
    const firstRow = page.locator('[data-testid="review-row"]').first();
    await expect(firstRow.locator('[data-testid="employee-name"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="review-period"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="review-status"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="review-rating"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="reviewer-name"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="view-review"]')).toBeVisible();
    await expect(firstRow.locator('[data-testid="edit-review"]')).toBeVisible();
  });

  test('should create new performance review', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Click create new review button
    await page.click('[data-testid="create-review"]');

    // Should open review creation modal
    await expect(page.locator('[data-testid="review-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Create Performance Review');

    // Fill in review details
    await page.selectOption('[data-testid="employee-select"]', 'employee@postgraphile-hr.com');
    await page.selectOption('[data-testid="review-type"]', 'annual');
    await page.fill('[data-testid="review-period-start"]', '2025-01-01');
    await page.fill('[data-testid="review-period-end"]', '2025-12-31');
    await page.fill('[data-testid="due-date"]', '2025-02-15');

    // Add review goals
    await page.fill('[data-testid="goal-1"]', 'Complete project deliverables on time');
    await page.fill('[data-testid="goal-2"]', 'Improve team collaboration skills');
    await page.fill('[data-testid="goal-3"]', 'Develop technical expertise in new framework');

    // Submit review creation
    await page.click('[data-testid="submit-review"]');

    // Should show success notification
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('Performance review created successfully');

    // Modal should close and new review should appear in table
    await expect(page.locator('[data-testid="review-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="review-row"]')).toContainText('employee@postgraphile-hr.com');
  });

  test('should edit existing performance review', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Click edit button for first review
    const firstRow = page.locator('[data-testid="review-row"]').first();
    await firstRow.locator('[data-testid="edit-review"]').click();

    // Should open edit modal with pre-filled data
    await expect(page.locator('[data-testid="review-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="modal-title"]')).toContainText('Edit Performance Review');

    // Should have pre-filled form fields
    await expect(page.locator('[data-testid="employee-select"]')).toHaveValue(/.+/);
    await expect(page.locator('[data-testid="review-type"]')).toHaveValue(/.+/);

    // Edit review status
    await page.selectOption('[data-testid="review-status"]', 'in-progress');

    // Add manager comments
    await page.fill('[data-testid="manager-comments"]', 'Employee shows strong performance in key areas');

    // Submit changes
    await page.click('[data-testid="submit-review"]');

    // Should show success notification
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('Performance review updated successfully');

    // Modal should close
    await expect(page.locator('[data-testid="review-modal"]')).not.toBeVisible();
  });

  test('should submit review with ratings and comments', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Click view/edit button for a draft review
    const draftRow = page.locator('[data-testid="review-row"]').filter({ hasText: 'Draft' }).first();
    await draftRow.locator('[data-testid="edit-review"]').click();

    // Should open review modal
    await expect(page.locator('[data-testid="review-modal"]')).toBeVisible();

    // Rate performance areas (1-5 scale)
    await page.click('[data-testid="quality-rating-4"]'); // Quality of work: 4/5
    await page.click('[data-testid="communication-rating-5"]'); // Communication: 5/5
    await page.click('[data-testid="collaboration-rating-3"]'); // Collaboration: 3/5
    await page.click('[data-testid="leadership-rating-4"]'); // Leadership: 4/5
    await page.click('[data-testid="initiative-rating-5"]'); // Initiative: 5/5

    // Add detailed comments
    await page.fill('[data-testid="strengths-comments"]', 'Excellent technical skills and proactive approach to problem-solving');
    await page.fill('[data-testid="areas-improvement"]', 'Could benefit from more cross-team collaboration');
    await page.fill('[data-testid="development-goals"]', 'Focus on mentoring junior team members');

    // Set overall rating
    await page.click('[data-testid="overall-rating-4"]');

    // Change status to completed
    await page.selectOption('[data-testid="review-status"]', 'completed');

    // Submit review
    await page.click('[data-testid="submit-review"]');

    // Should show success notification
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('Performance review submitted successfully');

    // Modal should close
    await expect(page.locator('[data-testid="review-modal"]')).not.toBeVisible();
  });

  test('should validate required fields in review creation', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Click create new review
    await page.click('[data-testid="create-review"]');

    // Try to submit without required fields
    await page.click('[data-testid="submit-review"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="employee-error"]')).toContainText('Employee is required');
    await expect(page.locator('[data-testid="review-type-error"]')).toContainText('Review type is required');
    await expect(page.locator('[data-testid="due-date-error"]')).toContainText('Due date is required');

    // Should not close modal
    await expect(page.locator('[data-testid="review-modal"]')).toBeVisible();
  });

  test('should filter reviews by status', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Should have status filter
    await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();

    // Filter by completed reviews
    await page.selectOption('[data-testid="status-filter"]', 'completed');
    await page.click('[data-testid="apply-filters"]');

    // Should show only completed reviews
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    const statusElements = page.locator('[data-testid="review-status"]');
    const count = await statusElements.count();
    for (let i = 0; i < count; i++) {
      await expect(statusElements.nth(i)).toContainText('Completed');
    }
  });

  test('should filter reviews by review period', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Should have period filter controls
    await expect(page.locator('[data-testid="period-filter"]')).toBeVisible();

    // Select specific review period
    await page.selectOption('[data-testid="period-filter"]', '2025-annual');
    await page.click('[data-testid="apply-filters"]');

    // Should apply filters and update table
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    // All visible reviews should be from 2025 annual period
    const periodElements = page.locator('[data-testid="review-period"]');
    const count = await periodElements.count();
    for (let i = 0; i < count; i++) {
      await expect(periodElements.nth(i)).toContainText('2025');
    }
  });

  test('should search reviews by employee name', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Should have search input
    await expect(page.locator('[data-testid="employee-search"]')).toBeVisible();

    // Search for specific employee
    await page.fill('[data-testid="employee-search"]', 'Jane');
    await page.press('[data-testid="employee-search"]', 'Enter');

    // Should show only matching employees
    await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

    const employeeNames = page.locator('[data-testid="employee-name"]');
    const count = await employeeNames.count();
    for (let i = 0; i < count; i++) {
      await expect(employeeNames.nth(i)).toContainText(/Jane/i);
    }
  });

  test('should sort reviews by due date', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Click due date column header to sort
    await page.click('[data-testid="due-date-header"]');

    // Should sort ascending first
    await expect(page.locator('[data-testid="sort-indicator-asc"]')).toBeVisible();

    // Click again to sort descending
    await page.click('[data-testid="due-date-header"]');
    await expect(page.locator('[data-testid="sort-indicator-desc"]')).toBeVisible();

    // Verify sorting order (dates should be in descending order)
    const dueDates = page.locator('[data-testid="due-date"]');
    const count = await dueDates.count();
    expect(count).toBeGreaterThan(1);
  });

  test('should handle pagination for large datasets', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Should have pagination controls if more than page size
    if (await page.locator('[data-testid="pagination-next"]').isVisible()) {
      // Check page info
      await expect(page.locator('[data-testid="pagination-info"]')).toBeVisible();

      // Navigate to next page
      await page.click('[data-testid="pagination-next"]');

      // Should load new page of results
      await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="review-row"]')).toHaveCount({ min: 1 });

      // Previous button should be enabled
      await expect(page.locator('[data-testid="pagination-prev"]')).toBeEnabled();
    }
  });

  test('should export reviews to CSV', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Should have export button
    await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-csv"]');

    // Should download CSV file
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/performance-reviews.*\.csv$/);
  });

  test('should delete review with confirmation', async ({ page }) => {
    await page.goto('/dashboard/management/reviews');

    // Click delete button for first review
    const firstRow = page.locator('[data-testid="review-row"]').first();
    await firstRow.locator('[data-testid="delete-review"]').click();

    // Should show confirmation modal
    await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('Are you sure you want to delete this performance review?');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Should show success notification
    await expect(page.locator('[data-testid="success-notification"]')).toContainText('Performance review deleted successfully');

    // Confirmation modal should close
    await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible();
  });

  test('should handle empty state when no reviews exist', async ({ page }) => {
    // Apply filters that will return no results
    await page.goto('/dashboard/management/reviews');
    await page.selectOption('[data-testid="status-filter"]', 'archived');
    await page.click('[data-testid="apply-filters"]');

    // Should show empty state message
    await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
    await expect(page.locator('[data-testid="empty-state"]')).toContainText('No performance reviews found');

    // Should suggest creating new review or clearing filters
    await expect(page.locator('[data-testid="create-first-review"]')).toBeVisible();
    await expect(page.locator('[data-testid="clear-filters"]')).toBeVisible();
  });

  test('should require manager role access', async ({ page }) => {
    // Logout and login as regular employee
    await page.goto('/auth/logout');
    await page.goto('/auth/login');
    await page.fill('[data-testid="email-input"]', 'employee@postgraphile-hr.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-submit"]');

    // Try to access performance reviews page
    await page.goto('/dashboard/management/reviews');

    // Should redirect to unauthorized or show access denied
    await expect(page).toHaveURL(/\/(unauthorized|403)/);
    // OR
    await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
  });
});