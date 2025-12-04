// T006: E2E test for page access control (User Story 1)
// These tests should FAIL initially - routes don't have permission checks yet
// SECURITY CRITICAL: Ensures unauthorized users cannot access protected pages

import { expect, test } from '@playwright/test';

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
					email: 'test@example.com',
					displayName: 'Test User'
				},
				permissions,
				roles: roles.map((name) => ({ id: name.toLowerCase(), name }))
			})
		});
	});

	// Perform login (assuming login form exists)
	await page.fill('input[name="email"]', 'test@example.com');
	await page.fill('input[name="password"]', 'password');
	await page.click('button[type="submit"]');

	// Wait for navigation after login
	await page.waitForLoadState('networkidle');
}

test.describe('Employee Page Access Control (US1)', () => {
	test('should redirect user without employees:read from /hr/employees', async ({ page }) => {
		// Login as user with only profile:read permission (no employees:read)
		await loginWithPermissions(page, ['profile:read']);

		// Attempt to access employee page
		await page.goto('/hr/employees');

		// Should be redirected to unauthorized or login page
		// This test will FAIL until permission checks are added to the route
		await expect(page).toHaveURL(/\/(unauthorized|login)/);

		// Check for error message or access denied indication
		const pageContent = await page.textContent('body');
		expect(
			pageContent?.includes('Access Denied') ||
				pageContent?.includes('permission') ||
				pageContent?.includes('unauthorized')
		).toBeTruthy();
	});

	test('should allow user with employees:read to access /hr/employees', async ({ page }) => {
		// Login as user with employees:read permission
		await loginWithPermissions(page, ['employees:read'], ['Manager']);

		// Navigate to employee page
		await page.goto('/hr/employees');

		// Should successfully load the page
		await expect(page).toHaveURL('/hr/employees');

		// Verify page content loaded (not an error page)
		const heading = await page.textContent('h1');
		expect(heading).toContain('Employee'); // Or whatever the actual heading is
	});

	test('should redirect user without departments:read from /admin/departments', async ({
		page
	}) => {
		// Login as user with only profile:read permission (no departments:read)
		await loginWithPermissions(page, ['profile:read', 'employees:read']);

		// Attempt to access departments page
		await page.goto('/admin/departments');

		// Should be redirected to unauthorized page
		// This test will FAIL until permission checks are added
		await expect(page).toHaveURL(/\/(unauthorized|login)/);

		const pageContent = await page.textContent('body');
		expect(
			pageContent?.includes('Access Denied') ||
				pageContent?.includes('permission') ||
				pageContent?.includes('unauthorized')
		).toBeTruthy();
	});

	test('should redirect user with only profile:read from all /hr/** routes', async ({ page }) => {
		// Login as basic employee with only self-service permissions
		await loginWithPermissions(page, ['profile:read', 'profile:write']);

		// Test multiple HR routes
		const hrRoutes = ['/hr/employees', '/hr/departments', '/hr/performance'];

		for (const route of hrRoutes) {
			await page.goto(route);

			// Should be redirected away from all HR routes
			// This test will FAIL until permission checks are added
			await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);
		}
	});

	test('should redirect user with only profile:read from all /admin/** routes', async ({
		page
	}) => {
		// Login as basic employee (no admin permissions)
		await loginWithPermissions(page, ['profile:read', 'employees:read']);

		// Test multiple admin routes
		const adminRoutes = ['/admin/departments', '/dashboard/admin/analytics', '/admin/system'];

		for (const route of adminRoutes) {
			await page.goto(route);

			// Should be redirected away from all admin routes
			// This test will FAIL until permission checks are added
			await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);
		}
	});

	test('should redirect user with expired token to login with redirectTo', async ({ page }) => {
		// Navigate directly without login (simulating expired token)
		await page.goto('/hr/employees');

		// Should redirect to login with redirectTo parameter
		await expect(page).toHaveURL(/\/login/);

		// Check for redirectTo parameter
		const url = new URL(page.url());
		const redirectTo = url.searchParams.get('redirectTo');
		expect(redirectTo).toContain('/hr/employees');
	});

	test('should allow Admin with wildcard permission to access all routes', async ({ page }) => {
		// Login as Admin with wildcard permission
		await loginWithPermissions(page, ['*'], ['Admin']);

		// Test that admin can access all protected routes
		const protectedRoutes = ['/hr/employees', '/admin/departments', '/dashboard/admin/analytics'];

		for (const route of protectedRoutes) {
			await page.goto(route);

			// Admin should be able to access all routes
			await expect(page).toHaveURL(route);

			// Verify page loaded successfully (not error page)
			const pageContent = await page.textContent('body');
			expect(pageContent).not.toContain('Access Denied');
		}
	});

	test('should check permissions on nested employee routes', async ({ page }) => {
		// Login as user without employees:read
		await loginWithPermissions(page, ['profile:read']);

		// Attempt to access nested employee detail route
		await page.goto('/hr/employees/test-employee-id');

		// Should be redirected to unauthorized
		// This test will FAIL until permission checks are added
		await expect(page).toHaveURL(/\/(unauthorized|login)/);
	});

	test('should handle scoped permissions correctly (employees:read:team)', async ({ page }) => {
		// Login as Manager with team-scoped employees:read permission
		await loginWithPermissions(page, ['employees:read:team'], ['Manager']);

		// Navigate to employee page
		await page.goto('/hr/employees');

		// Should allow access (scoped permission matches unscoped requirement)
		await expect(page).toHaveURL('/hr/employees');

		// Verify page content loaded
		const heading = await page.textContent('h1');
		expect(heading).toBeTruthy();
	});
});

test.describe('Performance and Edge Cases', () => {
	test('should not cause performance issues on repeated permission checks', async ({ page }) => {
		// Login with valid permissions
		await loginWithPermissions(page, ['employees:read', 'departments:read'], ['Manager']);

		const startTime = Date.now();

		// Navigate between multiple protected routes
		await page.goto('/hr/employees');
		await page.goto('/admin/departments');
		await page.goto('/hr/employees');

		const endTime = Date.now();
		const totalTime = endTime - startTime;

		// Permission checks should complete within reasonable time (< 3 seconds for 3 navigations)
		expect(totalTime).toBeLessThan(3000);
	});

	test('should handle missing permission data gracefully', async ({ page }) => {
		// Mock auth response with missing permissions array
		await page.route('**/api/v2/auth/verify', async (route: any) => {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					user: {
						id: 'test-user-id',
						email: 'test@example.com'
					}
					// No permissions or roles field
				})
			});
		});

		await page.goto('/login');
		await page.fill('input[name="email"]', 'test@example.com');
		await page.fill('input[name="password"]', 'password');
		await page.click('button[type="submit"]');
		await page.waitForLoadState('networkidle');

		// Attempt to access protected route with missing permission data
		await page.goto('/hr/employees');

		// Should redirect to unauthorized (treat missing permissions as no permissions)
		await expect(page).toHaveURL(/\/(unauthorized|login)/);
	});
});
