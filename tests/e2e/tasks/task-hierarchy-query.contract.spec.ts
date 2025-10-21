/**
 * Contract Test: TaskHierarchy Query
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the taskHierarchy GraphQL query with nested subtasks and progress calculation.
 */

import { test, expect } from '@playwright/test';

test.describe('TaskHierarchy Query Contract', () => {
	let parentTaskId: string;

	test.beforeEach(async ({ page }) => {
		// Create parent task
		await page.goto('/dashboard/tasks/create');
		await page.fill('input[name="title"]', 'Parent Task - Project Alpha');
		await page.fill('textarea[name="description"]', 'Main project coordination task');
		await page.click('button:has-text("Create Task")');
		await page.waitForURL(/\/dashboard\/tasks\/[a-f0-9-]+/);

		parentTaskId = page.url().split('/').pop()!;

		// Create 3 subtasks
		for (let i = 1; i <= 3; i++) {
			await page.goto('/dashboard/tasks/create');
			await page.fill('input[name="title"]', `Subtask ${i}`);

			// Select parent task
			await page.selectOption('select[name="parentTaskId"]', parentTaskId);

			// Set status (make 2 completed)
			if (i <= 2) {
				await page.selectOption('select[name="status"]', 'Completed');
			}

			await page.click('button:has-text("Create Task")');
			await page.waitForURL(/\/dashboard\/tasks/);
		}
	});

	test('Get parent with all subtasks', async ({ page }) => {
		// Navigate to parent task
		await page.goto(`/dashboard/tasks/${parentTaskId}`);

		// Intercept hierarchy query
		const hierarchyResponse = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'TaskHierarchy'
		);

		const responseData = await hierarchyResponse.json();
		const task = responseData.data.taskHierarchy;

		// Verify parent task returned
		expect(task.id).toBe(parentTaskId);
		expect(task.title).toBe('Parent Task - Project Alpha');

		// Verify subtasks populated
		expect(task.subtasks).toBeInstanceOf(Array);
		expect(task.subtasks.length).toBe(3);

		// Verify subtasks have correct parent reference
		for (const subtask of task.subtasks) {
			expect(subtask.parentTaskId).toBe(parentTaskId);
		}
	});

	test('Nested subtasks up to 3 levels', async ({ page }) => {
		// Create level 2 subtask (child of subtask 1)
		const level1SubtaskId = await page.evaluate(async (parentId) => {
			// Get first subtask from parent
			const response = await fetch('/graphql', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `query { task(id: "${parentId}") { subtasks { id } } }`
				})
			});
			const data = await response.json();
			return data.data.task.subtasks[0].id;
		}, parentTaskId);

		// Create level 2 subtask
		await page.goto('/dashboard/tasks/create');
		await page.fill('input[name="title"]', 'Level 2 Subtask');
		await page.selectOption('select[name="parentTaskId"]', level1SubtaskId);
		await page.click('button:has-text("Create Task")');

		// Query hierarchy from parent
		await page.goto(`/dashboard/tasks/${parentTaskId}`);

		const hierarchyResponse = await page.waitForResponse((response) =>
			response.url().includes('graphql')
		);

		const responseData = await hierarchyResponse.json();
		const task = responseData.data.taskHierarchy;

		// Verify nested structure
		expect(task.subtasks).toHaveLength(3);
		const level1Task = task.subtasks.find((t: any) => t.id === level1SubtaskId);
		expect(level1Task).toBeDefined();
		expect(level1Task.subtasks).toBeInstanceOf(Array);
		expect(level1Task.subtasks.length).toBe(1);
		expect(level1Task.subtasks[0].title).toBe('Level 2 Subtask');
	});

	test('Subtask completion progress calculated correctly', async ({ page }) => {
		// Navigate to parent task details
		await page.goto(`/dashboard/tasks/${parentTaskId}`);

		// Query should include subtaskProgress field
		const response = await page.waitForResponse((response) => response.url().includes('graphql'));

		const responseData = await response.json();
		const task = responseData.data.taskHierarchy;

		// 2 out of 3 subtasks completed = 66.67% (rounded to 67%)
		expect(task.subtaskProgress).toBeCloseTo(66.67, 1);

		// Verify UI displays progress
		const progressBar = page.locator('.progress-bar, [role="progressbar"]');
		await expect(progressBar).toBeVisible();

		const progressText = page.locator('text=/67%|2.*3/');
		await expect(progressText).toBeVisible();
	});

	test('Null parentTaskId returns top-level tasks only', async ({ page }) => {
		// Navigate to tasks list with hierarchy view
		await page.goto('/dashboard/tasks?view=hierarchy');

		const response = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.variables?.filter?.parentTaskId === null
		);

		const responseData = await response.json();
		const tasks = responseData.data.allTasks.nodes;

		// All tasks should have null parentTaskId
		for (const task of tasks) {
			expect(task.parentTaskId).toBeNull();
		}

		// Verify subtasks not shown at root level
		const taskItems = page.locator('.task-item[data-level="0"]');
		expect(await taskItems.count()).toBe(tasks.length);
	});

	test('Hierarchy view shows indented subtasks', async ({ page }) => {
		await page.goto('/dashboard/tasks');

		// Toggle hierarchy view
		const hierarchyToggle = page.locator('button:has-text("Hierarchy"), input[name="viewMode"][value="hierarchy"]');
		await hierarchyToggle.click();

		await page.waitForResponse((response) => response.url().includes('graphql'));

		// Verify parent task visible
		const parentTask = page.locator(`.task-item:has-text("Parent Task - Project Alpha")`);
		await expect(parentTask).toBeVisible();

		// Verify subtasks are indented
		const subtasks = page.locator('.task-item[data-parent-id]');
		expect(await subtasks.count()).toBeGreaterThan(0);

		// Verify visual indentation (CSS class or style)
		const firstSubtask = subtasks.first();
		const hasIndentation = await firstSubtask.evaluate((el) => {
			const marginLeft = window.getComputedStyle(el).marginLeft;
			const paddingLeft = window.getComputedStyle(el).paddingLeft;
			return parseInt(marginLeft) > 0 || parseInt(paddingLeft) > 20;
		});

		expect(hasIndentation).toBe(true);
	});

	test('Expand/collapse subtasks functionality', async ({ page }) => {
		await page.goto('/dashboard/tasks?view=hierarchy');

		// Find parent task with expand button
		const parentTaskRow = page.locator(`.task-item:has-text("Parent Task - Project Alpha")`);
		const expandButton = parentTaskRow.locator('button[aria-label*="Expand"], button:has-text("▶")');

		// Initially collapsed (or expanded)
		await expandButton.click();

		// Wait for animation
		await page.waitForTimeout(300);

		// Subtasks should be visible
		const subtasksVisible = page.locator('.task-item[data-parent-id]:visible');
		expect(await subtasksVisible.count()).toBeGreaterThan(0);

		// Click again to collapse
		await expandButton.click();
		await page.waitForTimeout(300);

		// Subtasks should be hidden
		const subtasksHidden = page.locator('.task-item[data-parent-id]:visible');
		expect(await subtasksHidden.count()).toBe(0);
	});

	test('GraphQL response includes recursive subtask structure', async ({ page }) => {
		await page.goto(`/dashboard/tasks/${parentTaskId}`);

		const response = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'TaskHierarchy'
		);

		const responseData = await response.json();
		const task = responseData.data.taskHierarchy;

		// Verify response structure matches contract
		expect(task).toHaveProperty('id');
		expect(task).toHaveProperty('title');
		expect(task).toHaveProperty('subtasks');
		expect(task).toHaveProperty('subtaskProgress');

		// Subtasks should have same structure
		if (task.subtasks.length > 0) {
			const subtask = task.subtasks[0];
			expect(subtask).toHaveProperty('id');
			expect(subtask).toHaveProperty('title');
			expect(subtask).toHaveProperty('parentTaskId');
			expect(subtask.parentTaskId).toBe(parentTaskId);

			// Subtasks can have their own subtasks
			expect(subtask).toHaveProperty('subtasks');
		}
	});
});
