// E2E Test: Admin Teams Administration Page
// Created: 2025-09-24
// Task: T010 - E2E test Teams administration page
// CRITICAL: This test MUST FAIL initially as per TDD approach

import { expect, test } from '@playwright/test';

test.describe('Admin Teams Administration Page', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin (higher privileges than manager)
		await page.goto('/auth/login');
		await page.fill('[data-testid="email-input"]', 'admin@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		// Wait for successful login and navigation
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('should display teams and departments data table', async ({ page }) => {
		// Navigate to teams administration page
		await page.goto('/dashboard/admin/teams');

		// Wait for page to load
		await expect(page.locator('h1')).toContainText('Teams & Departments');

		// Should show teams/departments data table
		await expect(page.locator('[data-testid="teams-table"]')).toBeVisible();

		// Check table headers
		await expect(page.locator('th')).toContainText([
			'Department',
			'Team Size',
			'Department Head',
			'Budget',
			'Status',
			'Actions'
		]);

		// Should have at least one team/department row
		expect(await page.locator('[data-testid="team-row"]').count()).toBeGreaterThanOrEqual(1);

		// Each row should have department details and action buttons
		const firstRow = page.locator('[data-testid="team-row"]').first();
		await expect(firstRow.locator('[data-testid="department-name"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="team-size"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="department-head"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="department-budget"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="department-status"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="view-team"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="edit-team"]')).toBeVisible();
		await expect(firstRow.locator('[data-testid="delete-team"]')).toBeVisible();
	});

	test('should create new department with team structure', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Click create new department button
		await page.click('[data-testid="create-department"]');

		// Should open department creation modal
		await expect(page.locator('[data-testid="department-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText(
			'Create New Department'
		);

		// Fill in department details
		await page.fill('[data-testid="department-name"]', 'Product Development');
		await page.fill(
			'[data-testid="department-description"]',
			'Responsible for product design, development, and innovation'
		);
		await page.fill('[data-testid="department-code"]', 'PROD-DEV');
		await page.selectOption('[data-testid="department-head"]', 'manager@postgraphile-hr.com');

		// Set department budget
		await page.fill('[data-testid="annual-budget"]', '500000');
		await page.selectOption('[data-testid="cost-center"]', 'R&D');

		// Configure department settings
		await page.selectOption('[data-testid="department-status"]', 'active');
		await page.fill('[data-testid="location"]', 'Building A, Floor 3');

		// Add team members
		await page.click('[data-testid="add-team-member"]');
		await page.selectOption('[data-testid="member-1-select"]', 'employee@postgraphile-hr.com');
		await page.selectOption('[data-testid="member-1-role"]', 'developer');

		await page.click('[data-testid="add-team-member"]');
		await page.selectOption('[data-testid="member-2-select"]', 'john.doe@postgraphile-hr.com');
		await page.selectOption('[data-testid="member-2-role"]', 'senior-developer');

		// Submit department creation
		await page.click('[data-testid="submit-department"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Department created successfully'
		);

		// Modal should close and new department should appear in table
		await expect(page.locator('[data-testid="department-modal"]')).not.toBeVisible();
		await expect(page.locator('[data-testid="team-row"]')).toContainText('Product Development');
	});

	test('should edit existing department and update team members', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Click edit button for first department
		const firstRow = page.locator('[data-testid="team-row"]').first();
		await firstRow.locator('[data-testid="edit-team"]').click();

		// Should open edit modal with pre-filled data
		await expect(page.locator('[data-testid="department-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText('Edit Department');

		// Should have pre-filled form fields
		await expect(page.locator('[data-testid="department-name"]')).toHaveValue(/.+/);
		await expect(page.locator('[data-testid="department-code"]')).toHaveValue(/.+/);

		// Update department details
		await page.fill(
			'[data-testid="department-description"]',
			'Updated department description with new responsibilities'
		);
		await page.fill('[data-testid="annual-budget"]', '750000');

		// Add new team member
		await page.click('[data-testid="add-team-member"]');
		const newMemberRow = page.locator('[data-testid="member-row"]').last();
		await newMemberRow
			.locator('[data-testid="member-select"]')
			.selectOption('jane.smith@postgraphile-hr.com');
		await newMemberRow.locator('[data-testid="member-role"]').selectOption('team-lead');

		// Remove existing team member
		const firstMemberRow = page.locator('[data-testid="member-row"]').first();
		await firstMemberRow.locator('[data-testid="remove-member"]').click();

		// Submit changes
		await page.click('[data-testid="submit-department"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Department updated successfully'
		);

		// Modal should close
		await expect(page.locator('[data-testid="department-modal"]')).not.toBeVisible();
	});

	test('should view department details and org chart', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Click view button for first department
		const firstRow = page.locator('[data-testid="team-row"]').first();
		await firstRow.locator('[data-testid="view-team"]').click();

		// Should open department details modal
		await expect(page.locator('[data-testid="department-details-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText('Department Details');

		// Should show department information
		await expect(page.locator('[data-testid="dept-name-display"]')).toBeVisible();
		await expect(page.locator('[data-testid="dept-description-display"]')).toBeVisible();
		await expect(page.locator('[data-testid="dept-head-display"]')).toBeVisible();
		await expect(page.locator('[data-testid="dept-budget-display"]')).toBeVisible();

		// Should show team members list
		await expect(page.locator('[data-testid="team-members-list"]')).toBeVisible();
		expect(await page.locator('[data-testid="member-item"]').count()).toBeGreaterThanOrEqual(1);

		// Each team member should show details
		const firstMember = page.locator('[data-testid="member-item"]').first();
		await expect(firstMember.locator('[data-testid="member-name"]')).toBeVisible();
		await expect(firstMember.locator('[data-testid="member-role"]')).toBeVisible();
		await expect(firstMember.locator('[data-testid="member-email"]')).toBeVisible();
		await expect(firstMember.locator('[data-testid="member-status"]')).toBeVisible();

		// Should show organizational chart
		await expect(page.locator('[data-testid="org-chart"]')).toBeVisible();
		await expect(page.locator('[data-testid="dept-head-node"]')).toBeVisible();
		expect(await page.locator('[data-testid="team-member-node"]').count()).toBeGreaterThanOrEqual(1);

		// Should show department metrics
		await expect(page.locator('[data-testid="dept-metrics"]')).toBeVisible();
		await expect(page.locator('[data-testid="total-employees"]')).toBeVisible();
		await expect(page.locator('[data-testid="avg-attendance"]')).toBeVisible();
		await expect(page.locator('[data-testid="performance-score"]')).toBeVisible();
	});

	test('should validate required fields in department creation', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Click create new department
		await page.click('[data-testid="create-department"]');

		// Try to submit without required fields
		await page.click('[data-testid="submit-department"]');

		// Should show validation errors
		await expect(page.locator('[data-testid="name-error"]')).toContainText(
			'Department name is required'
		);
		await expect(page.locator('[data-testid="code-error"]')).toContainText(
			'Department code is required'
		);
		await expect(page.locator('[data-testid="description-error"]')).toContainText(
			'Department description is required'
		);
		await expect(page.locator('[data-testid="head-error"]')).toContainText(
			'Department head is required'
		);

		// Should validate unique department code
		await page.fill('[data-testid="department-name"]', 'Test Department');
		await page.fill('[data-testid="department-code"]', 'EXISTING-CODE'); // Assume this exists
		await page.fill('[data-testid="department-description"]', 'Test description');
		await page.selectOption('[data-testid="department-head"]', 'manager@postgraphile-hr.com');
		await page.click('[data-testid="submit-department"]');

		// Should show duplicate code error
		await expect(page.locator('[data-testid="code-error"]')).toContainText(
			'Department code already exists'
		);

		// Should not close modal
		await expect(page.locator('[data-testid="department-modal"]')).toBeVisible();
	});

	test('should transfer department head with proper authorization', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Click edit button for department
		const firstRow = page.locator('[data-testid="team-row"]').first();
		await firstRow.locator('[data-testid="edit-team"]').click();

		// Change department head
		const currentHead = await page.locator('[data-testid="department-head"]').inputValue();
		await page.selectOption('[data-testid="department-head"]', 'jane.smith@postgraphile-hr.com');

		// Should show transfer confirmation
		await page.click('[data-testid="submit-department"]');
		await expect(page.locator('[data-testid="transfer-confirmation"]')).toBeVisible();
		await expect(page.locator('[data-testid="transfer-message"]')).toContainText(
			'Confirm department head transfer'
		);

		// Should show current and new head details
		await expect(page.locator('[data-testid="current-head"]')).toContainText(currentHead);
		await expect(page.locator('[data-testid="new-head"]')).toContainText(
			'jane.smith@postgraphile-hr.com'
		);

		// Confirm transfer
		await page.click('[data-testid="confirm-transfer"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Department head transferred successfully'
		);

		// Should close modals
		await expect(page.locator('[data-testid="transfer-confirmation"]')).not.toBeVisible();
		await expect(page.locator('[data-testid="department-modal"]')).not.toBeVisible();
	});

	test('should filter departments by status', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Should have status filter
		await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();

		// Filter by active departments
		await page.selectOption('[data-testid="status-filter"]', 'active');
		await page.click('[data-testid="apply-filters"]');

		// Should show only active departments
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		const statusElements = page.locator('[data-testid="department-status"]');
		const count = await statusElements.count();
		for (let i = 0; i < count; i++) {
			await expect(statusElements.nth(i)).toContainText('Active');
		}
	});

	test('should search departments by name or head', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Should have search input
		await expect(page.locator('[data-testid="department-search"]')).toBeVisible();

		// Search for specific department
		await page.fill('[data-testid="department-search"]', 'Engineering');
		await page.press('[data-testid="department-search"]', 'Enter');

		// Should show only matching departments
		await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();

		const departmentNames = page.locator('[data-testid="department-name"]');
		const count = await departmentNames.count();
		for (let i = 0; i < count; i++) {
			await expect(departmentNames.nth(i)).toContainText(/Engineering/i);
		}
	});

	test('should sort departments by team size', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Click team size column header to sort
		await page.click('[data-testid="team-size-header"]');

		// Should sort ascending first
		await expect(page.locator('[data-testid="sort-indicator-asc"]')).toBeVisible();

		// Click again to sort descending
		await page.click('[data-testid="team-size-header"]');
		await expect(page.locator('[data-testid="sort-indicator-desc"]')).toBeVisible();

		// Verify sorting order
		const teamSizes = page.locator('[data-testid="team-size"]');
		const count = await teamSizes.count();
		expect(count).toBeGreaterThan(1);
	});

	test('should handle pagination for large datasets', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Should have pagination controls if more than page size
		if (await page.locator('[data-testid="pagination-next"]').isVisible()) {
			// Check page info
			await expect(page.locator('[data-testid="pagination-info"]')).toBeVisible();

			// Navigate to next page
			await page.click('[data-testid="pagination-next"]');

			// Should load new page of results
			await expect(page.locator('[data-testid="loading-indicator"]')).not.toBeVisible();
			expect(await page.locator('[data-testid="team-row"]').count()).toBeGreaterThanOrEqual(1);

			// Previous button should be enabled
			await expect(page.locator('[data-testid="pagination-prev"]')).toBeEnabled();
		}
	});

	test('should export departments data to CSV', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Should have export button
		await expect(page.locator('[data-testid="export-csv"]')).toBeVisible();

		// Start download
		const downloadPromise = page.waitForEvent('download');
		await page.click('[data-testid="export-csv"]');

		// Should download CSV file
		const download = await downloadPromise;
		expect(download.suggestedFilename()).toMatch(/departments.*\.csv$/);
	});

	test('should delete department with confirmation and data validation', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Click delete button for department
		const departmentRow = page
			.locator('[data-testid="team-row"]')
			.filter({ hasText: 'Test Department' })
			.first();
		await departmentRow.locator('[data-testid="delete-team"]').click();

		// Should show deletion confirmation modal
		await expect(page.locator('[data-testid="delete-confirmation"]')).toBeVisible();
		await expect(page.locator('[data-testid="confirmation-message"]')).toContainText(
			'Are you sure you want to delete this department?'
		);

		// Should show impact warning if department has employees
		if (await page.locator('[data-testid="impact-warning"]').isVisible()) {
			await expect(page.locator('[data-testid="impact-warning"]')).toContainText(
				'This department has active employees'
			);
			await expect(page.locator('[data-testid="reassign-employees"]')).toBeVisible();

			// Should require reassignment of employees
			await page.selectOption('[data-testid="reassign-department"]', 'Engineering');
			await page.check('[data-testid="confirm-reassignment"]');
		}

		// Should require typing department name for confirmation
		await page.fill('[data-testid="confirm-department-name"]', 'Test Department');

		// Confirm deletion
		await page.click('[data-testid="confirm-delete"]');

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Department deleted successfully'
		);

		// Confirmation modal should close
		await expect(page.locator('[data-testid="delete-confirmation"]')).not.toBeVisible();

		// Department should be removed from table
		await expect(page.locator('[data-testid="team-row"]')).not.toContainText('Test Department');
	});

	test('should bulk assign employees to departments', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Should have bulk actions button
		await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();

		// Click bulk actions
		await page.click('[data-testid="bulk-actions"]');
		await page.click('[data-testid="bulk-assign-employees"]');

		// Should open bulk assignment modal
		await expect(page.locator('[data-testid="bulk-assignment-modal"]')).toBeVisible();
		await expect(page.locator('[data-testid="modal-title"]')).toContainText(
			'Bulk Assign Employees'
		);

		// Select employees to reassign
		await page.check('[data-testid="employee-john-doe"]');
		await page.check('[data-testid="employee-jane-smith"]');

		// Select target department
		await page.selectOption('[data-testid="target-department"]', 'Engineering');

		// Set new roles
		await page.selectOption('[data-testid="default-role"]', 'developer');

		// Submit bulk assignment
		await page.click('[data-testid="submit-bulk-assignment"]');

		// Should show progress indicator
		await expect(page.locator('[data-testid="assignment-progress"]')).toBeVisible();

		// Should show success notification
		await expect(page.locator('[data-testid="success-notification"]')).toContainText(
			'Employees assigned successfully'
		);

		// Modal should close
		await expect(page.locator('[data-testid="bulk-assignment-modal"]')).not.toBeVisible();
	});

	test('should handle empty state when no departments exist', async ({ page }) => {
		// Apply filters that will return no results
		await page.goto('/dashboard/admin/teams');
		await page.selectOption('[data-testid="status-filter"]', 'archived');
		await page.click('[data-testid="apply-filters"]');

		// Should show empty state message
		await expect(page.locator('[data-testid="empty-state"]')).toBeVisible();
		await expect(page.locator('[data-testid="empty-state"]')).toContainText('No departments found');

		// Should suggest creating new department or clearing filters
		await expect(page.locator('[data-testid="create-first-department"]')).toBeVisible();
		await expect(page.locator('[data-testid="clear-filters"]')).toBeVisible();
	});

	test('should display department budget and cost analysis', async ({ page }) => {
		await page.goto('/dashboard/admin/teams');

		// Should have budget overview section
		await expect(page.locator('[data-testid="budget-overview"]')).toBeVisible();
		await expect(page.locator('[data-testid="total-budget"]')).toBeVisible();
		await expect(page.locator('[data-testid="budget-utilization"]')).toBeVisible();

		// Click on department to view budget details
		const firstRow = page.locator('[data-testid="team-row"]').first();
		await firstRow.locator('[data-testid="view-team"]').click();

		// Should show budget breakdown in details modal
		await expect(page.locator('[data-testid="budget-breakdown"]')).toBeVisible();
		await expect(page.locator('[data-testid="salary-budget"]')).toBeVisible();
		await expect(page.locator('[data-testid="operational-budget"]')).toBeVisible();
		await expect(page.locator('[data-testid="budget-remaining"]')).toBeVisible();
	});

	test('should require admin role access', async ({ page }) => {
		// Logout and login as regular manager
		await page.goto('/auth/logout');
		await page.goto('/auth/login');
		await page.fill('[data-testid="email-input"]', 'manager@postgraphile-hr.com');
		await page.fill('[data-testid="password-input"]', 'admin123');
		await page.click('[data-testid="login-submit"]');

		// Try to access teams administration page
		await page.goto('/dashboard/admin/teams');

		// Should redirect to unauthorized or show access denied
		await expect(page).toHaveURL(/\/(unauthorized|403)/);
		// OR
		await expect(page.locator('[data-testid="access-denied"]')).toContainText('Access denied');
	});
});
