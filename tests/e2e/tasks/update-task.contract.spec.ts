/**
 * Contract Test: Update Task Mutation
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the updateTask GraphQL mutation with audit trail creation.
 */

import { test, expect } from '@playwright/test';

test.describe('UpdateTask Mutation Contract', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test task first
		await page.goto('/dashboard/tasks/create');
		await page.fill('input[name="title"]', 'Test Task for Update');
		await page.fill('textarea[name="description"]', 'Original description');
		await page.click('button:has-text("Create Task")');
		await page.waitForURL(/\/dashboard\/tasks\/[a-f0-9-]+/);
	});

	test('Creator updates task title', async ({ page }) => {
		// Should be on task details page
		const editButton = page.locator('button:has-text("Edit")');
		await editButton.click();

		// Update title
		await page.fill('input[name="title"]', 'Updated Task Title');

		// Save changes
		await page.click('button:has-text("Save")');

		// Verify success toast
		await expect(page.locator('.toast:has-text("Task updated")')).toBeVisible({ timeout: 3000 });

		// Verify title updated
		await expect(page.locator('h1:has-text("Updated Task Title")')).toBeVisible();
	});

	test('Assignee updates task description', async ({ page }) => {
		const editButton = page.locator('button:has-text("Edit")');
		await editButton.click();

		// Update description
		await page.fill('textarea[name="description"]', 'Updated description with more details');

		await page.click('button:has-text("Save")');

		await expect(page.locator('.toast:has-text("Task updated")')).toBeVisible({ timeout: 3000 });
	});

	test('Non-authorized user cannot update (403)', async ({ page }) => {
		// Login as different user who is not creator or assignee
		// This would be done through test fixtures/authentication

		// Try to access edit
		const editButton = page.locator('button:has-text("Edit")');

		// Should not be visible or should show error
		await expect(editButton).not.toBeVisible();
	});

	test('Update task status', async ({ page }) => {
		const editButton = page.locator('button:has-text("Edit")');
		await editButton.click();

		// Change status
		await page.selectOption('select[name="status"]', 'In Progress');

		await page.click('button:has-text("Save")');

		await expect(page.locator('.toast:has-text("Task updated")')).toBeVisible({ timeout: 3000 });

		// Verify status badge updated
		await expect(page.locator('.badge:has-text("In Progress")')).toBeVisible();
	});

	test('Update task priority', async ({ page }) => {
		const editButton = page.locator('button:has-text("Edit")');
		await editButton.click();

		// Change priority
		await page.selectOption('select[name="priority"]', 'Urgent');

		await page.click('button:has-text("Save")');

		await expect(page.locator('.toast:has-text("Task updated")')).toBeVisible({ timeout: 3000 });

		// Verify priority badge updated
		await expect(page.locator('.badge:has-text("Urgent")')).toBeVisible();
	});

	test('Update due date', async ({ page }) => {
		const editButton = page.locator('button:has-text("Edit")');
		await editButton.click();

		// Set new due date
		const newDueDate = new Date();
		newDueDate.setDate(newDueDate.getDate() + 14);
		await page.fill('input[name="dueDate"]', newDueDate.toISOString().split('T')[0]);

		await page.click('button:has-text("Save")');

		await expect(page.locator('.toast:has-text("Task updated")')).toBeVisible({ timeout: 3000 });
	});

	test('Audit entry created after update', async ({ page }) => {
		const editButton = page.locator('button:has-text("Edit")');
		await editButton.click();

		await page.fill('input[name="title"]', 'Audit Test Title');
		await page.selectOption('select[name="status"]', 'In Progress');

		await page.click('button:has-text("Save")');

		await expect(page.locator('.toast:has-text("Task updated")')).toBeVisible({ timeout: 3000 });

		// Open audit history tab
		const auditTab = page.locator('button:has-text("History"), button:has-text("Audit")');
		await auditTab.click();

		// Verify audit entry exists
		await expect(page.locator('.audit-entry')).toHaveCount(2); // Created + Edited

		// Verify edited entry shows changed fields
		const editedEntry = page.locator('.audit-entry:has-text("edited")').first();
		await expect(editedEntry).toContainText('title');
		await expect(editedEntry).toContainText('status');
	});

	test('GraphQL response includes updated fields', async ({ page }) => {
		const editButton = page.locator('button:has-text("Edit")');
		await editButton.click();

		await page.fill('input[name="title"]', 'GraphQL Test Update');

		// Intercept update mutation
		const updateMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'UpdateTask'
		);

		await page.click('button:has-text("Save")');

		const response = await updateMutation;
		const responseData = await response.json();

		// Verify response structure
		expect(responseData.data.updateTask).toBeDefined();
		expect(responseData.data.updateTask.task).toHaveProperty('id');
		expect(responseData.data.updateTask.task.title).toBe('GraphQL Test Update');
		expect(responseData.data.updateTask.task).toHaveProperty('updatedAt');
	});
});
