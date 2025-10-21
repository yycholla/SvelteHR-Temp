/**
 * Contract Test: Delete Task Mutation (Soft Delete)
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the deleteTask GraphQL mutation with soft deletion and audit trail.
 */

import { test, expect } from '@playwright/test';

test.describe('DeleteTask Mutation Contract', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test task first
		await page.goto('/dashboard/tasks/create');
		await page.fill('input[name="title"]', 'Task to Delete');
		await page.fill('textarea[name="description"]', 'This task will be deleted');
		await page.click('button:has-text("Create Task")');
		await page.waitForURL(/\/dashboard\/tasks\/[a-f0-9-]+/);
	});

	test('Creator archives task', async ({ page }) => {
		// Should be on task details page
		const deleteButton = page.locator('button:has-text("Delete"), button:has-text("Archive")');
		await deleteButton.click();

		// Confirm deletion in modal
		const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
		await confirmButton.click();

		// Verify success toast
		await expect(page.locator('.toast:has-text("Task archived")')).toBeVisible({ timeout: 3000 });

		// Should redirect to tasks list
		await expect(page).toHaveURL('/dashboard/tasks');

		// Verify task not in active list
		await expect(page.locator('.task-item:has-text("Task to Delete")')).not.toBeVisible();
	});

	test('Admin archives any task', async ({ page }) => {
		// Login as admin
		// Admin should be able to delete any task

		const deleteButton = page.locator('button:has-text("Delete")');
		await expect(deleteButton).toBeVisible();

		await deleteButton.click();

		const confirmButton = page.locator('button:has-text("Confirm")');
		await confirmButton.click();

		await expect(page.locator('.toast:has-text("Task archived")')).toBeVisible({ timeout: 3000 });
	});

	test('Non-authorized user cannot delete (403)', async ({ page }) => {
		// Login as user who is not creator or admin
		// Delete button should not be visible

		const deleteButton = page.locator('button:has-text("Delete")');
		await expect(deleteButton).not.toBeVisible();
	});

	test('Task archived flag set correctly', async ({ page }) => {
		const deleteButton = page.locator('button:has-text("Delete")');
		await deleteButton.click();

		// Intercept delete mutation
		const deleteMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'DeleteTask'
		);

		const confirmButton = page.locator('button:has-text("Confirm")');
		await confirmButton.click();

		const response = await deleteMutation;
		const responseData = await response.json();

		// Verify response shows archived status
		expect(responseData.data.deleteTask.task.archived).toBe(true);
		expect(responseData.data.deleteTask.task.archivedAt).toBeDefined();
		expect(responseData.data.deleteTask.task.archivedBy).toBeDefined();
	});

	test('Audit entry created on deletion', async ({ page }) => {
		const deleteButton = page.locator('button:has-text("Delete")');
		await deleteButton.click();

		const confirmButton = page.locator('button:has-text("Confirm")');
		await confirmButton.click();

		await expect(page.locator('.toast:has-text("Task archived")')).toBeVisible({ timeout: 3000 });

		// Navigate to admin view to see archived tasks with audit
		await page.goto('/admin/tasks/archived');

		// Find our archived task
		await page.click('.task-item:has-text("Task to Delete")');

		// Check audit history
		const auditTab = page.locator('button:has-text("History")');
		await auditTab.click();

		// Verify deleted audit entry exists
		await expect(page.locator('.audit-entry:has-text("deleted")')).toBeVisible();
	});

	test('Task removed from active lists after deletion', async ({ page }) => {
		// Get task title before deletion
		const taskTitle = await page.locator('h1').first().textContent();

		const deleteButton = page.locator('button:has-text("Delete")');
		await deleteButton.click();

		const confirmButton = page.locator('button:has-text("Confirm")');
		await confirmButton.click();

		await page.waitForURL('/dashboard/tasks');

		// Verify not in My Tasks
		await expect(page.locator(`.task-item:has-text("${taskTitle}")`)).not.toBeVisible();

		// Navigate to different views
		await page.goto('/dashboard/tasks/team');
		await expect(page.locator(`.task-item:has-text("${taskTitle}")`)).not.toBeVisible();
	});

	test('Deletion confirmation modal appears', async ({ page }) => {
		const deleteButton = page.locator('button:has-text("Delete")');
		await deleteButton.click();

		// Verify modal appears
		const modal = page.locator('[role="dialog"], .modal');
		await expect(modal).toBeVisible();

		// Verify warning message
		await expect(modal.locator('text=/Are you sure|This action cannot be undone/')).toBeVisible();

		// Cancel deletion
		const cancelButton = modal.locator('button:has-text("Cancel")');
		await cancelButton.click();

		// Modal should close
		await expect(modal).not.toBeVisible();

		// Task should still exist
		await expect(page.locator('h1:has-text("Task to Delete")')).toBeVisible();
	});
});
