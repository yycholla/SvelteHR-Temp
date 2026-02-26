import { expect, test, type Page } from '@playwright/test';

const TEST_USER = {
	email: 'admin@mountainhr.dev',
	password: 'admin123'
};

async function login(page: Page): Promise<void> {
	await page.goto('/login');
	await page.locator('[data-testid="login-username-input"]').fill(TEST_USER.email);
	await page.locator('[data-testid="login-password-input"]').fill(TEST_USER.password);

	const submit = page.locator('[data-testid="login-submit-button"]');
	await expect(submit).toBeEnabled({ timeout: 30000 });
	await submit.click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

test.describe('Core Pages - Functional Smoke', () => {
	test('authenticated user can load critical application pages', async ({ page }) => {
		await login(page);

		const criticalRoutes = [
			'/dashboard',
			'/dashboard/employees',
			'/dashboard/departments',
			'/dashboard/departments/new',
			'/dashboard/tasks',
			'/dashboard/tasks/my-tasks',
			'/dashboard/tasks/team-tasks',
			'/dashboard/events',
			'/dashboard/management',
			'/admin/settings/integrations'
		];

		for (const route of criticalRoutes) {
			const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
			expect(response?.status(), `unexpected status for ${route}`).toBeLessThan(400);
			expect(page.url(), `unexpected login redirect for ${route}`).not.toContain('/login');
		}
	});

	test('critical authenticated functions respond correctly', async ({ page }) => {
		await login(page);

		const refreshResult = (await page.evaluate(async () => {
			const response = await fetch('/api/auth/refresh', {
				method: 'POST',
				credentials: 'include'
			});
			const payload = await response.json();
			return { status: response.status, payload };
		})) as { status: number; payload: { success?: boolean } };

		expect(refreshResult.status).toBe(200);
		expect(refreshResult.payload.success).toBe(true);

		const taskDataResponse = await page.request.get('/dashboard/tasks/my-tasks/__data.json');
		expect(taskDataResponse.status()).toBe(200);
		const taskDataBody = await taskDataResponse.text();
		expect(taskDataBody).toContain('taskTypes');
		expect(taskDataBody).toContain('assignees');

		const intuitConnect = await page.request.get('/api/intuit/connect', { maxRedirects: 0 });
		expect(intuitConnect.status()).toBe(302);
		expect(intuitConnect.headers()['location'] ?? '').toContain('appcenter.intuit.com');
	});
});
