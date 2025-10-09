/**
 * Contract Test: AllTasks Query
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the allTasks GraphQL query with filters, sorting, and pagination.
 */

import { test, expect } from '@playwright/test';

test.describe('AllTasks Query Contract', () => {
	test.beforeEach(async ({ page }) => {
		// Login as admin to see all tasks
		await page.goto('/dashboard/tasks');
	});

	test('Filter by assigneeId', async ({ page }) => {
		// Select assignee filter
		const assigneeFilter = page.locator('select[name="assigneeFilter"]');
		await assigneeFilter.selectOption({ index: 1 }); // Select first user

		// Wait for results to update
		await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'AllTasks'
		);

		// Verify filtered tasks appear
		const taskItems = page.locator('.task-item');
		await expect(taskItems).toHaveCount(await taskItems.count());

		// All visible tasks should have the same assignee
		const assigneeNames = await taskItems.locator('.assignee-name').allTextContents();
		const uniqueAssignees = new Set(assigneeNames);
		expect(uniqueAssignees.size).toBe(1);
	});

	test('Filter by status', async ({ page }) => {
		// Select "In Progress" status filter
		await page.click('button:has-text("Status")');
		await page.click('input[type="checkbox"][value="In Progress"]');

		await page.waitForResponse((response) => response.url().includes('graphql'));

		// Verify only "In Progress" tasks shown
		const statusBadges = page.locator('.task-item .badge:has-text("In Progress")');
		const taskCount = await page.locator('.task-item').count();

		expect(await statusBadges.count()).toBe(taskCount);
	});

	test('Filter by priority', async ({ page }) => {
		// Select "High" priority filter
		await page.click('button:has-text("Priority")');
		await page.check('input[type="checkbox"][value="High"]');

		await page.waitForResponse((response) => response.url().includes('graphql'));

		// Verify only high priority tasks shown
		const priorityBadges = page.locator('.task-item .badge:has-text("High")');
		const taskCount = await page.locator('.task-item').count();

		expect(await priorityBadges.count()).toBe(taskCount);
	});

	test('Filter by taskTypeId', async ({ page }) => {
		// Select task type filter
		await page.click('button:has-text("Type")');
		await page.click('input[type="checkbox"][value="Onboarding"]');

		await page.waitForResponse((response) => response.url().includes('graphql'));

		// Verify only onboarding tasks shown
		const typeBadges = page.locator('.task-item .badge:has-text("Onboarding")');
		expect(await typeBadges.count()).toBeGreaterThan(0);
	});

	test('Filter by archived status', async ({ page }) => {
		// Show archived tasks toggle
		const showArchivedToggle = page.locator('input[type="checkbox"][name="showArchived"]');
		await showArchivedToggle.check();

		await page.waitForResponse((response) => response.url().includes('graphql'));

		// Archived tasks should appear with indicator
		await expect(page.locator('.task-item.archived')).toBeVisible();
	});

	test('Sort by created_at ASC', async ({ page }) => {
		// Click sort dropdown
		await page.click('button:has-text("Sort")');
		await page.click('button:has-text("Created (Oldest)")');

		const response = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'AllTasks'
		);

		const responseData = await response.json();

		// Verify sort order in response
		const tasks = responseData.data.allTasks.nodes;
		for (let i = 0; i < tasks.length - 1; i++) {
			const current = new Date(tasks[i].createdAt);
			const next = new Date(tasks[i + 1].createdAt);
			expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
		}
	});

	test('Sort by created_at DESC', async ({ page }) => {
		// Default sort should be newest first
		const response = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'AllTasks'
		);

		const responseData = await response.json();
		const tasks = responseData.data.allTasks.nodes;

		// Verify descending order
		for (let i = 0; i < tasks.length - 1; i++) {
			const current = new Date(tasks[i].createdAt);
			const next = new Date(tasks[i + 1].createdAt);
			expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
		}
	});

	test('Sort by due_date', async ({ page }) => {
		await page.click('button:has-text("Sort")');
		await page.click('button:has-text("Due Date")');

		const response = await page.waitForResponse((response) => response.url().includes('graphql'));

		const responseData = await response.json();
		const tasks = responseData.data.allTasks.nodes.filter((t: any) => t.dueDate);

		// Verify due date sort order
		for (let i = 0; i < tasks.length - 1; i++) {
			const current = new Date(tasks[i].dueDate);
			const next = new Date(tasks[i + 1].dueDate);
			expect(current.getTime()).toBeLessThanOrEqual(next.getTime());
		}
	});

	test('Sort by priority', async ({ page }) => {
		await page.click('button:has-text("Sort")');
		await page.click('button:has-text("Priority")');

		const response = await page.waitForResponse((response) => response.url().includes('graphql'));

		const responseData = await response.json();
		const tasks = responseData.data.allTasks.nodes;

		// Priority order: Urgent > High > Medium > Low
		const priorityOrder = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

		for (let i = 0; i < tasks.length - 1; i++) {
			const currentPriority = priorityOrder[tasks[i].priority as keyof typeof priorityOrder];
			const nextPriority = priorityOrder[tasks[i + 1].priority as keyof typeof priorityOrder];
			expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
		}
	});

	test('Pagination with first and after', async ({ page }) => {
		// Intercept first page request
		const firstPageResponse = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.variables?.first === 20
		);

		const firstPageData = await firstPageResponse.json();

		// Verify page info
		expect(firstPageData.data.allTasks.pageInfo).toBeDefined();
		expect(firstPageData.data.allTasks.pageInfo.hasNextPage).toBeDefined();

		if (firstPageData.data.allTasks.pageInfo.hasNextPage) {
			// Click next page
			await page.click('button:has-text("Next")');

			const secondPageResponse = await page.waitForResponse((response) =>
				response.url().includes('graphql')
			);

			const secondPageData = await secondPageResponse.json();

			// Verify cursor-based pagination
			expect(secondPageData.data.allTasks.edges.length).toBeGreaterThan(0);
			expect(secondPageData.data.allTasks.edges[0].cursor).toBeDefined();
		}
	});

	test('GraphQL response structure matches contract', async ({ page }) => {
		const response = await page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'AllTasks'
		);

		const responseData = await response.json();

		// Verify response structure
		expect(responseData.data.allTasks).toBeDefined();
		expect(responseData.data.allTasks.nodes).toBeInstanceOf(Array);
		expect(responseData.data.allTasks.edges).toBeInstanceOf(Array);
		expect(responseData.data.allTasks.pageInfo).toHaveProperty('hasNextPage');
		expect(responseData.data.allTasks.pageInfo).toHaveProperty('hasPreviousPage');
		expect(responseData.data.allTasks).toHaveProperty('totalCount');

		// Verify task structure
		if (responseData.data.allTasks.nodes.length > 0) {
			const task = responseData.data.allTasks.nodes[0];
			expect(task).toHaveProperty('id');
			expect(task).toHaveProperty('title');
			expect(task).toHaveProperty('status');
			expect(task).toHaveProperty('priority');
			expect(task).toHaveProperty('assigneeId');
			expect(task).toHaveProperty('creatorId');
			expect(task).toHaveProperty('createdAt');
		}
	});
});
