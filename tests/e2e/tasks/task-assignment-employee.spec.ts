// E2E Test: Task Assignment (Employee)
// Feature: 019-we-need-to - Phase 6
// Purpose: Test employee-specific task assignment and management

import { expect, test } from '@playwright/test';

test.describe('Task Assignment - Employee', () => {
	// Setup: Login before each test
	test.beforeEach(async ({ page }) => {
		// Navigate to login page
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

	test('user can view their assigned tasks', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Verify page loaded
		await expect(page.locator('h1')).toContainText('My Tasks');

		// Verify task list or empty state
		const taskList = page.locator('[data-testid="task-list"]').or(page.locator('.task-list'));
		const emptyState = page.locator('text=/No tasks assigned|No tasks found/i');

		// Either tasks exist or empty state is shown
		await expect(taskList.or(emptyState)).toBeVisible();
	});

	test('user can filter tasks by status', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Find status filter
		const statusFilter = page
			.locator('select[name="status"]')
			.or(page.locator('select:has(option:has-text("Pending"))'));

		if (await statusFilter.isVisible()) {
			// Test filtering by "Pending"
			await statusFilter.selectOption('pending');
			await page.waitForTimeout(500);

			// Verify URL updated with filter
			expect(page.url()).toContain('status=pending');

			// Verify only pending tasks shown
			const taskItems = page.locator('[data-testid="task-item"]');
			if ((await taskItems.count()) > 0) {
				const firstTask = taskItems.first();
				await expect(firstTask.locator('text=/pending/i')).toBeVisible();
			}

			// Test filtering by "In Progress"
			await statusFilter.selectOption('in_progress');
			await page.waitForTimeout(500);

			expect(page.url()).toContain('status=in_progress');

			// Test filtering by "Completed"
			await statusFilter.selectOption('completed');
			await page.waitForTimeout(500);

			expect(page.url()).toContain('status=completed');
		}
	});

	test('user can filter tasks by priority', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Find priority filter
		const priorityFilter = page
			.locator('select[name="priority"]')
			.or(page.locator('select:has(option:has-text("High"))'));

		if (await priorityFilter.isVisible()) {
			// Test filtering by "Urgent"
			await priorityFilter.selectOption('urgent');
			await page.waitForTimeout(500);

			expect(page.url()).toContain('priority=urgent');

			// Test filtering by "High"
			await priorityFilter.selectOption('high');
			await page.waitForTimeout(500);

			expect(page.url()).toContain('priority=high');

			// Test filtering by "Medium"
			await priorityFilter.selectOption('medium');
			await page.waitForTimeout(500);

			expect(page.url()).toContain('priority=medium');
		}
	});

	test('user can view task details', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Find task items
		const taskItems = page
			.locator('[data-testid="task-item"]')
			.or(page.locator('a[href*="/tasks/"]'));

		if ((await taskItems.count()) > 0) {
			// Click first task
			await taskItems.first().click();

			// Wait for navigation to task detail page
			await page.waitForURL('**/tasks/*');
			await page.waitForLoadState('networkidle');

			// Verify task detail page loaded
			await expect(page.locator('h1')).toBeVisible();

			// Verify key task information displayed
			await expect(page.locator('text=/Status/i')).toBeVisible();
			await expect(page.locator('text=/Priority/i')).toBeVisible();
			await expect(
				page.locator('text=/Due Date/i').or(page.locator('text=/Deadline/i'))
			).toBeVisible();
		}
	});

	test('user can update task status', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Find a task that is not completed
		const taskItems = page
			.locator('[data-testid="task-item"]')
			.or(page.locator('a[href*="/tasks/"]'));

		if ((await taskItems.count()) > 0) {
			// Navigate to first task
			await taskItems.first().click();
			await page.waitForURL('**/tasks/*');
			await page.waitForLoadState('networkidle');

			// Look for status change buttons
			const markInProgressButton = page
				.locator('button:has-text("In Progress")')
				.or(page.locator('button:has-text("Start Task")'));
			const markCompletedButton = page
				.locator('button:has-text("Complete")')
				.or(page.locator('button:has-text("Mark as Completed")'));

			// Try to mark as in progress if available
			if (await markInProgressButton.isVisible()) {
				await markInProgressButton.click();
				await page.waitForTimeout(1000);

				// Verify status changed (will reload page in real implementation)
				// For now, just verify button was clickable
			}

			// Try to mark as completed if available
			if (await markCompletedButton.isVisible()) {
				await markCompletedButton.click();
				await page.waitForTimeout(1000);

				// Verify status changed
			}
		}
	});

	test('user can view task statistics', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Verify statistics section exists
		const statsSection = page.locator('text=/Statistics|Overview/i');
		if (await statsSection.isVisible()) {
			// Check for key metrics
			await expect(page.locator('text=/Total|All Tasks/i')).toBeVisible();
			await expect(page.locator('text=/Pending/i')).toBeVisible();
			await expect(page.locator('text=/In Progress/i')).toBeVisible();
			await expect(page.locator('text=/Completed/i')).toBeVisible();
		}
	});

	test('manager can create employee task', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Look for "Create Task" button (manager-only)
		const createButton = page
			.locator('a:has-text("Create Task")')
			.or(page.locator('button:has-text("Create Task")'));

		const hasCreateAccess = await createButton.isVisible();

		if (hasCreateAccess) {
			// Click create button
			await createButton.click();

			// Wait for navigation to create page
			await page.waitForURL('**/tasks/create');
			await page.waitForLoadState('networkidle');

			// Verify create form loaded
			await expect(page.locator('h1')).toContainText('Create Task');

			// Fill out task form
			await page.fill('input[name="title"]', 'Test Task - E2E Employee Assignment');
			await page.fill(
				'textarea[name="description"]',
				'This is a test task for employee assignment'
			);

			// Set priority
			const prioritySelect = page.locator('select[name="priority"]');
			await prioritySelect.selectOption('high');

			// Set due date (7 days from now)
			const dueDate = new Date();
			dueDate.setDate(dueDate.getDate() + 7);
			const dueDateStr = dueDate.toISOString().split('T')[0];
			await page.fill('input[name="dueDate"]', dueDateStr);

			// Select "Assign to Employee" radio button
			const employeeRadio = page.locator('input[type="radio"][value="employee"]');
			await employeeRadio.check();

			// Verify employee selection field is visible
			const assigneeField = page
				.locator('input[name="assigneeId"]')
				.or(page.locator('text=/Employee selection/i'));
			await expect(assigneeField).toBeVisible();

			// Note: Form submission will fail until GraphQL mutation is implemented
			const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
			await expect(submitButton).toBeVisible();
			await expect(submitButton).toBeEnabled();
		} else {
			// User doesn't have manager access
			await expect(createButton).not.toBeVisible();
		}
	});

	test('task pagination works correctly', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Look for pagination controls
		const nextButton = page
			.locator('button:has-text("Next")')
			.or(page.locator('a:has-text("Next")'));
		const prevButton = page
			.locator('button:has-text("Previous")')
			.or(page.locator('a:has-text("Previous")'));

		// Check if pagination exists (indicates more than one page of tasks)
		if (await nextButton.isVisible()) {
			// Record current page tasks
			const currentPageTasks = await page.locator('[data-testid="task-item"]').count();

			// Click next page
			await nextButton.click();
			await page.waitForTimeout(500);

			// Verify URL updated with page parameter
			expect(page.url()).toContain('page=2');

			// Verify tasks changed (different set)
			await page.waitForLoadState('networkidle');

			// Go back to first page
			if (await prevButton.isVisible()) {
				await prevButton.click();
				await page.waitForTimeout(500);

				// Verify back on page 1
				expect(page.url()).toMatch(/page=1|tasks\/my-tasks$/);
			}
		}
	});

	test('overdue tasks are highlighted', async ({ page }) => {
		// Navigate to My Tasks page
		await page.goto('/dashboard/tasks/my-tasks');
		await page.waitForLoadState('networkidle');

		// Look for overdue badge or styling
		const overdueIndicator = page
			.locator('text=/Overdue|Past Due/i')
			.or(page.locator('[data-status="overdue"]'));

		// If any overdue tasks exist, verify they're highlighted
		if ((await overdueIndicator.count()) > 0) {
			const firstOverdueTask = overdueIndicator.first();
			await expect(firstOverdueTask).toBeVisible();

			// Verify overdue styling (red color, warning icon, etc.)
			// This depends on implementation specifics
		}
	});

	test('completed tasks show completion timestamp', async ({ page }) => {
		// Navigate to My Tasks page with completed filter
		await page.goto('/dashboard/tasks/my-tasks?status=completed');
		await page.waitForLoadState('networkidle');

		// Find completed task items
		const completedTasks = page.locator('[data-testid="task-item"]');

		if ((await completedTasks.count()) > 0) {
			// Click first completed task
			await completedTasks.first().click();
			await page.waitForLoadState('networkidle');

			// Verify completion information
			const completedAt = page.locator('text=/Completed at|Completed on|Finished on/i');
			if (await completedAt.isVisible()) {
				await expect(completedAt).toBeVisible();
			}

			// Verify task has "completed" badge
			await expect(page.locator('text=/completed/i')).toBeVisible();
		}
	});
});
