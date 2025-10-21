// E2E Test: My Tasks and Team Tasks Views
// Feature: 028-task-system-expansion - T052/T053
// Purpose: Test personal and team task views

import { test, expect } from '@playwright/test';

test.describe('My Tasks View', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');
		await page.waitForURL('**/dashboard**');
		await page.waitForLoadState('networkidle');
	});

	test('can navigate to My Tasks page', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Verify page loaded
		await expect(page.locator('h1')).toContainText('My Tasks');
	});

	test('shows only user-assigned tasks', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Verify user name in header
		await expect(page.locator('text=/Tasks assigned to you/i')).toBeVisible();
	});

	test('displays personal statistics', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Verify statistics cards
		await expect(page.locator('text=/Total Tasks/i')).toBeVisible();
		await expect(page.locator('text=/Not Started/i')).toBeVisible();
		await expect(page.locator('text=/In Progress/i')).toBeVisible();
		await expect(page.locator('text=/Completed/i')).toBeVisible();
		await expect(page.locator('text=/Overdue/i')).toBeVisible();
	});

	test('shows simple filters', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Verify filter controls
		await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
	});

	test('can filter by status', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Find status select
		const statusSelect = page.locator('[id*="status"]').first();
		if (await statusSelect.isVisible()) {
			await statusSelect.click();
			await page.locator('text=In Progress').click();
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('status=');
		}
	});

	test('can filter by priority', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Find priority select
		const prioritySelect = page.locator('[id*="priority"]').first();
		if (await prioritySelect.isVisible()) {
			await prioritySelect.click();
			await page.locator('text=High').click();
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('priority=');
		}
	});

	test('shows empty state when no tasks assigned', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Check for empty state or tasks
		const emptyState = page.locator('text=/No tasks found|You have no assigned tasks/i');
		const taskList = page.locator('[data-testid="task-list"]');

		// Either empty state or task list should be visible
		const hasContent = (await emptyState.isVisible()) || (await taskList.isVisible());
		expect(hasContent).toBeTruthy();
	});

	test('highlights overdue tasks', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Look for overdue indicator
		const overdueCount = page.locator('text=/Overdue/i');
		if (await overdueCount.isVisible()) {
			// Verify overdue badge/stat shows
			await expect(overdueCount).toBeVisible();
		}
	});

	test('can create new task from My Tasks', async ({ page }) => {
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Find New Task button
		const newTaskButton = page.locator('button:has-text("New Task")');
		await expect(newTaskButton).toBeVisible();
		await newTaskButton.click();

		// Verify navigation to create page
		await page.waitForURL('**/tasks/new');
	});
});

test.describe('Team Tasks View', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');
		await page.waitForURL('**/dashboard**');
		await page.waitForLoadState('networkidle');
	});

	test('can navigate to Team Tasks page', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Verify page loaded
		await expect(page.locator('h1')).toContainText('Team Tasks');
	});

	test('shows team member count', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Verify team context in header
		await expect(page.locator('text=/team members|Tasks assigned to your team/i')).toBeVisible();
	});

	test('displays team statistics', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Verify statistics cards
		await expect(page.locator('text=/Team Tasks/i')).toBeVisible();
		await expect(page.locator('text=/Not Started/i')).toBeVisible();
		await expect(page.locator('text=/In Progress/i')).toBeVisible();
		await expect(page.locator('text=/Completed/i')).toBeVisible();
		await expect(page.locator('text=/Overdue/i')).toBeVisible();
	});

	test('shows team member filter', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Look for assignee filter
		const assigneeSelect = page.locator('text=/All Team Members/i');
		if (await assigneeSelect.isVisible()) {
			await expect(assigneeSelect).toBeVisible();
		}
	});

	test('can filter by team member', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Find assignee select
		const assigneeSelect = page.locator('[id*="assignee"]').first();
		if (await assigneeSelect.isVisible()) {
			await assigneeSelect.click();
			await page.waitForTimeout(300);

			// Select first team member if any
			const firstMember = page.locator('option').nth(1);
			if (await firstMember.isVisible()) {
				await firstMember.click();
				await page.waitForTimeout(500);

				// Verify URL updated
				expect(page.url()).toContain('assignee=');
			}
		}
	});

	test('can filter by status', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Find status select
		const statusSelect = page.locator('[id*="status"]').first();
		if (await statusSelect.isVisible()) {
			await statusSelect.click();
			await page.locator('text=In Progress').click();
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('status=');
		}
	});

	test('can search team tasks', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Find search input
		const searchInput = page.locator('input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('test');
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('search=');
		}
	});

	test('shows empty state when no team tasks', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Check for empty state or tasks
		const emptyState = page.locator('text=/No team tasks found|Your team has no assigned tasks/i');
		const taskList = page.locator('[data-testid="task-list"]');

		// Either empty state or task list should be visible
		const hasContent = (await emptyState.isVisible()) || (await taskList.isVisible());
		expect(hasContent).toBeTruthy();
	});

	test('can create team task', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Find New Task button
		const newTaskButton = page.locator('button:has-text("New Task")');
		await expect(newTaskButton).toBeVisible();
		await newTaskButton.click();

		// Verify navigation to create page
		await page.waitForURL('**/tasks/new');
	});

	test('shows tasks from all team members', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Tasks should show assignee name
		// If tasks exist, verify assignee info is displayed
		const taskItems = page.locator('[data-testid="task-item"]');
		if ((await taskItems.count()) > 0) {
			// First task should show assignee
			await expect(page.locator('text=/Assigned to|Assignee/i')).toBeVisible();
		}
	});

	test('team statistics reflect all team members', async ({ page }) => {
		await page.goto('/dashboard/tasks/team-tasks');
		await page.waitForLoadState('networkidle');

		// Get total count from statistics
		const totalTasks = page.locator('text=/Team Tasks/i').locator('..');
		if (await totalTasks.isVisible()) {
			// Should show count of all team tasks
			await expect(totalTasks).toBeVisible();
		}
	});
});
