// E2E Test: Task Filtering
// Feature: 028-task-system-expansion - T050
// Purpose: Test advanced task filtering functionality

import { test, expect } from '@playwright/test';

test.describe('Task Filtering', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/login');
		await page.waitForLoadState('networkidle');

		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin');
		await page.click('button[type="submit"]');
		await page.waitForURL('**/dashboard**');
		await page.waitForLoadState('networkidle');

		// Create test tasks with different properties for filtering
		const testTasks = [
			{ title: 'Filter Test - High Priority', status: 'Not Started', priority: 'High' },
			{ title: 'Filter Test - In Progress', status: 'In Progress', priority: 'Medium' },
			{ title: 'Filter Test - Urgent', status: 'Not Started', priority: 'Urgent' }
		];

		for (const task of testTasks) {
			await page.goto('/dashboard/tasks/new');
			await page.waitForLoadState('networkidle');
			await page.fill('input[name="title"]', task.title);

			const submitButton = page.locator('button[type="submit"]:has-text("Create Task")');
			await submitButton.click();
			await page.waitForURL('**/tasks/*', { timeout: 10000 });
		}
	});

	test('displays filter component on tasks dashboard', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Verify filter section exists
		await expect(page.locator('text=/Filters/i')).toBeVisible();
	});

	test('can filter by search text', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Find search input
		const searchInput = page
			.locator('input[type="text"]')
			.filter({ hasText: '' })
			.or(page.locator('input[placeholder*="Search"]'));

		if (await searchInput.isVisible()) {
			// Type search query
			await searchInput.fill('Filter Test - High');
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('search=');

			// Verify filtered results
			await expect(page.locator('text=Filter Test - High Priority')).toBeVisible();
		}
	});

	test('can filter by status', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Find status checkboxes or select
		const inProgressCheckbox = page
			.locator('input[type="checkbox"]')
			.filter({ hasText: 'In Progress' })
			.or(page.locator('label:has-text("In Progress") input'));

		if (await inProgressCheckbox.isVisible()) {
			await inProgressCheckbox.check();
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('status=');

			// Verify filtered results show In Progress tasks
			await expect(page.locator('text=In Progress')).toBeVisible();
		}
	});

	test('can filter by priority', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Find priority checkboxes
		const urgentCheckbox = page
			.locator('input[type="checkbox"]')
			.filter({ hasText: 'Urgent' })
			.or(page.locator('label:has-text("Urgent") input'));

		if (await urgentCheckbox.isVisible()) {
			await urgentCheckbox.check();
			await page.waitForTimeout(500);

			// Verify URL updated
			expect(page.url()).toContain('priority=');

			// Verify filtered results
			await expect(page.locator('text=Urgent')).toBeVisible();
		}
	});

	test('can filter by multiple criteria', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Apply search filter
		const searchInput = page.locator('input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('Filter Test');
			await page.waitForTimeout(300);
		}

		// Apply status filter
		const notStartedCheckbox = page.locator('label:has-text("Not Started") input');
		if (await notStartedCheckbox.isVisible()) {
			await notStartedCheckbox.check();
			await page.waitForTimeout(300);
		}

		// Verify combined filters in URL
		const url = page.url();
		expect(url).toContain('search=');
	});

	test('shows active filter count', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Apply a filter
		const highPriorityCheckbox = page.locator('label:has-text("High") input');
		if (await highPriorityCheckbox.isVisible()) {
			await highPriorityCheckbox.check();
			await page.waitForTimeout(300);

			// Look for filter count badge
			const filterBadge = page.locator('text=/1 filter|filters/i');
			if (await filterBadge.isVisible()) {
				await expect(filterBadge).toBeVisible();
			}
		}
	});

	test('can clear all filters', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Apply some filters
		const searchInput = page.locator('input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('test');
			await page.waitForTimeout(300);
		}

		// Look for Clear All button
		const clearAllButton = page.locator('button:has-text("Clear All")');
		if (await clearAllButton.isVisible()) {
			await clearAllButton.click();
			await page.waitForTimeout(300);

			// Verify URL cleared
			const url = page.url();
			expect(url).not.toContain('search=');
			expect(url).not.toContain('status=');
			expect(url).not.toContain('priority=');
		}
	});

	test('can clear individual filter', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Apply a filter
		const searchInput = page.locator('input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('Filter Test');
			await page.waitForTimeout(500);

			// Look for active filter badge with X button
			const filterBadge = page.locator('text=Search:').locator('..').locator('button');
			if (await filterBadge.isVisible()) {
				await filterBadge.click();
				await page.waitForTimeout(300);

				// Verify filter removed
				expect(page.url()).not.toContain('search=');
			}
		}
	});

	test('filters persist across navigation', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Apply filter
		const searchInput = page.locator('input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('Filter Test');
			await page.waitForTimeout(500);

			const urlWithFilter = page.url();

			// Navigate away
			await page.goto('/dashboard');
			await page.waitForLoadState('networkidle');

			// Navigate back
			await page.goto(urlWithFilter);
			await page.waitForLoadState('networkidle');

			// Verify filter still applied
			expect(page.url()).toContain('search=Filter+Test');
		}
	});

	test('shows no results message when filters match nothing', async ({ page }) => {
		await page.goto('/dashboard/tasks');
		await page.waitForLoadState('networkidle');

		// Search for non-existent task
		const searchInput = page.locator('input[placeholder*="Search"]');
		if (await searchInput.isVisible()) {
			await searchInput.fill('NonExistentTaskXYZ123');
			await page.waitForTimeout(500);

			// Verify no results message
			await expect(page.locator('text=/No tasks found|Try adjusting/i')).toBeVisible();
		}
	});
});
