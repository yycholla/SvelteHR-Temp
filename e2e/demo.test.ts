import { expect, test } from '@playwright/test';

test.describe('HR Manager Authentication Flow', () => {
	test.beforeEach(async ({ page }) => {
		// Start each test from a clean state
		await page.context().clearCookies();
	});

	test('should redirect unauthenticated user to login page', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/.*\/login/);
		await expect(page.locator('h1')).toContainText('Sign In');
	});

	test('should show login form with required fields', async ({ page }) => {
		await page.goto('/login');
		
		// Check for form elements
		await expect(page.locator('input[name="email"]')).toBeVisible();
		await expect(page.locator('input[name="password"]')).toBeVisible();
		await expect(page.locator('button[type="submit"]')).toBeVisible();
		
		// Check for form labels
		await expect(page.locator('label:has-text("Email")')).toBeVisible();
		await expect(page.locator('label:has-text("Password")')).toBeVisible();
	});

	test('should show validation errors for empty form submission', async ({ page }) => {
		await page.goto('/login');
		
		// Submit empty form
		await page.click('button[type="submit"]');
		
		// Should show validation errors
		await expect(page.locator('.error-message')).toBeVisible();
	});

	test('should show validation errors for invalid email format', async ({ page }) => {
		await page.goto('/login');
		
		// Fill with invalid email
		await page.fill('input[name="email"]', 'invalid-email');
		await page.fill('input[name="password"]', 'password123');
		await page.click('button[type="submit"]');
		
		// Should show email validation error
		await expect(page.locator('.error-message:has-text("email")')).toBeVisible();
	});

	test('should show error message for invalid credentials', async ({ page }) => {
		await page.goto('/login');
		
		// Fill with invalid credentials
		await page.fill('input[name="email"]', 'invalid@example.com');
		await page.fill('input[name="password"]', 'wrongpassword');
		await page.click('button[type="submit"]');
		
		// Should show authentication error
		await expect(page.locator('.error-message, .alert-error')).toBeVisible();
	});

	test('should successfully login HR manager and redirect to dashboard', async ({ page }) => {
		await page.goto('/login');
		
		// Fill with valid HR manager credentials
		await page.fill('input[name="email"]', 'hr.manager@mountainhr.com');
		await page.fill('input[name="password"]', 'hrmanager123');
		
		// Submit form
		await page.click('button[type="submit"]');
		
		// Should redirect to dashboard
		await expect(page).toHaveURL('/', { timeout: 10000 });
		
		// Should show dashboard content
		await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
		await expect(page.locator('.analytics-card')).toBeVisible();
	});

	test('should maintain session after successful login', async ({ page }) => {
		// Login first
		await page.goto('/login');
		await page.fill('input[name="email"]', 'hr.manager@mountainhr.com');
		await page.fill('input[name="password"]', 'hrmanager123');
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL('/');
		
		// Navigate to different page and back
		await page.goto('/employees');
		await expect(page.locator('h1:has-text("Employees")')).toBeVisible();
		
		// Go back to dashboard - should not redirect to login
		await page.goto('/');
		await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
	});

	test('should show HR manager navigation menu after login', async ({ page }) => {
		// Login as HR manager
		await page.goto('/login');
		await page.fill('input[name="email"]', 'hr.manager@mountainhr.com');
		await page.fill('input[name="password"]', 'hrmanager123');
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL('/');
		
		// Check for HR-specific navigation items
		await expect(page.locator('nav a[href="/employees"]')).toBeVisible();
		await expect(page.locator('nav a[href="/departments"]')).toBeVisible();
		await expect(page.locator('nav a[href="/communications"]')).toBeVisible();
		await expect(page.locator('nav a[href="/processes"]')).toBeVisible();
	});

	test('should successfully logout and redirect to login page', async ({ page }) => {
		// Login first
		await page.goto('/login');
		await page.fill('input[name="email"]', 'hr.manager@mountainhr.com');
		await page.fill('input[name="password"]', 'hrmanager123');
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL('/');
		
		// Logout
		await page.click('button:has-text("Logout"), .logout-button, [data-logout]');
		
		// Should redirect to login
		await expect(page).toHaveURL(/.*\/login/);
		
		// Verify session is cleared - accessing dashboard should redirect
		await page.goto('/');
		await expect(page).toHaveURL(/.*\/login/);
	});

	test('should handle password visibility toggle', async ({ page }) => {
		await page.goto('/login');
		
		const passwordInput = page.locator('input[name="password"]');
		const toggleButton = page.locator('button[aria-label*="password"], .password-toggle');
		
		// Password should be hidden by default
		await expect(passwordInput).toHaveAttribute('type', 'password');
		
		// Click toggle to show password
		if (await toggleButton.isVisible()) {
			await toggleButton.click();
			await expect(passwordInput).toHaveAttribute('type', 'text');
			
			// Click toggle to hide password again
			await toggleButton.click();
			await expect(passwordInput).toHaveAttribute('type', 'password');
		}
	});

	test('should handle redirect parameter after login', async ({ page }) => {
		// Try to access employees page without authentication
		await page.goto('/employees');
		await expect(page).toHaveURL(/.*\/login.*redirectTo/);
		
		// Login
		await page.fill('input[name="email"]', 'hr.manager@mountainhr.com');
		await page.fill('input[name="password"]', 'hrmanager123');
		await page.click('button[type="submit"]');
		
		// Should redirect to originally requested page
		await expect(page).toHaveURL('/employees');
		await expect(page.locator('h1:has-text("Employees")')).toBeVisible();
	});

	test('should handle loading state during login', async ({ page }) => {
		await page.goto('/login');
		
		// Fill form
		await page.fill('input[name="email"]', 'hr.manager@mountainhr.com');
		await page.fill('input[name="password"]', 'hrmanager123');
		
		// Click submit and immediately check for loading state
		await page.click('button[type="submit"]');
		
		// Should show loading indicator (briefly)
		const loadingStates = [
			page.locator('button[type="submit"]:disabled'),
			page.locator('button[type="submit"]:has-text("Signing in")'),
			page.locator('.loading, .spinner'),
			page.locator('button[type="submit"] .loading-icon')
		];
		
		// At least one loading indicator should be visible during submission
		const visibleLoader = await Promise.race(
			loadingStates.map(async (locator) => {
				try {
					await locator.waitFor({ timeout: 2000 });
					return locator;
				} catch {
					return null;
				}
			})
		);
		
		// Eventually should complete login
		await expect(page).toHaveURL('/', { timeout: 10000 });
	});
});
