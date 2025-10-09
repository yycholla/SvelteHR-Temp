// E2E Test: Task Details View
// Feature: 028-task-system-expansion - T049
// Purpose: Test task details page with all components

import { test, expect } from '@playwright/test';

test.describe('Task Details View', () => {
	let testTaskId: string;

	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');
		await page.waitForURL('**/dashboard**');
		await page.waitForLoadState('networkidle');

		// Create a test task
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Task Details View Test');
		await page.fill('textarea[name="description"]', 'Testing the comprehensive task details view.');
		
		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		
		testTaskId = page.url().split('/').pop()!;
	});

	test('displays task title and description', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify title
		await expect(page.locator('text=Task Details View Test')).toBeVisible();

		// Verify description
		await expect(page.locator('text=Testing the comprehensive task details view.')).toBeVisible();
	});

	test('shows task metadata', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify metadata sections
		await expect(page.locator('text=/Status/i')).toBeVisible();
		await expect(page.locator('text=/Priority/i')).toBeVisible();
		await expect(page.locator('text=/Assigned to/i')).toBeVisible();
		await expect(page.locator('text=/Due Date/i')).toBeVisible();
	});

	test('displays tabbed interface', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify tabs exist
		await expect(page.locator('text=Subtasks')).toBeVisible();
		await expect(page.locator('text=Dependencies')).toBeVisible();
		await expect(page.locator('text=Resources')).toBeVisible();
		await expect(page.locator('text=Activity')).toBeVisible();
	});

	test('can switch between tabs', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Click Dependencies tab
		await page.locator('text=Dependencies').click();
		await page.waitForTimeout(300);

		// Verify dependencies content shows
		await expect(page.locator('text=/Blocked By|This Task Blocks/i')).toBeVisible();

		// Click Resources tab
		await page.locator('text=Resources').click();
		await page.waitForTimeout(300);

		// Verify resources content shows
		await expect(page.locator('text=/Linked Resources/i')).toBeVisible();

		// Click Activity tab
		await page.locator('text=Activity').click();
		await page.waitForTimeout(300);

		// Verify activity content shows
		await expect(page.locator('text=/Activity History/i')).toBeVisible();
	});

	test('shows edit button', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		const editButton = page.locator('button:has-text("Edit Task")');
		await expect(editButton).toBeVisible();
		await expect(editButton).toBeEnabled();
	});

	test('shows back button', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		const backButton = page.locator('button:has-text("Back to Tasks")');
		await expect(backButton).toBeVisible();
	});

	test('back button navigates to tasks list', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		const backButton = page.locator('button:has-text("Back to Tasks")');
		await backButton.click();

		await page.waitForURL('**/tasks');
		await expect(page.locator('h1')).toContainText('Tasks');
	});

	test('shows subtask progress when subtasks exist', async ({ page }) => {
		// Create a subtask first
		await page.goto(`/dashboard/tasks/new?parent=${testTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Test Subtask');
		
		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Go back to parent task
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify subtask progress is shown
		await expect(page.locator('text=/Subtask Progress/i')).toBeVisible();
	});

	test('subtasks tab shows subtask list', async ({ page }) => {
		// Create a subtask
		await page.goto(`/dashboard/tasks/new?parent=${testTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Subtask for Tab Test');
		
		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Go to parent task
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Click Subtasks tab (should be default)
		const subtasksTab = page.locator('text=Subtasks');
		await subtasksTab.click();
		await page.waitForTimeout(300);

		// Verify subtask appears
		await expect(page.locator('text=Subtask for Tab Test')).toBeVisible();
	});

	test('shows empty state for subtasks', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Subtasks tab should be default
		const emptyState = page.locator('text=/No subtasks|Break this task down/i');
		await expect(emptyState).toBeVisible();
	});

	test('shows empty state for dependencies', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Click Dependencies tab
		await page.locator('text=Dependencies').click();
		await page.waitForTimeout(300);

		// Verify empty state
		await expect(page.locator('text=/No tasks are blocking/i')).toBeVisible();
		await expect(page.locator('text=/not blocking any other tasks/i')).toBeVisible();
	});

	test('shows empty state for resources', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Click Resources tab
		await page.locator('text=Resources').click();
		await page.waitForTimeout(300);

		// Verify empty state
		await expect(page.locator('text=/No Linked Resources/i')).toBeVisible();
	});

	test('activity tab shows audit trail', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Click Activity tab
		await page.locator('text=Activity').click();
		await page.waitForTimeout(300);

		// Should show at least the creation event
		await expect(page.locator('text=/Created|Activity History/i')).toBeVisible();
	});

	test('displays status badge', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify status badge (default is Not Started)
		const statusBadge = page.locator('text=/Not Started|In Progress|Completed|Blocked/i');
		await expect(statusBadge).toBeVisible();
	});

	test('displays priority indicator', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${testTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify priority text/badge
		const priorityIndicator = page.locator('text=/Low|Medium|High|Urgent/i');
		await expect(priorityIndicator).toBeVisible();
	});
});
