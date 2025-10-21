/**
 * Contract Test: Create Task Dependency Mutation
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the createTaskDependency GraphQL mutation with circular dependency prevention.
 */

import { test, expect } from '@playwright/test';

test.describe('CreateTaskDependency Mutation Contract', () => {
	let taskAId: string;
	let taskBId: string;

	test.beforeEach(async ({ page }) => {
		// Create two tasks for dependency testing
		await page.goto('/dashboard/tasks/create');
		await page.fill('input[name="title"]', 'Task A - Blocking');
		await page.click('button:has-text("Create Task")');
		await page.waitForURL(/\/dashboard\/tasks\/[a-f0-9-]+/);

		// Store Task A ID from URL
		taskAId = page.url().split('/').pop()!;

		// Create Task B
		await page.goto('/dashboard/tasks/create');
		await page.fill('input[name="title"]', 'Task B - Blocked');
		await page.click('button:has-text("Create Task")');
		await page.waitForURL(/\/dashboard\/tasks\/[a-f0-9-]+/);

		taskBId = page.url().split('/').pop()!;
	});

	test('Create valid dependency between tasks', async ({ page }) => {
		// Go to Task B (blocked task)
		await page.goto(`/dashboard/tasks/${taskBId}`);

		// Click add dependency button
		const addDependencyButton = page.locator('button:has-text("Add Dependency")');
		await addDependencyButton.click();

		// Modal appears
		const modal = page.locator('[role="dialog"]');
		await expect(modal).toBeVisible();

		// Select blocking task (Task A)
		const blockingTaskSelect = modal.locator('select[name="blockingTaskId"]');
		await blockingTaskSelect.selectOption(taskAId);

		// Confirm
		await modal.locator('button:has-text("Add")').click();

		// Verify success toast
		await expect(page.locator('.toast:has-text("Dependency added")')).toBeVisible({ timeout: 3000 });

		// Verify dependency appears in UI
		await expect(page.locator('.dependency-item:has-text("Task A")')).toBeVisible();
		await expect(page.locator('.badge:has-text("Blocked by")')).toBeVisible();
	});

	test('Circular dependency blocked with error', async ({ page }) => {
		// Create Task A depends on Task B
		await page.goto(`/dashboard/tasks/${taskAId}`);
		await page.locator('button:has-text("Add Dependency")').click();

		let modal = page.locator('[role="dialog"]');
		await modal.locator('select[name="blockingTaskId"]').selectOption(taskBId);
		await modal.locator('button:has-text("Add")').click();

		await expect(page.locator('.toast:has-text("Dependency added")')).toBeVisible({ timeout: 3000 });

		// Now try to create Task B depends on Task A (creates cycle)
		await page.goto(`/dashboard/tasks/${taskBId}`);
		await page.locator('button:has-text("Add Dependency")').click();

		modal = page.locator('[role="dialog"]');
		await modal.locator('select[name="blockingTaskId"]').selectOption(taskAId);

		// Intercept mutation to check error
		const dependencyMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'CreateTaskDependency'
		);

		await modal.locator('button:has-text("Add")').click();

		const response = await dependencyMutation;
		const responseData = await response.json();

		// Should have error about circular dependency
		expect(responseData.errors).toBeDefined();
		expect(responseData.errors[0].message).toContain('Circular dependency');

		// Verify error toast
		await expect(page.locator('.toast:has-text("Circular dependency")')).toBeVisible();
	});

	test('Self-dependency blocked', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${taskAId}`);
		await page.locator('button:has-text("Add Dependency")').click();

		const modal = page.locator('[role="dialog"]');

		// Try to select self as blocking task
		const blockingTaskSelect = modal.locator('select[name="blockingTaskId"]');

		// Current task should not be in options OR should be disabled
		const options = await blockingTaskSelect.locator('option').allTextContents();
		expect(options).not.toContain('Task A - Blocking');
	});

	test('Dependency appears in blocked task details', async ({ page }) => {
		// Create dependency
		await page.goto(`/dashboard/tasks/${taskBId}`);
		await page.locator('button:has-text("Add Dependency")').click();

		const modal = page.locator('[role="dialog"]');
		await modal.locator('select[name="blockingTaskId"]').selectOption(taskAId);
		await modal.locator('button:has-text("Add")').click();

		await expect(page.locator('.toast:has-text("Dependency added")')).toBeVisible({ timeout: 3000 });

		// Verify dependency section shows blocking task
		const dependencySection = page.locator('.dependencies-section, section:has-text("Dependencies")');
		await expect(dependencySection).toBeVisible();
		await expect(dependencySection.locator('.dependency-item:has-text("Task A")')).toBeVisible();

		// Should show "Blocked by" indicator
		await expect(dependencySection.locator('text=/Blocked by/')).toBeVisible();

		// Should have link to blocking task
		const linkToTaskA = dependencySection.locator(`a[href="/dashboard/tasks/${taskAId}"]`);
		await expect(linkToTaskA).toBeVisible();
	});

	test('GraphQL response matches contract schema', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${taskBId}`);
		await page.locator('button:has-text("Add Dependency")').click();

		const modal = page.locator('[role="dialog"]');

		// Intercept mutation
		const dependencyMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'CreateTaskDependency'
		);

		await modal.locator('select[name="blockingTaskId"]').selectOption(taskAId);
		await modal.locator('button:has-text("Add")').click();

		const response = await dependencyMutation;
		const responseData = await response.json();

		// Verify response structure
		expect(responseData.data.createTaskDependency).toBeDefined();
		expect(responseData.data.createTaskDependency.taskDependency).toHaveProperty('id');
		expect(responseData.data.createTaskDependency.taskDependency).toHaveProperty('blockingTaskId');
		expect(responseData.data.createTaskDependency.taskDependency).toHaveProperty('blockedTaskId');
		expect(responseData.data.createTaskDependency.taskDependency).toHaveProperty('dependencyType');
		expect(responseData.data.createTaskDependency.taskDependency).toHaveProperty('createdAt');

		// Verify IDs match
		expect(responseData.data.createTaskDependency.taskDependency.blockingTaskId).toBe(taskAId);
		expect(responseData.data.createTaskDependency.taskDependency.blockedTaskId).toBe(taskBId);
	});
});
