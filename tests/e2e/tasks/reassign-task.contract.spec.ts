/**
 * Contract Test: Reassign Task Mutation
 * Feature: 028-task-system-expansion
 * TDD Phase: MUST FAIL until T019 (tasks-operations.ts) is implemented
 *
 * Tests the reassignTask GraphQL mutation with notifications and audit trail.
 */

import { test, expect } from '@playwright/test';

test.describe('ReassignTask Mutation Contract', () => {
	test.beforeEach(async ({ page }) => {
		// Create a test task
		await page.goto('/dashboard/tasks/create');
		await page.fill('input[name="title"]', 'Task for Reassignment');
		await page.click('button:has-text("Create Task")');
		await page.waitForURL(/\/dashboard\/tasks\/[a-f0-9-]+/);
	});

	test('Creator reassigns task to another user', async ({ page }) => {
		// Click reassign button
		const reassignButton = page.locator('button:has-text("Reassign")');
		await reassignButton.click();

		// Modal should appear
		const modal = page.locator('[role="dialog"]');
		await expect(modal).toBeVisible();

		// Select new assignee
		const assigneeSelect = modal.locator('select[name="newAssigneeId"]');
		await assigneeSelect.selectOption({ index: 1 });

		// Confirm reassignment
		const confirmButton = modal.locator('button:has-text("Reassign")');
		await confirmButton.click();

		// Verify success toast
		await expect(page.locator('.toast:has-text("Task reassigned")')).toBeVisible({ timeout: 3000 });

		// Verify assignee updated in UI
		await expect(page.locator('.assignee-info')).not.toContainText('You');
	});

	test('Manager reassigns task to direct report', async ({ page }) => {
		// Login as manager who created task for direct report
		const reassignButton = page.locator('button:has-text("Reassign")');
		await reassignButton.click();

		const modal = page.locator('[role="dialog"]');
		const assigneeSelect = modal.locator('select[name="newAssigneeId"]');

		// Should show manager + direct reports
		const options = await assigneeSelect.locator('option').count();
		expect(options).toBeGreaterThan(1);

		await assigneeSelect.selectOption({ index: 2 });
		await modal.locator('button:has-text("Reassign")').click();

		await expect(page.locator('.toast:has-text("Task reassigned")')).toBeVisible({ timeout: 3000 });
	});

	test('Admin reassigns task to anyone', async ({ page }) => {
		// Login as admin
		const reassignButton = page.locator('button:has-text("Reassign")');
		await reassignButton.click();

		const modal = page.locator('[role="dialog"]');
		const assigneeSelect = modal.locator('select[name="newAssigneeId"]');

		// Admin should see all users
		const options = await assigneeSelect.locator('option').count();
		expect(options).toBeGreaterThanOrEqual(5);

		await assigneeSelect.selectOption({ index: 3 });
		await modal.locator('button:has-text("Reassign")').click();

		await expect(page.locator('.toast:has-text("Task reassigned")')).toBeVisible({ timeout: 3000 });
	});

	test('Employee cannot reassign (403)', async ({ page }) => {
		// Login as employee who is assignee but not creator
		// Reassign button should not be visible

		const reassignButton = page.locator('button:has-text("Reassign")');
		await expect(reassignButton).not.toBeVisible();
	});

	test('Notifications sent to old and new assignees', async ({ page }) => {
		const reassignButton = page.locator('button:has-text("Reassign")');
		await reassignButton.click();

		const modal = page.locator('[role="dialog"]');

		// Intercept GraphQL mutation
		const reassignMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'ReassignTask'
		);

		await modal.locator('select[name="newAssigneeId"]').selectOption({ index: 1 });
		await modal.locator('button:has-text("Reassign")').click();

		const response = await reassignMutation;
		const responseData = await response.json();

		// Verify payload includes old and new assignees
		expect(responseData.data.reassignTask.oldAssignee).toBeDefined();
		expect(responseData.data.reassignTask.newAssignee).toBeDefined();

		// Navigate to notifications
		await page.goto('/dashboard/notifications');

		// Verify reassignment notification exists
		await expect(page.locator('.notification:has-text("reassigned")')).toBeVisible();
	});

	test('Audit entry created on reassignment', async ({ page }) => {
		const reassignButton = page.locator('button:has-text("Reassign")');
		await reassignButton.click();

		const modal = page.locator('[role="dialog"]');
		await modal.locator('select[name="newAssigneeId"]').selectOption({ index: 1 });
		await modal.locator('button:has-text("Reassign")').click();

		await expect(page.locator('.toast:has-text("Task reassigned")')).toBeVisible({ timeout: 3000 });

		// Open audit history
		const auditTab = page.locator('button:has-text("History")');
		await auditTab.click();

		// Verify reassigned audit entry
		await expect(page.locator('.audit-entry:has-text("reassigned")')).toBeVisible();

		// Verify entry shows old and new assignee
		const reassignEntry = page.locator('.audit-entry:has-text("reassigned")').first();
		await expect(reassignEntry).toContainText('assignee');
	});

	test('GraphQL response includes both assignees', async ({ page }) => {
		const reassignButton = page.locator('button:has-text("Reassign")');
		await reassignButton.click();

		const modal = page.locator('[role="dialog"]');

		// Intercept mutation
		const reassignMutation = page.waitForResponse(
			(response) =>
				response.url().includes('graphql') &&
				response.request().postDataJSON()?.operationName === 'ReassignTask'
		);

		await modal.locator('select[name="newAssigneeId"]').selectOption({ index: 1 });
		await modal.locator('button:has-text("Reassign")').click();

		const response = await reassignMutation;
		const responseData = await response.json();

		// Verify response structure
		expect(responseData.data.reassignTask).toBeDefined();
		expect(responseData.data.reassignTask.task).toHaveProperty('id');
		expect(responseData.data.reassignTask.task).toHaveProperty('assigneeId');
		expect(responseData.data.reassignTask.oldAssignee).toHaveProperty('id');
		expect(responseData.data.reassignTask.newAssignee).toHaveProperty('id');
	});
});
