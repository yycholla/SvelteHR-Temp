import { test, expect } from '@playwright/test';

test.describe('Dashboard Component Rendering - RED Phase', () => {
	test('dashboard loads without JavaScript console errors from deprecated components', async ({
		page
	}) => {
		// RED PHASE: This should fail initially due to <svelte:component> deprecation warnings
		const consoleErrors: string[] = [];
		const consoleWarnings: string[] = [];

		// Capture console errors and warnings
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text());
			} else if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text());
			}
		});

		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Wait for dashboard content to be visible
		await expect(page.locator('text=Dashboard')).toBeVisible();

		// RED PHASE: This will fail initially due to no JavaScript errors requirement
		expect(consoleErrors).toHaveLength(0);

		// RED PHASE: This will fail due to Svelte 5 deprecation warnings about <svelte:component>
		const sveltComponentWarnings = consoleWarnings.filter(
			(warning) => warning.includes('svelte:component') && warning.includes('deprecated')
		);
		expect(sveltComponentWarnings).toHaveLength(0);
	});

	test('dashboard metrics display correctly without component deprecation warnings', async ({
		page
	}) => {
		// RED PHASE: Test that metrics render properly without deprecation issues
		const consoleWarnings: string[] = [];

		page.on('console', (msg) => {
			if (msg.type() === 'warning') {
				consoleWarnings.push(msg.text());
			}
		});

		await page.goto('/dashboard');
		await page.waitForLoadState('networkidle');

		// Check that metrics are displayed
		const metrics = page.locator('[data-testid="metric-card"], .metric-card, .card').first();
		await expect(metrics).toBeVisible();

		// RED PHASE: This will fail due to <svelte:component> deprecation warnings
		const deprecationWarnings = consoleWarnings.filter(
			(warning) =>
				warning.includes('deprecated') &&
				(warning.includes('svelte:component') || warning.includes('runes mode'))
		);
		expect(deprecationWarnings).toHaveLength(0);
	});
});
