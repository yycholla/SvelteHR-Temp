/**
 * Contract Test: Create Task Mutation
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the createTask GraphQL mutation with RBAC enforcement.
 */

import { expect, test } from '@playwright/test';

test.describe('CreateTask Mutation Contract', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to task creation page
		await page.goto('/dashboard/tasks/create');
	});

	test('Employee creates self-assigned task', async ({ page }) => {
		// Fill task form
		await page.fill('input[name="title"]', 'Complete onboarding documentation');
		await page.fill('textarea[name="description"]', 'Review and complete all onboarding forms');

		// Select task type (should default to General)
		await page.selectOption('select[name="taskTypeId"]', { label: 'General' });

		// Priority should default to Medium
		// Status should default to To Do

		// Set due date (7 days from now)
		const dueDate = new Date();
		dueDate.setDate(dueDate.getDate() + 7);
		await page.fill('input[name="dueDate"]', dueDate.toISOString().split('T')[0]);

		// Submit form
		await page.click('button:has-text("Create Task")');

		// Verify success toast
		await expect(page.locator('.toast:has-text("Task created")')).toBeVisible({ timeout: 3000 });

		// Verify redirect to task details or my tasks
		await expect(page).toHaveURL(/\/dashboard\/tasks/);
	});

	test('Manager creates task for direct report', async ({ page }) => {
		// Login as manager (this test assumes manager authentication)
		await page.goto('/dashboard/tasks/create');

		await page.fill('input[name="title"]', 'Review Q4 performance metrics');
		await page.fill('textarea[name="description"]', 'Prepare for annual review');

		// Select assignee (should show manager + direct reports)
		const assigneeSelect = page.locator('select[name="assigneeId"]');
		await expect(assigneeSelect).toBeVisible();

		// Verify dropdown contains direct reports
		const options = await assigneeSelect.locator('option').allTextContents();
		expect(options.length).toBeGreaterThan(1); // Self + at least one direct report

		// Select a direct report (assume second option)
		await assigneeSelect.selectOption({ index: 1 });

		await page.selectOption('select[name="taskTypeId"]', { label: 'Assessment' });
		await page.selectOption('select[name="priority"]', 'High');

		await page.click('button:has-text("Create Task")');

		await expect(page.locator('.toast:has-text("Task created")')).toBeVisible({ timeout: 3000 });
	});

	test('Admin creates task for any employee', async ({ page }) => {
		// Login as admin
		await page.goto('/dashboard/tasks/create');

		await page.fill('input[name="title"]', 'System maintenance task');

		// Admin should see ALL users in assignee dropdown
		const assigneeSelect = page.locator('select[name="assigneeId"]');
		const options = await assigneeSelect.locator('option').allTextContents();

		// Should have many options for admin
		expect(options.length).toBeGreaterThanOrEqual(5);

		await assigneeSelect.selectOption({ index: 3 });
		await page.selectOption('select[name="taskTypeId"]', { label: 'General' });

		await page.click('button:has-text("Create Task")');

		await expect(page.locator('.toast:has-text("Task created")')).toBeVisible({ timeout: 3000 });
	});

	test('Employee cannot assign to others (RBAC validation)', async ({ page }) => {
		// Login as employee
		await page.goto('/dashboard/tasks/create');

		// Employee should only see themselves in assignee dropdown
		const assigneeSelect = page.locator('select[name="assigneeId"]');
		const options = await assigneeSelect.locator('option').allTextContents();

		// Should have exactly 1 option (self)
		expect(options.length).toBe(1);

		// Try to submit with another user ID via API manipulation would fail
		// This is enforced server-side via RLS policies
	});

	test('Invalid taskTypeId fails validation', async ({ page }) => {
		await page.fill('input[name="title"]', 'Test Task');

		// Try to submit with invalid task type
		await page.evaluate(() => {
			const select = document.querySelector('select[name="taskTypeId"]') as HTMLSelectElement;
			if (select) {
				const option = document.createElement('option');
				option.value = 'invalid-uuid-123';
				option.text = 'Invalid Type';
				select.appendChild(option);
				select.value = 'invalid-uuid-123';
			}
		});

		await page.click('button:has-text("Create Task")');

		// Should show validation error
		await expect(page.locator('text=/Invalid task type|Task type not found/')).toBeVisible();
	});

	test('Title too long fails validation', async ({ page }) => {
		// Enter 256 characters (exceeds 255 limit)
		const longTitle = 'A'.repeat(256);
		await page.fill('input[name="title"]', longTitle);

		await page.click('button:has-text("Create Task")');

		// Verify validation error
		await expect(page.locator('text=/Title must be.*255 characters/')).toBeVisible();
	});

	test('GraphQL response schema matches contract', async ({ page }) => {
		await page.fill('input[name="title"]', 'Schema validation task');

		// Intercept GraphQL mutation
		const createMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'CreateTask'
		);

		await page.click('button:has-text("Create Task")');

		const response = await createMutation;
		const responseData = await response.json();

		// Verify response structure matches GraphQL contract
		expect(responseData.data.createTask).toBeDefined();
		expect(responseData.data.createTask.task).toHaveProperty('id');
		expect(responseData.data.createTask.task).toHaveProperty('title');
		expect(responseData.data.createTask.task).toHaveProperty('status');
		expect(responseData.data.createTask.task).toHaveProperty('priority');
		expect(responseData.data.createTask.task).toHaveProperty('createdAt');

		// Verify task appears in database
		await page.goto('/dashboard/tasks');
		await expect(page.locator('.task-item:has-text("Schema validation task")')).toBeVisible();
	});
});
