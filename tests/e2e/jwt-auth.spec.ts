import { expect, test, type Page } from '@playwright/test';

const TEST_USER = {
	email: 'admin@mountainhr.dev',
	password: 'admin123'
};

async function login(page: Page) {
	await page.goto('/login');
	await page.locator('[data-testid="login-username-input"]').fill(TEST_USER.email);
	await page.locator('[data-testid="login-password-input"]').fill(TEST_USER.password);

	const submit = page.locator('[data-testid="login-submit-button"]');
	await expect(submit).toBeEnabled({ timeout: 30000 });
	await submit.click();

	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe('JWT Authentication - Functional Flows', () => {
	test('redirects unauthenticated users to /login', async ({ page }) => {
		await page.goto('/dashboard');
		await page.waitForURL(/\/login\?redirectTo=/, { timeout: 10000 });
		expect(page.url()).toContain('/login');
	});

	test('logs in successfully and reaches dashboard', async ({ page }) => {
		await login(page);
		expect(page.url()).toContain('/dashboard');

		// Dashboard should render real page content, not login form
		await expect(page.locator('[data-testid="login-form"]')).toHaveCount(0);
	});

	test('shows auth error for invalid credentials', async ({ page }) => {
		await page.goto('/login');
		await page.locator('[data-testid="login-username-input"]').fill(TEST_USER.email);
		await page.locator('[data-testid="login-password-input"]').fill('wrong-password');

		const submit = page.locator('[data-testid="login-submit-button"]');
		await expect(submit).toBeEnabled({ timeout: 30000 });
		await submit.click();

		const error = page.locator('[data-testid="login-error-message"]');
		await expect(error).toBeVisible({ timeout: 10000 });
		expect(page.url()).toContain('/login');
	});

	test('authenticated session can access core routes', async ({ page }) => {
		await login(page);

		for (const path of ['/dashboard', '/dashboard/employees', '/dashboard/departments/new']) {
			const response = await page.goto(path, { waitUntil: 'domcontentloaded' });
			expect(response?.status(), `unexpected status for ${path}`).toBeLessThan(400);
			expect(page.url(), `unexpected redirect for ${path}`).not.toContain('/login');
		}
	});

	test('refresh endpoint returns a new access token for authenticated user', async ({ page }) => {
		await login(page);
		const refreshResult = (await page.evaluate(async () => {
			const response = await fetch('/api/auth/refresh', {
				method: 'POST',
				credentials: 'include'
			});
			return {
				status: response.status,
				payload: (await response.json()) as {
					success?: boolean;
					accessToken?: string;
					expiresIn?: number;
				}
			};
		})) as {
			status: number;
			payload: { success?: boolean; accessToken?: string; expiresIn?: number };
		};

		expect(refreshResult.status).toBe(200);
		const payload = refreshResult.payload;

		expect(payload.success).toBe(true);
		expect(typeof payload.accessToken).toBe('string');
		expect(payload.accessToken?.length).toBeGreaterThan(20);
		expect(typeof payload.expiresIn).toBe('number');
	});

	test('logout endpoint clears session and protected routes redirect to login', async ({
		page
	}) => {
		await login(page);

		const logout = await page.request.post('/api/auth/logout');
		expect(logout.status()).toBe(200);

		await page.goto('/dashboard');
		await page.waitForURL(/\/login\?redirectTo=/, { timeout: 10000 });
		expect(page.url()).toContain('/login');
	});

	test('intuit connect endpoint is available for authenticated users', async ({ page }) => {
		await login(page);

		const response = await page.request.get('/api/intuit/connect', { maxRedirects: 0 });
		expect(response.status()).toBe(302);
		const location = response.headers()['location'] ?? '';
		expect(location).toContain('appcenter.intuit.com');
		expect(location).toContain('oauth2');
	});
});
