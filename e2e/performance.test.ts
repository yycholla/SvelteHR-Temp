import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Performance Tests', () => {
	let helpers: TestHelpers;

	test.beforeEach(async ({ page }) => {
		helpers = new TestHelpers(page);
	});

	test('should load login page quickly', async ({ page }) => {
		const startTime = Date.now();
		
		await page.goto('/login');
		await expect(page.locator('input[name="username"]')).toBeVisible();
		
		const loadTime = Date.now() - startTime;
		expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
		
		console.log(`Login page load time: ${loadTime}ms`);
	});

	test('should login and navigate quickly', async ({ page }) => {
		const startTime = Date.now();
		
		await helpers.loginAsAdmin();
		
		const loginTime = Date.now() - startTime;
		expect(loginTime).toBeLessThan(10000); // Should login within 10 seconds
		
		console.log(`Login process time: ${loginTime}ms`);
	});

	test('should measure dashboard load performance', async ({ page }) => {
		await helpers.loginAsAdmin();
		
		const startTime = Date.now();
		await page.goto('/home');
		
		// Wait for key dashboard elements
		await expect(page.locator('h1')).toContainText('Dashboard');
		await helpers.waitForLoadingToComplete();
		
		const loadTime = Date.now() - startTime;
		expect(loadTime).toBeLessThan(8000); // Dashboard should load within 8 seconds
		
		console.log(`Dashboard load time: ${loadTime}ms`);
		
		// Measure streaming performance if available
		const streamingButton = page.locator('button:has-text("Streaming")');
		if (await streamingButton.isVisible()) {
			const streamingStart = Date.now();
			await streamingButton.click();
			await helpers.waitForStreamingComplete(15000);
			
			const streamingTime = Date.now() - streamingStart;
			console.log(`Streaming completion time: ${streamingTime}ms`);
			
			// Streaming should complete within reasonable time
			expect(streamingTime).toBeLessThan(15000);
		}
	});

	test('should measure employees page performance', async ({ page }) => {
		await helpers.loginAsAdmin();
		
		const startTime = Date.now();
		await page.goto('/employees');
		
		// Wait for page to load
		await expect(page.locator('h1')).toContainText('Employees');
		await helpers.waitForLoadingToComplete();
		
		const loadTime = Date.now() - startTime;
		expect(loadTime).toBeLessThan(8000);
		
		console.log(`Employees page load time: ${loadTime}ms`);
	});

	test('should handle slow network conditions', async ({ page }) => {
		// Simulate slow network
		await helpers.simulateSlowNetwork();
		
		const startTime = Date.now();
		await helpers.loginAsAdmin();
		
		const slowLoadTime = Date.now() - startTime;
		console.log(`Slow network login time: ${slowLoadTime}ms`);
		
		// Should still complete, just takes longer
		expect(slowLoadTime).toBeLessThan(30000); // 30 second timeout for slow network
	});

	test('should measure memory usage', async ({ page }) => {
		await helpers.loginAsAdmin();
		
		// Navigate through multiple pages to test memory
		const pages = ['/home', '/employees', '/tasks', '/hr'];
		
		for (const pagePath of pages) {
			await page.goto(pagePath);
			await helpers.waitForLoadingToComplete();
			
			// Get memory usage
			const memoryUsage = await page.evaluate(() => {
				if ('memory' in performance) {
					return (performance as any).memory;
				}
				return null;
			});
			
			if (memoryUsage) {
				console.log(`Memory usage on ${pagePath}:`, {
					used: Math.round(memoryUsage.usedJSHeapSize / 1024 / 1024) + 'MB',
					total: Math.round(memoryUsage.totalJSHeapSize / 1024 / 1024) + 'MB'
				});
				
				// Memory shouldn't grow excessively
				expect(memoryUsage.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
			}
		}
	});

	test('should measure Core Web Vitals', async ({ page }) => {
		await page.goto('/login');
		
		// Measure Largest Contentful Paint (LCP)
		const lcp = await page.evaluate(() => {
			return new Promise((resolve) => {
				const observer = new PerformanceObserver((list) => {
					const entries = list.getEntries();
					const lastEntry = entries[entries.length - 1];
					resolve(lastEntry.startTime);
				});
				observer.observe({ entryTypes: ['largest-contentful-paint'] });
				
				// Fallback timeout
				setTimeout(() => resolve(0), 5000);
			});
		});
		
		console.log(`LCP: ${lcp}ms`);
		if (lcp > 0) {
			expect(lcp).toBeLessThan(2500); // Good LCP is under 2.5s
		}
		
		// Measure Cumulative Layout Shift (CLS)
		const cls = await page.evaluate(() => {
			return new Promise((resolve) => {
				let clsValue = 0;
				const observer = new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (!(entry as any).hadRecentInput) {
							clsValue += (entry as any).value;
						}
					}
				});
				observer.observe({ entryTypes: ['layout-shift'] });
				
				setTimeout(() => resolve(clsValue), 3000);
			});
		});
		
		console.log(`CLS: ${cls}`);
		expect(cls).toBeLessThan(0.1); // Good CLS is under 0.1
	});

	test('should test concurrent users simulation', async ({ browser }) => {
		// Create multiple browser contexts to simulate concurrent users
		const userSessions = [];
		const sessionCount = 3;
		
		const startTime = Date.now();
		
		// Create concurrent sessions
		for (let i = 0; i < sessionCount; i++) {
			const context = await browser.newContext();
			const page = await context.newPage();
			const sessionHelper = new TestHelpers(page);
			
			userSessions.push({ context, page, helper: sessionHelper });
		}
		
		// Login all users concurrently
		const loginPromises = userSessions.map(session => 
			session.helper.loginAsAdmin()
		);
		
		await Promise.all(loginPromises);
		
		const concurrentLoginTime = Date.now() - startTime;
		console.log(`Concurrent login time for ${sessionCount} users: ${concurrentLoginTime}ms`);
		
		// Navigate all users to different pages
		const navigationPromises = userSessions.map((session, index) => {
			const pages = ['/home', '/employees', '/tasks'];
			const targetPage = pages[index % pages.length];
			return session.page.goto(targetPage);
		});
		
		await Promise.all(navigationPromises);
		
		// Cleanup
		for (const session of userSessions) {
			await session.context.close();
		}
		
		// Performance should not degrade significantly with concurrent users
		expect(concurrentLoginTime).toBeLessThan(20000);
	});

	test('should test bundle size impact', async ({ page }) => {
		// Navigate to a page and measure transferred resources
		await page.goto('/login');
		
		// Get network activity
		const responses = [];
		page.on('response', response => {
			if (response.url().includes(page.url().split('/').slice(0, 3).join('/'))) {
				responses.push({
					url: response.url(),
					status: response.status(),
					size: response.headers()['content-length']
				});
			}
		});
		
		await helpers.loginAsAdmin();
		await page.goto('/home');
		
		console.log(`Total network responses: ${responses.length}`);
		
		// Calculate total transferred data
		const totalSize = responses.reduce((sum, response) => {
			const size = parseInt(response.size || '0');
			return sum + size;
		}, 0);
		
		console.log(`Total transferred data: ${Math.round(totalSize / 1024)}KB`);
		
		// Should not transfer excessive data
		expect(totalSize).toBeLessThan(5 * 1024 * 1024); // Less than 5MB total
	});
});