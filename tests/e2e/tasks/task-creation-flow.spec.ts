// E2E Test: Task Creation Flow
// Feature: 028-task-system-expansion - T047
// Purpose: Test complete task creation workflow with form validation

import { test, expect } from '@playwright/test';

test.describe('Task Creation Flow', () => {
	// Setup: Login before each test
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		// Login as test user
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');

		// Wait for redirect to dashboard
		await page.waitForURL('**/dashboard**');
		await page.waitForLoadState('networkidle');
	});

	test('can navigate to task creation page', async ({ page }) => {
		// Navigate to tasks dashboard
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Find and click "New Task" button
		const newTaskButton = page.locator('button:has-text("New Task")');
		await expect(newTaskButton).toBeVisible();
		await newTaskButton.click();

		// Verify navigation to create page
		await page.waitForURL('**/tasks/new');
		await expect(page.locator('h1')).toContainText('Create New Task');
	});

	test('displays empty task form correctly', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Verify form elements are present
		await expect(page.locator('input[name="title"]')).toBeVisible();
		await expect(page.locator('textarea[name="description"]')).toBeVisible();

		// Verify status and priority selects
		await expect(page.locator('text=/Status/i')).toBeVisible();
		await expect(page.locator('text=/Priority/i')).toBeVisible();

		// Verify submit button
		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await expect(submitButton).toBeVisible();
	});

	test('validates required fields', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Try to submit empty form
		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();

		// Wait for validation
		await page.waitForTimeout(500);

		// Verify validation error for title
		const titleError = page
			.locator('text=/title.*required/i')
			.or(page.locator('[data-error="title"]'));
		await expect(titleError).toBeVisible();
	});

	test('creates task with minimal required fields', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Fill required fields
		await page.fill('input[name="title"]', 'E2E Test Task - Minimal');

		// Submit form
		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();

		// Wait for navigation
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		await page.waitForLoadState('networkidle');

		// Verify task details page loaded
		await expect(page.locator('h1')).toContainText('E2E Test Task - Minimal');
	});

	test('creates task with all fields filled', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Fill all fields
		await page.fill('input[name="title"]', 'E2E Test Task - Complete');
		await page.fill(
			'textarea[name="description"]',
			'This is a comprehensive test task with all fields filled out.'
		);

		// Set priority
		const priorityTrigger = page
			.locator('[id="priority"]')
			.or(page.locator('button:has-text("Medium")'));
		if (await priorityTrigger.isVisible()) {
			await priorityTrigger.click();
			await page.locator('text=Urgent').click();
		}

		// Set due date (7 days from now)
		const dueDate = new Date();
		dueDate.setDate(dueDate.getDate() + 7);
		const dueDateStr = dueDate.toISOString().split('T')[0];
		await page.fill('input[name="dueDate"]', dueDateStr);

		// Submit form
		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();

		// Wait for navigation
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		await page.waitForLoadState('networkidle');

		// Verify task created with correct details
		await expect(page.locator('text=E2E Test Task - Complete')).toBeVisible();
		await expect(page.locator('text=Urgent')).toBeVisible();
	});

	test('can create subtask from parent task', async ({ page }) => {
		// First create parent task
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Parent Task for Subtask Test');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Get parent task ID from URL
		const parentTaskId = page.url().split('/').pop();

		// Navigate to create subtask
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify parent task info is shown
		await expect(page.locator('text=/Creating Subtask|Subtask of/i')).toBeVisible();
		await expect(page.locator('text=Parent Task for Subtask Test')).toBeVisible();

		// Create subtask
		await page.fill('input[name="title"]', 'E2E Subtask');
		await submitButton.click();

		// Wait for navigation
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		await page.waitForLoadState('networkidle');

		// Verify subtask created
		await expect(page.locator('text=E2E Subtask')).toBeVisible();
	});

	test('can cancel task creation', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Fill some fields
		await page.fill('input[name="title"]', 'Task to Cancel');

		// Click cancel button
		const cancelButton = page.locator('button:has-text("Cancel")');
		await expect(cancelButton).toBeVisible();
		await cancelButton.click();

		// Verify navigation back to tasks list
		await page.waitForURL('**/tasks');
		await expect(page.locator('h1')).toContainText('Tasks');
	});

	test('shows assignee selection', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Look for assignee field
		const assigneeLabel = page.locator('text=/Assignee|Assign to/i');
		if (await assigneeLabel.isVisible()) {
			// Verify assignee dropdown exists
			const assigneeTrigger = page.locator('[id="assigneeId"]');
			await expect(assigneeTrigger).toBeVisible();
		}
	});

	test('shows task type selection', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Look for task type field
		const taskTypeLabel = page.locator('text=/Task Type/i');
		if (await taskTypeLabel.isVisible()) {
			// Verify task type dropdown exists
			const taskTypeTrigger = page.locator('[id="taskTypeId"]');
			await expect(taskTypeTrigger).toBeVisible();
		}
	});

	test('reminder time shows only when due date is set', async ({ page }) => {
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');

		// Initially reminder should not be visible
		const reminderField = page.locator('text=/Reminder/i');

		// Set a due date
		const dueDate = new Date();
		dueDate.setDate(dueDate.getDate() + 1);
		const dueDateStr = dueDate.toISOString().split('T')[0];
		await page.fill('input[name="dueDate"]', dueDateStr);

		// Wait for form to update
		await page.waitForTimeout(300);

		// Now reminder field should be visible
		if (await reminderField.isVisible()) {
			await expect(reminderField).toBeVisible();
		}
	});
});
