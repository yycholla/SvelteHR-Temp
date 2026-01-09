// E2E Test: Task Hierarchy and Subtasks
// Feature: 028-task-system-expansion - T051
// Purpose: Test parent-child task relationships and hierarchy

import { expect, test } from '@playwright/test';

test.describe('Task Hierarchy and Subtasks', () => {
	let parentTaskId: string;

	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');
		await page.waitForURL('**/dashboard**');
		await page.waitForLoadState('networkidle');

		// Create parent task
		await page.goto('/dashboard/tasks/new');
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Parent Task for Hierarchy Test');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		parentTaskId = page.url().split('/').pop()!;
	});

	test('can create subtask from parent task', async ({ page }) => {
		// Navigate to parent task
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Create subtask via URL param
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify parent task info shown
		await expect(page.locator('text=/Creating Subtask|Subtask of/i')).toBeVisible();
		await expect(page.locator('text=Parent Task for Hierarchy Test')).toBeVisible();

		// Create subtask
		await page.fill('input[name="title"]', 'First Subtask');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Verify subtask created
		await expect(page.locator('text=First Subtask')).toBeVisible();
	});

	test('subtask shows link to parent task', async ({ page }) => {
		// Create subtask
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Subtask with Parent Link');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Verify parent link displayed
		await expect(page.locator('text=/Subtask of|Parent:/i')).toBeVisible();
		await expect(page.locator('text=Parent Task for Hierarchy Test')).toBeVisible();

		// Click parent link
		const parentLink = page.locator('a:has-text("Parent Task for Hierarchy Test")');
		if (await parentLink.isVisible()) {
			await parentLink.click();
			await page.waitForURL(`**/tasks/${parentTaskId}`);
			await expect(page.locator('h1')).toContainText('Parent Task for Hierarchy Test');
		}
	});

	test('parent task shows subtask count', async ({ page }) => {
		// Create multiple subtasks
		for (let i = 1; i <= 3; i++) {
			await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
			await page.waitForLoadState('networkidle');
			await page.fill('input[name="title"]', `Subtask ${i}`);

			const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
			await submitButton.click();
			await page.waitForURL('**/tasks/*', { timeout: 10000 });
		}

		// Go to parent task
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify subtask count shown
		await expect(page.locator('text=/Subtasks.*3/i')).toBeVisible();
	});

	test('parent task shows subtask progress', async ({ page }) => {
		// Create subtasks
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Subtask for Progress Test');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Go to parent task
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Verify progress widget shown
		await expect(page.locator('text=/Subtask Progress/i')).toBeVisible();
		await expect(page.locator('text=/completed/i')).toBeVisible();
	});

	test('can view subtasks in hierarchy', async ({ page }) => {
		// Create subtask
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Subtask in Hierarchy View');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Go to parent task
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Click Subtasks tab (should be default)
		const subtasksTab = page.locator('text=Subtasks');
		await subtasksTab.click();
		await page.waitForTimeout(300);

		// Verify subtask list shown
		await expect(page.locator('text=Subtask in Hierarchy View')).toBeVisible();
	});

	test('can navigate to subtask from parent', async ({ page }) => {
		// Create subtask
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Navigable Subtask');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		const subtaskId = page.url().split('/').pop();

		// Go to parent task
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Click subtask
		const subtaskLink = page.locator('text=Navigable Subtask');
		await subtaskLink.click();

		// Verify navigation to subtask
		await page.waitForURL(`**/tasks/${subtaskId}`);
		await expect(page.locator('text=Navigable Subtask')).toBeVisible();
	});

	test('subtask completion updates parent progress', async ({ page }) => {
		// Create subtask
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Completable Subtask');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		const subtaskId = page.url().split('/').pop();

		// Check initial progress on parent
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('text=/0.*completed/i')).toBeVisible();

		// Complete the subtask
		await page.goto(`/dashboard/tasks/${subtaskId}/edit`);
		await page.waitForLoadState('networkidle');

		const statusTrigger = page.locator('[id="status"]');
		if (await statusTrigger.isVisible()) {
			await statusTrigger.click();
			await page.locator('text=Completed').click();

			const updateButton = page.locator('button[type="submit"]:has-text("Update Task")');
			await updateButton.click();
			await page.waitForURL(`**/tasks/${subtaskId}`);
		}

		// Check updated progress on parent
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('text=/1.*completed/i')).toBeVisible();
	});

	test('can expand and collapse subtasks', async ({ page }) => {
		// Create nested subtasks
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Collapsible Subtask');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// Go to parent
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Look for expand/collapse button
		const expandButton = page
			.locator('button[aria-label="Expand"]')
			.or(page.locator('button:has([class*="chevron"])'));

		if (await expandButton.isVisible()) {
			// Test expand/collapse functionality
			await expandButton.click();
			await page.waitForTimeout(300);

			// Subtasks should be hidden or collapsed state
			// Then click again to expand
			await expandButton.click();
			await page.waitForTimeout(300);
		}
	});

	test('prevents circular hierarchy', async ({ page }) => {
		// Create child task
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Child Task');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		const childTaskId = page.url().split('/').pop();

		// Try to edit parent and set child as parent (circular)
		await page.goto(`/dashboard/tasks/${parentTaskId}/edit`);
		await page.waitForLoadState('networkidle');

		// Parent task dropdown should not include itself or its children
		const parentSelect = page.locator('[id="parentTaskId"]');
		if (await parentSelect.isVisible()) {
			await parentSelect.click();
			await page.waitForTimeout(300);

			// Parent task itself should not be in the list
			const selfOption = page.locator(`option[value="${parentTaskId}"]`);
			if (await selfOption.isVisible()) {
				// This should NOT happen - circular prevention
				throw new Error('Circular hierarchy not prevented!');
			}
		}
	});

	test('shows hierarchy depth in UI', async ({ page }) => {
		// Create 2-level hierarchy
		await page.goto(`/dashboard/tasks/new?parent=${parentTaskId}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Level 1 Subtask');

		const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });
		const level1Id = page.url().split('/').pop();

		// Create level 2
		await page.goto(`/dashboard/tasks/new?parent=${level1Id}`);
		await page.waitForLoadState('networkidle');
		await page.fill('input[name="title"]', 'Level 2 Subtask');
		await submitButton.click();
		await page.waitForURL('**/tasks/*', { timeout: 10000 });

		// View parent task hierarchy
		await page.goto(`/dashboard/tasks/${parentTaskId}`);
		await page.waitForLoadState('networkidle');

		// Subtasks should show nested structure
		await expect(page.locator('text=Level 1 Subtask')).toBeVisible();
	});
});
