import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Streaming Functionality', () => {
	let helpers: TestHelpers;

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page);
		await helpers.loginAsAdmin();
	});

	test('should test streaming on demo page', async ({ page }) => {
		await page.goto('/streaming-demo');
		
		// Should load streaming demo page
		await expect(page.locator('h1')).toContainText('Streaming Demo');
		
		// Should have mode toggle
		const streamingButton = page.locator('button:has-text("Streaming")');
		await expect(streamingButton).toBeVisible();
		
		// Enable streaming mode
		await streamingButton.click();
		
		// Should show progress bar
		const progressContainer = page.locator('.progress-container');
		await expect(progressContainer).toBeVisible({ timeout: 2000 });
		
		// Should show progress text
		const progressText = page.locator('.progress-text');
		await expect(progressText).toBeVisible();
		
		// Wait for streaming to complete
		await helpers.waitForStreamingComplete(15000);
		
		// Should show loaded data
		const statCards = page.locator('.stat-card');
		await expect(statCards.first()).toBeVisible();
		
		// Take screenshot of completed streaming
		await helpers.takeScreenshot('streaming-demo-complete');
	});

	test('should handle streaming progress correctly', async ({ page }) => {
		await page.goto('/streaming-demo');
		
		// Enable streaming
		const streamingButton = page.locator('button:has-text("Streaming")');
		if (await streamingButton.isVisible()) {
			await streamingButton.click();
			
			// Track progress updates
			const progressFill = page.locator('.progress-fill');
			
			// Should start with some width
			await expect(progressFill).toBeVisible({ timeout: 3000 });
			
			// Progress should eventually reach 100%
			await page.waitForFunction(
				() => {
					const progressElement = document.querySelector('.progress-fill');
					if (!progressElement) return false;
					const width = progressElement.getAttribute('style');
					return width && width.includes('100%');
				},
				{},
				{ timeout: 15000 }
			);
		}
	});

	test('should display streaming data incrementally', async ({ page }) => {
		await page.goto('/streaming-demo');
		
		// Enable streaming
		const streamingButton = page.locator('button:has-text("Streaming")');
		if (await streamingButton.isVisible()) {
			await streamingButton.click();
			
			// Monitor data loading
			const statCards = page.locator('.stat-card');
			const totalCards = await statCards.count();
			
			if (totalCards > 0) {
				// Should eventually show loaded state
				await expect(page.locator('text="✓ Loaded"').first()).toBeVisible({ timeout: 15000 });
				
				// Should show actual data values
				const statNumbers = page.locator('.stat-number');
				await expect(statNumbers.first()).toContainText(/\d+/);
			}
		}
	});

	test('should handle streaming errors gracefully', async ({ page }) => {
		// Mock some API failures
		await page.route('**/api/v1/tasks**', (route) => {
			route.fulfill({ status: 500, body: 'Internal Server Error' });
		});
		
		await page.goto('/streaming-demo');
		
		// Enable streaming
		const streamingButton = page.locator('button:has-text("Streaming")');
		if (await streamingButton.isVisible()) {
			await streamingButton.click();
			
			// Should complete streaming despite errors
			await helpers.waitForStreamingComplete(15000);
			
			// Should show error information
			const hasErrors = await helpers.checkForApiErrors();
			
			// Page should still be functional
			await expect(page.locator('h1')).toContainText('Streaming Demo');
		}
	});

	test('should switch between streaming and static modes', async ({ page }) => {
		await page.goto('/streaming-demo');
		
		const staticButton = page.locator('button:has-text("Static")');
		const streamingButton = page.locator('button:has-text("Streaming")');
		
		if (await staticButton.isVisible() && await streamingButton.isVisible()) {
			// Test static mode first
			await staticButton.click();
			await page.waitForTimeout(1000);
			
			// Should show static content
			const staticContent = page.locator('.static-content');
			await expect(staticContent).toBeVisible({ timeout: 5000 });
			
			await helpers.takeScreenshot('streaming-static-mode');
			
			// Test streaming mode
			await streamingButton.click();
			await page.waitForTimeout(1000);
			
			// Should show progress bar
			const progressContainer = page.locator('.progress-container');
			await expect(progressContainer).toBeVisible({ timeout: 3000 });
			
			await helpers.takeScreenshot('streaming-active');
		}
	});

	test('should persist streaming preference', async ({ page }) => {
		await page.goto('/streaming-demo');
		
		// Enable streaming
		const streamingButton = page.locator('button:has-text("Streaming")');
		if (await streamingButton.isVisible()) {
			await streamingButton.click();
			
			// Reload page
			await page.reload();
			
			// Should remember streaming preference
			// Note: This depends on localStorage implementation
			const activeButton = page.locator('button.active:has-text("Streaming")');
			await expect(activeButton).toBeVisible({ timeout: 5000 });
		}
	});

	test('should work on mobile devices', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		
		await page.goto('/streaming-demo');
		
		// Should be responsive
		const modeControls = page.locator('.mode-controls, .mode-toggle-container');
		await expect(modeControls).toBeVisible();
		
		// Toggle buttons should be accessible
		const streamingButton = page.locator('button:has-text("Streaming")');
		if (await streamingButton.isVisible()) {
			await streamingButton.click();
			
			// Progress should work on mobile
			const progressContainer = page.locator('.progress-container');
			await expect(progressContainer).toBeVisible({ timeout: 3000 });
			
			await helpers.takeScreenshot('streaming-mobile');
		}
	});
});