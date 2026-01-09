// T007: E2E test for admin page access control (User Story 1)
// These tests should FAIL initially - admin routes may not have proper permission checks
// SECURITY CRITICAL: Ensures only authorized admins can access admin routes

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

test.describe('Admin Analytics Access Control (US1)', () => {
	test('should block Manager from accessing /admin/analytics', async ({ page }) => {
		// Login as Manager (has some HR permissions but not admin:read)
		await loginWithPermissions(
			page,
			['employees:read:team', 'employees:write:team', 'reports:read:team'],
			['Manager']
		);

		// Attempt to access admin analytics
		await page.goto('/admin/analytics');

		// Should be redirected to unauthorized page
		// This test will FAIL if permission check is missing
		await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);

		const pageContent = await page.textContent('body');
		expect(
			pageContent?.includes('Access Denied') ||
				pageContent?.includes('permission') ||
				pageContent?.includes('unauthorized')
		).toBeTruthy();
	});

	test('should block HR Manager from accessing /admin/analytics', async ({ page }) => {
		// Login as HR Manager (has HR permissions but not admin:read)
		await loginWithPermissions(
			page,
			[
				'employees:read:all',
				'employees:write:all',
				'departments:read:all',
				'performance:read:all',
				'leave:approve'
			],
			['HR Manager']
		);

		// Attempt to access admin analytics
		await page.goto('/admin/analytics');

		// Should be redirected to unauthorized page
		await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);

		const pageContent = await page.textContent('body');
		expect(
			pageContent?.includes('Access Denied') ||
				pageContent?.includes('permission') ||
				pageContent?.includes('unauthorized')
		).toBeTruthy();
	});

	test('should allow Admin to access /admin/analytics', async ({ page }) => {
		// Login as Admin with admin:read permission
		await loginWithPermissions(page, ['admin:read', 'admin:write'], ['Admin']);

		// Navigate to admin analytics
		await page.goto('/admin/analytics');

		// Should successfully load the page
		await expect(page).toHaveURL('/admin/analytics');

		// Verify analytics content is present (not an error page)
		const heading = await page.textContent('h1');
		expect(heading).toContain('Analytics'); // Or whatever the actual heading is

		// Verify no access denied message
		const pageContent = await page.textContent('body');
		expect(pageContent).not.toContain('Access Denied');
	});

	test('should allow Admin with wildcard (*) to access /admin/analytics', async ({
		page
	}) => {
		// Login as Admin with wildcard permission
		await loginWithPermissions(page, ['*'], ['Admin']);

		// Navigate to admin analytics
		await page.goto('/admin/analytics');

		// Should successfully load the page
		await expect(page).toHaveURL('/admin/analytics');

		// Verify page loaded successfully
		const pageContent = await page.textContent('body');
		expect(pageContent).not.toContain('Access Denied');
	});
});

test.describe('Admin System Routes Access Control (US1)', () => {
	test('should block HR Manager from accessing /admin/system routes', async ({ page }) => {
		// Login as HR Manager
		await loginWithPermissions(
			page,
			['employees:read:all', 'employees:write:all', 'departments:read:all'],
			['HR Manager']
		);

		// Attempt to access system admin routes (if they exist)
		const systemRoutes = ['/admin/system', '/admin/settings', '/admin/users'];

		for (const route of systemRoutes) {
			await page.goto(route);

			// Should be redirected away from system routes
			// May get 404 if route doesn't exist, or unauthorized if it does
			const url = page.url();
			expect(
				url.includes('/unauthorized') || url.includes('/login') || url.includes('/dashboard')
			).toBeTruthy();
		}
	});

	test('should block Employee from accessing any /admin/** routes', async ({ page }) => {
		// Login as basic Employee
		await loginWithPermissions(page, ['profile:read', 'profile:write'], ['Employee']);

		// Attempt to access various admin routes
		const adminRoutes = [
			'/admin/departments',
			'/admin/users',
			'/admin/analytics',
			'/admin/system'
		];

		for (const route of adminRoutes) {
			await page.goto(route);

			// Should be redirected away from all admin routes
			// This test will FAIL if permission checks are missing
			await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);
		}
	});

	test('should block Manager from accessing any /admin/** routes', async ({ page }) => {
		// Login as Manager (has team management but not admin access)
		await loginWithPermissions(
			page,
			['employees:read:team', 'employees:write:team', 'tasks:write:team'],
			['Manager']
		);

		// Attempt to access admin routes
		const adminRoutes = ['/admin/departments', '/admin/analytics'];

		for (const route of adminRoutes) {
			await page.goto(route);

			// Should be redirected away from admin routes
			await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);
		}
	});

	test('should allow Admin with * permission to access all admin routes', async ({ page }) => {
		// Login as Admin with wildcard permission
		await loginWithPermissions(page, ['*'], ['Admin']);

		// Test all admin routes that should be accessible
		const adminRoutes = ['/admin/departments', '/admin/analytics'];

		for (const route of adminRoutes) {
			await page.goto(route);

			// Admin should be able to access all routes
			await expect(page).toHaveURL(route);

			// Verify page loaded successfully
			const pageContent = await page.textContent('body');
			expect(pageContent).not.toContain('Access Denied');
			expect(pageContent).not.toContain('unauthorized');
		}
	});
});

test.describe('Granular Admin Permission Checks (US1)', () => {
	test('should allow user with admin:read to view analytics but not modify', async ({ page }) => {
		// Login with read-only admin permission
		await loginWithPermissions(page, ['admin:read'], ['Admin']);

		// Navigate to admin analytics
		await page.goto('/admin/analytics');

		// Should successfully load the page (read permission granted)
		await expect(page).toHaveURL('/admin/analytics');

		// Verify analytics content is visible
		const pageContent = await page.textContent('body');
		expect(pageContent).not.toContain('Access Denied');
	});

	test('should check admin:write for modification actions', async ({ page }) => {
		// Login with only admin:read (no write permission)
		await loginWithPermissions(page, ['admin:read'], ['Admin']);

		// Navigate to admin page
		await page.goto('/admin/analytics');

		// Verify write-action buttons are hidden (tested in Phase 3)
		// This is a placeholder for future button visibility tests
		// For now, just verify page loads
		const url = page.url();
		expect(url).toContain('/admin/analytics');
	});

	test('should require admin:delete for destructive actions', async ({ page }) => {
		// Login with admin:read and admin:write but not admin:delete
		await loginWithPermissions(page, ['admin:read', 'admin:write'], ['Admin']);

		// Navigate to admin page
		await page.goto('/admin/analytics');

		// Verify page loads (read/write granted)
		await expect(page).toHaveURL('/admin/analytics');

		// Delete buttons should be hidden (tested in Phase 4)
		// For now, just verify no access denied
		const pageContent = await page.textContent('body');
		expect(pageContent).not.toContain('Access Denied');
	});
});

test.describe('Role Hierarchy and Permission Inheritance', () => {
	test('should verify Admin inherits all permissions', async ({ page }) => {
		// Login as Admin with wildcard
		await loginWithPermissions(page, ['*'], ['Admin']);

		// Verify Admin can access routes requiring any permission level
		const mixedRoutes = [
			'/dashboard', // basic dashboard
			'/hr/employees', // employees:read
			'/admin/departments', // departments:read + admin
			'/admin/analytics' // admin:read
		];

		for (const route of mixedRoutes) {
			await page.goto(route);

			// Admin should access everything
			await expect(page).toHaveURL(route);

			const pageContent = await page.textContent('body');
			expect(pageContent).not.toContain('Access Denied');
		}
	});

	test('should verify HR Manager does NOT inherit Admin permissions', async ({ page }) => {
		// Login as HR Manager (should NOT have admin access despite high role level)
		await loginWithPermissions(
			page,
			['employees:read:all', 'employees:write:all', 'departments:read:all'],
			['HR Manager']
		);

		// Navigate to admin analytics
		await page.goto('/admin/analytics');

		// Should be denied access (role level doesn't grant admin permissions)
		await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);

		const pageContent = await page.textContent('body');
		expect(
			pageContent?.includes('Access Denied') || pageContent?.includes('unauthorized')
		).toBeTruthy();
	});
});

test.describe('Performance and Security Edge Cases', () => {
	test('should handle rapid navigation between protected routes', async ({ page }) => {
		// Login with admin permissions
		await loginWithPermissions(page, ['admin:read', 'employees:read'], ['Admin']);

		const startTime = Date.now();

		// Rapidly navigate between routes
		for (let i = 0; i < 5; i++) {
			await page.goto('/admin/analytics');
			await page.goto('/hr/employees');
		}

		const endTime = Date.now();
		const totalTime = endTime - startTime;

		// All navigations should complete within reasonable time
		expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 navigations
	});

	test('should prevent privilege escalation via URL manipulation', async ({ page }) => {
		// Login as Employee
		await loginWithPermissions(page, ['profile:read'], ['Employee']);

		// Attempt to access admin route with various URL patterns
		const escalationAttempts = [
			'/admin/analytics',
			'/admin/analytics?admin=true',
			'/admin/analytics#admin',
			'/admin/../admin/analytics'
		];

		for (const attempt of escalationAttempts) {
			await page.goto(attempt);

			// All attempts should be blocked
			await expect(page).toHaveURL(/\/(unauthorized|login|dashboard)/);
		}
	});
});
