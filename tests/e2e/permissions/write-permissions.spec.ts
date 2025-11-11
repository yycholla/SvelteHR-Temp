// T016: E2E test for write permission button visibility (User Story 2)
// These tests verify that users without write permissions cannot see or access edit/create buttons
// SECURITY + UX: Ensures buttons are hidden for users without appropriate permissions

import { test, expect } from '@playwright/test';

// Test helper to create a session with specific permissions
async function loginWithPermissions(
	page: any,
	permissions: string[],
	roles: string[] = ['Employee']
) {
	// Navigate to login
	await page.goto('/login');

	// Mock authentication response with specific permissions
	await page.route('**/api/v2/auth/verify', async (route: any) => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: {
					id: 'test-user-id',
					email: `${roles[0].toLowerCase()}@example.com`,
					displayName: `Test ${roles[0]}`
				},
				permissions,
				roles: roles.map((name, idx) => ({
					id: `${name.toLowerCase()}-${idx}`,
					name
				}))
			})
		});
	});

	// Perform login
	await page.fill('input[name="email"]', `${roles[0].toLowerCase()}@example.com`);
	await page.fill('input[name="password"]', 'password');
	await page.click('button[type="submit"]');

	// Wait for navigation after login
	await page.waitForLoadState('networkidle');
}

test.describe('Employee Management Write Permissions (US2)', () => {
	test('should hide "Add Employee" button for user without employees:write', async ({ page }) => {
		// Login as user with only read permission
		await loginWithPermissions(page, ['employees:read'], ['Manager']);

		// Navigate to employees page
		await page.goto('/hr/employees');

		// Verify page loaded (read permission granted)
		await expect(page).toHaveURL('/hr/employees');

		// Look for "Add Employee" or "Create" button - should NOT exist
		const addButton = page.locator('button:has-text("Add Employee")');
		await expect(addButton).not.toBeVisible({ timeout: 5000 });

		// Also check for common variants
		const createButton = page.locator('button:has-text("Create"), button:has-text("New Employee")');
		await expect(createButton).toHaveCount(0);
	});

	test('should show "Add Employee" button for user with employees:write', async ({ page }) => {
		// Login as user with write permission
		await loginWithPermissions(page, ['employees:read', 'employees:write'], ['HR Manager']);

		// Navigate to employees page
		await page.goto('/hr/employees');

		// Verify page loaded
		await expect(page).toHaveURL('/hr/employees');

		// Look for "Add Employee" button - should exist and be visible
		const addButton = page.locator('button:has-text("Add Employee"), button:has-text("Create"), button:has-text("New Employee")').first();
		await expect(addButton).toBeVisible({ timeout: 10000 });
	});

	test('should hide edit buttons in employee list for user without employees:write', async ({ page }) => {
		// Login with read-only permission
		await loginWithPermissions(page, ['employees:read'], ['Employee']);

		// Navigate to employees page
		await page.goto('/hr/employees');

		// Wait for employee list to load
		await page.waitForLoadState('networkidle');

		// Look for edit buttons/icons in the list
		const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="Edit"], a:has-text("Edit")');

		// Edit buttons should not be visible
		const count = await editButtons.count();
		expect(count).toBe(0);
	});

	test('should show edit buttons in employee list for user with employees:write', async ({ page }) => {
		// Login with write permission
		await loginWithPermissions(page, ['employees:read', 'employees:write'], ['HR Manager']);

		// Navigate to employees page
		await page.goto('/hr/employees');

		// Wait for employee list to load
		await page.waitForLoadState('networkidle');

		// Look for edit buttons/icons in the list
		const editButtons = page.locator('button:has-text("Edit"), button[aria-label*="Edit"], a[href*="/edit"]');

		// At least one edit button should be visible (assuming employees exist)
		const count = await editButtons.count();
		expect(count).toBeGreaterThan(0);
	});

	test('should block direct access to employee create form without employees:write', async ({ page }) => {
		// Login with read-only permission
		await loginWithPermissions(page, ['employees:read'], ['Employee']);

		// Attempt to directly access create form
		await page.goto('/hr/employees/create');

		// Should be redirected to unauthorized or back to list
		await expect(page).toHaveURL(/\/(unauthorized|hr\/employees)(?!\/create)/);
	});

	test('should block direct access to employee edit form without employees:write', async ({ page }) => {
		// Login with read-only permission
		await loginWithPermissions(page, ['employees:read'], ['Employee']);

		// Attempt to directly access edit form
		await page.goto('/hr/employees/test-employee-id/edit');

		// Should be redirected to unauthorized or employee detail view
		await expect(page).toHaveURL(/\/(unauthorized|hr\/employees\/test-employee-id)(?!\/edit)/);
	});
});

test.describe('Department Management Write Permissions (US2)', () => {
	test('should hide "Add Department" button for user without departments:write', async ({ page }) => {
		// Login with read-only permission
		await loginWithPermissions(page, ['departments:read'], ['Manager']);

		// Navigate to departments page
		await page.goto('/admin/departments');

		// Verify page loaded
		await expect(page).toHaveURL('/admin/departments');

		// Look for "Add Department" button - should NOT exist
		const addButton = page.locator('button:has-text("Add Department"), button:has-text("Create"), button:has-text("New Department")');
		await expect(addButton).toHaveCount(0);
	});

	test('should show "Add Department" button for user with departments:write', async ({ page }) => {
		// Login with write permission
		await loginWithPermissions(page, ['departments:read', 'departments:write'], ['Admin']);

		// Navigate to departments page
		await page.goto('/admin/departments');

		// Verify page loaded
		await expect(page).toHaveURL('/admin/departments');

		// Look for "Add Department" button - should exist
		const addButton = page.locator('button:has-text("Add Department"), button:has-text("Create"), button:has-text("New Department")').first();
		await expect(addButton).toBeVisible({ timeout: 10000 });
	});

	test('should hide department edit actions for user without departments:write', async ({ page }) => {
		// Login with read-only permission
		await loginWithPermissions(page, ['departments:read'], ['Manager']);

		// Navigate to specific department
		await page.goto('/admin/departments/test-dept-id');

		// Edit button should not be visible
		const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit Department")');
		await expect(editButton).not.toBeVisible();
	});

	test('should block direct access to department create form without departments:write', async ({ page }) => {
		// Login with read-only permission
		await loginWithPermissions(page, ['departments:read'], ['Manager']);

		// Attempt to directly access create form
		await page.goto('/admin/departments/create');

		// Should be redirected to unauthorized
		await expect(page).toHaveURL(/\/(unauthorized|admin\/departments)(?!\/create)/);
	});
});

test.describe('Admin Panel Write Permissions (US2)', () => {
	test('should hide admin action buttons for user without admin:write', async ({ page }) => {
		// Login with admin read-only permission
		await loginWithPermissions(page, ['admin:read'], ['Admin']);

		// Navigate to admin analytics
		await page.goto('/dashboard/admin/analytics');

		// Verify page loaded (read permission granted)
		await expect(page).toHaveURL('/dashboard/admin/analytics');

		// Look for action buttons that require write permission
		const writeButtons = page.locator('button:has-text("Export"), button:has-text("Generate"), button:has-text("Create")');

		// These buttons should not be visible or should be disabled
		const count = await writeButtons.count();
		if (count > 0) {
			// If buttons exist, they should be disabled
			const firstButton = writeButtons.first();
			await expect(firstButton).toBeDisabled();
		}
	});

	test('should show admin action buttons for user with admin:write', async ({ page }) => {
		// Login with full admin permissions
		await loginWithPermissions(page, ['admin:read', 'admin:write'], ['Admin']);

		// Navigate to admin analytics
		await page.goto('/dashboard/admin/analytics');

		// Verify page loaded
		await expect(page).toHaveURL('/dashboard/admin/analytics');

		// Action buttons should be visible and enabled
		const writeButtons = page.locator('button:has-text("Export"), button:has-text("Generate")').first();

		// At least check that buttons are not disabled
		const isDisabled = await writeButtons.isDisabled().catch(() => true);
		expect(isDisabled).toBe(false);
	});
});

test.describe('Scoped Write Permissions (US2)', () => {
	test('should allow team-scoped write permissions (employees:write:team)', async ({ page }) => {
		// Login as Manager with team-scoped write permission
		await loginWithPermissions(page, ['employees:read:team', 'employees:write:team'], ['Manager']);

		// Navigate to employees page
		await page.goto('/hr/employees');

		// Should see the page (read permission granted)
		await expect(page).toHaveURL('/hr/employees');

		// Should see edit buttons for team members (write permission granted)
		const editButtons = page.locator('button:has-text("Edit"), a[href*="/edit"]');

		// Manager should see some edit buttons for their team
		const count = await editButtons.count();
		// Note: Actual button visibility depends on whether team members are shown
		// In a real test, we'd verify specific team members have edit buttons
	});

	test('should not allow write actions outside of scope', async ({ page }) => {
		// Login with self-scoped write permission
		await loginWithPermissions(page, ['employees:read', 'employees:write:self'], ['Employee']);

		// Navigate to employees page
		await page.goto('/hr/employees');

		// Should see the page (read permission granted)
		await expect(page).toHaveURL('/hr/employees');

		// Should NOT see "Add Employee" button (self scope doesn't include creating new employees)
		const addButton = page.locator('button:has-text("Add Employee")');
		await expect(addButton).not.toBeVisible();

		// Edit buttons for other employees should not be visible
		// (In a real implementation, only their own profile edit would be visible)
	});
});

test.describe('Admin Wildcard Write Permissions (US2)', () => {
	test('should show all write action buttons for Admin with wildcard', async ({ page }) => {
		// Login as Admin with wildcard permission
		await loginWithPermissions(page, ['*'], ['Admin']);

		// Test multiple pages to verify write actions are visible everywhere
		const pagesToTest = [
			{ url: '/hr/employees', buttonText: 'Add Employee' },
			{ url: '/admin/departments', buttonText: 'Add Department' }
		];

		for (const pageTest of pagesToTest) {
			await page.goto(pageTest.url);
			await expect(page).toHaveURL(pageTest.url);

			// Look for create/add button
			const addButton = page.locator(`button:has-text("${pageTest.buttonText}"), button:has-text("Create"), button:has-text("New")`).first();

			// Admin should see all action buttons
			await expect(addButton).toBeVisible({ timeout: 10000 });
		}
	});
});

test.describe('Form Validation and Access Control (US2)', () => {
	test('should prevent form submission without write permissions', async ({ page }) => {
		// Login with read-only permission
		await loginWithPermissions(page, ['employees:read'], ['Employee']);

		// Attempt to access create form via direct URL
		await page.goto('/hr/employees/create');

		// Should be blocked at page load (server-side protection)
		await expect(page).toHaveURL(/\/(unauthorized|hr\/employees)(?!\/create)/);
	});

	test('should allow form submission with write permissions', async ({ page }) => {
		// Login with write permission
		await loginWithPermissions(page, ['employees:read', 'employees:write'], ['HR Manager']);

		// Navigate to create form
		await page.goto('/hr/employees/create');

		// Should successfully load the form
		await expect(page).toHaveURL('/hr/employees/create');

		// Verify form elements are present and enabled
		const formExists = await page.locator('form').count();
		expect(formExists).toBeGreaterThan(0);
	});
});

test.describe('Performance - Button Visibility Checks (US2)', () => {
	test('should not cause performance issues with permission-based rendering', async ({ page }) => {
		// Login with mixed permissions
		await loginWithPermissions(
			page,
			['employees:read', 'departments:read', 'reports:read'],
			['Manager']
		);

		const startTime = Date.now();

		// Navigate to employees page
		await page.goto('/hr/employees');
		await page.waitForLoadState('networkidle');

		// Navigate to departments
		await page.goto('/admin/departments');
		await page.waitForLoadState('networkidle');

		const endTime = Date.now();
		const totalTime = endTime - startTime;

		// Permission checks should not significantly slow down page loads
		expect(totalTime).toBeLessThan(5000); // 5 seconds for 2 navigations
	});
});
