import { Page, expect } from '@playwright/test';

export class TestHelpers {
	constructor(private page: Page) {}

	/**
	 * Login with admin credentials
	 */
	async loginAsAdmin() {
		await this.page.goto('/login');
		await this.page.fill('input[name="username"]', 'admin');
		await this.page.fill('input[name="password"]', 'admin');
		await this.page.click('button[type="submit"]');

		// Wait for redirect to dashboard
		await this.page.waitForURL('/home', { timeout: 10000 });
		await expect(this.page.locator('h1')).toContainText('Dashboard', { timeout: 10000 });
	}

	/**
	 * Check if user is authenticated (has auth token cookie)
	 */
	async checkAuthenticated() {
		const cookies = await this.page.context().cookies();
		const authCookie = cookies.find((cookie) => cookie.name === 'auth-token');
		expect(authCookie).toBeTruthy();
		return authCookie;
	}

	/**
	 * Wait for streaming to complete
	 */
	async waitForStreamingComplete(timeout: number = 10000) {
		// Wait for progress bar to disappear
		await this.page.waitForSelector('.progress-container', { state: 'hidden', timeout });
	}

	/**
	 * Toggle streaming mode
	 */
	async toggleStreamingMode() {
		await this.page.click('button:has-text("Streaming")');
		await this.page.waitForTimeout(500); // Allow UI to update
	}

	/**
	 * Check for API error messages
	 */
	async checkForApiErrors() {
		const errorMessages = this.page.locator('.error-section');
		const hasErrors = (await errorMessages.count()) > 0;
		if (hasErrors) {
			const errorText = await errorMessages.textContent();
			console.log('API Errors found:', errorText);
		}
		return hasErrors;
	}

	/**
	 * Wait for table to load data
	 */
	async waitForTableData(tableSelector: string = 'table', timeout: number = 10000) {
		// Wait for table to exist
		await this.page.waitForSelector(tableSelector, { timeout });

		// Wait for at least one data row (not just headers)
		await this.page.waitForSelector(`${tableSelector} tbody tr`, { timeout });

		// Make sure it's not a loading skeleton
		await this.page.waitForFunction(
			(selector) => {
				const rows = document.querySelectorAll(`${selector} tbody tr`);
				return rows.length > 0 && !document.querySelector('.skeleton-loader');
			},
			tableSelector,
			{ timeout }
		);
	}

	/**
	 * Check for loading states
	 */
	async waitForLoadingToComplete() {
		// Wait for any skeleton loaders to disappear
		await this.page.waitForSelector('.skeleton-loader', { state: 'hidden', timeout: 10000 });

		// Wait for any loading spinners to disappear
		await this.page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 5000 });
	}

	/**
	 * Take a screenshot with a custom name
	 */
	async takeScreenshot(name: string) {
		await this.page.screenshot({
			path: `e2e/screenshots/${name}.png`,
			fullPage: true
		});
	}

	/**
	 * Check responsive design
	 */
	async testResponsiveDesign() {
		const viewports = [
			{ width: 1920, height: 1080, name: 'desktop' },
			{ width: 768, height: 1024, name: 'tablet' },
			{ width: 375, height: 667, name: 'mobile' }
		];

		for (const viewport of viewports) {
			await this.page.setViewportSize({ width: viewport.width, height: viewport.height });
			await this.page.waitForTimeout(500); // Allow layout to adjust
			await this.takeScreenshot(`responsive-${viewport.name}`);
		}
	}

	/**
	 * Test accessibility
	 */
	async checkAccessibility() {
		// Check for basic accessibility attributes
		const mainContent = this.page.locator('main, [role="main"]');
		await expect(mainContent).toBeVisible();

		// Check for proper heading hierarchy
		const h1 = this.page.locator('h1');
		await expect(h1).toBeVisible();

		// Check for alt text on images
		const images = this.page.locator('img');
		const imageCount = await images.count();

		for (let i = 0; i < imageCount; i++) {
			const img = images.nth(i);
			const alt = await img.getAttribute('alt');
			const role = await img.getAttribute('role');

			// Images should have alt text or be marked as decorative
			expect(alt !== null || role === 'presentation').toBeTruthy();
		}
	}

	/**
	 * Logout user
	 */
	async logout() {
		// Look for logout button/link
		const logoutButton = this.page.locator('button:has-text("Logout"), a:has-text("Logout")');
		if (await logoutButton.isVisible()) {
			await logoutButton.click();
		}

		// Wait for redirect to login or home
		await this.page.waitForURL(/\/(login|)$/, { timeout: 5000 });
	}

	/**
	 * Check for console errors
	 */
	async checkConsoleErrors() {
		const logs: string[] = [];

		this.page.on('console', (msg) => {
			if (msg.type() === 'error') {
				logs.push(msg.text());
			}
		});

		return logs;
	}

	/**
	 * Simulate network conditions
	 */
	async simulateSlowNetwork() {
		await this.page.route('**/*', (route) => {
			// Add delay to simulate slow network
			setTimeout(() => route.continue(), 1000);
		});
	}

	/**
	 * Mock API responses
	 */
	async mockApiResponse(endpoint: string, response: any) {
		await this.page.route(`**/api/**/${endpoint}`, (route) => {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify(response)
			});
		});
	}
}
