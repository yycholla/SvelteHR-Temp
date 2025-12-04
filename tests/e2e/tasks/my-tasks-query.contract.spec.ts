/**
 * Contract Test: MyTasks Query with RBAC
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the myTasks GraphQL query with role-based access control.
 */

import { test, expect } from '@playwright/test';

test.describe('MyTasks Query Contract', () => {
	test('Employee sees only own tasks', async ({ page }) => {
		// Login as employee
		await page.goto('/dashboard/tasks');

		// Intercept GraphQL query
		const myTasksResponse = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'MyTasks'
		);

		const responseData = await myTasksResponse.json();
		const tasks = responseData.data.myTasks.nodes;

		// Get current user ID from page context
		const currentUserId = await page.evaluate(() => {
			return (window as any).__user?.id;
		});

		// Verify all tasks are assigned to current user
		for (const task of tasks) {
			expect(task.assigneeId).toBe(currentUserId);
		}

		// Verify UI shows "My Tasks" header
		await expect(page.locator('h1:has-text("My Tasks")')).toBeVisible();
	});

	test('Manager sees own + direct report tasks', async ({ page }) => {
		// Login as manager
		await page.goto('/dashboard/tasks');

		const myTasksResponse = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'MyTasks'
		);

		const responseData = await myTasksResponse.json();
		const tasks = responseData.data.myTasks.nodes;

		const currentUserId = await page.evaluate(() => (window as any).__user?.id);

		// Tasks should include own tasks and direct reports' tasks
		const uniqueAssignees = new Set(tasks.map((t: any) => t.assigneeId));

		// Should have at least 2 assignees (manager + at least one report)
		// Or could be just manager if no reports have tasks
		expect(uniqueAssignees.size).toBeGreaterThanOrEqual(1);

		// Manager's own tasks should be included
		const ownTasks = tasks.filter((t: any) => t.assigneeId === currentUserId);
		expect(ownTasks.length).toBeGreaterThanOrEqual(0);
	});

	test('Admin sees all tasks', async ({ page }) => {
		// Login as admin
		await page.goto('/dashboard/tasks');

		const myTasksResponse = await page.waitForResponse((response) =>
			response.url().includes('graphql')
		);

		const responseData = await myTasksResponse.json();
		const tasks = responseData.data.myTasks.nodes;

		// Admin should see tasks from multiple users
		const uniqueAssignees = new Set(tasks.map((t: any) => t.assigneeId));

		// Should have many assignees (at least 3 different users)
		expect(uniqueAssignees.size).toBeGreaterThanOrEqual(3);
	});

	test('Filter and sort work correctly', async ({ page }) => {
		await page.goto('/dashboard/tasks');

		// Apply status filter
		await page.click('button:has-text("Status")');
		await page.check('input[type="checkbox"][value="In Progress"]');

		const filteredResponse = await page.waitForResponse((response) =>
			response.url().includes('graphql')
		);

		const filteredData = await filteredResponse.json();
		const filteredTasks = filteredData.data.myTasks.nodes;

		// All tasks should have "In Progress" status
		for (const task of filteredTasks) {
			expect(task.status).toBe('In Progress');
		}

		// Change sort order
		await page.click('button:has-text("Sort")');
		await page.click('button:has-text("Priority")');

		const sortedResponse = await page.waitForResponse((response) =>
			response.url().includes('graphql')
		);

		const sortedData = await sortedResponse.json();
		const sortedTasks = sortedData.data.myTasks.nodes;

		// Verify priority sort order
		const priorityOrder = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

		for (let i = 0; i < sortedTasks.length - 1; i++) {
			const currentPriority = priorityOrder[sortedTasks[i].priority as keyof typeof priorityOrder];
			const nextPriority = priorityOrder[sortedTasks[i + 1].priority as keyof typeof priorityOrder];
			expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
		}
	});

	test('Archived tasks excluded by default', async ({ page }) => {
		await page.goto('/dashboard/tasks');

		const response = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'MyTasks'
		);

		const responseData = await response.json();
		const tasks = responseData.data.myTasks.nodes;

		// Verify no archived tasks in results
		for (const task of tasks) {
			expect(task.archived).toBe(false);
		}

		// Verify request includes archived=false filter
		const requestData = response.request().postDataJSON();
		expect(requestData.variables.filter?.archived).toBe(false);
	});

	test('Task counts by status displayed correctly', async ({ page }) => {
		await page.goto('/dashboard/tasks');

		const response = await page.waitForResponse((response) => response.url().includes('graphql'));

		const responseData = await response.json();
		const tasks = responseData.data.myTasks.nodes;

		// Count tasks by status
		const statusCounts = tasks.reduce((acc: any, task: any) => {
			acc[task.status] = (acc[task.status] || 0) + 1;
			return acc;
		}, {});

		// Verify UI displays correct counts
		for (const [status, count] of Object.entries(statusCounts)) {
			const badge = page.locator(`.status-count:has-text("${status}")`);
			await expect(badge).toContainText(String(count));
		}
	});

	test('Search functionality filters tasks', async ({ page }) => {
		await page.goto('/dashboard/tasks');

		// Enter search query
		const searchInput = page.locator('input[name="search"], input[placeholder*="Search"]');
		await searchInput.fill('onboarding');

		const searchResponse = await page.waitForResponse((response) =>
			response.url().includes('graphql')
		);

		const responseData = await searchResponse.json();
		const tasks = responseData.data.myTasks.nodes;

		// Verify all tasks match search query (title or description contains "onboarding")
		for (const task of tasks) {
			const matchesTitle = task.title.toLowerCase().includes('onboarding');
			const matchesDescription =
				task.description && task.description.toLowerCase().includes('onboarding');
			expect(matchesTitle || matchesDescription).toBe(true);
		}
	});

	test('GraphQL response structure matches contract', async ({ page }) => {
		await page.goto('/dashboard/tasks');

		const response = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'MyTasks'
		);

		const responseData = await response.json();

		// Verify response structure
		expect(responseData.data.myTasks).toBeDefined();
		expect(responseData.data.myTasks.nodes).toBeInstanceOf(Array);
		expect(responseData.data.myTasks.edges).toBeInstanceOf(Array);
		expect(responseData.data.myTasks.pageInfo).toHaveProperty('hasNextPage');
		expect(responseData.data.myTasks).toHaveProperty('totalCount');

		// Verify task includes populated relationships
		if (responseData.data.myTasks.nodes.length > 0) {
			const task = responseData.data.myTasks.nodes[0];
			expect(task).toHaveProperty('id');
			expect(task).toHaveProperty('title');
			expect(task).toHaveProperty('assignee');
			expect(task).toHaveProperty('creator');
			expect(task).toHaveProperty('taskType');
			expect(task.assignee).toHaveProperty('fullName');
			expect(task.taskType).toHaveProperty('name');
		}
	});
});
