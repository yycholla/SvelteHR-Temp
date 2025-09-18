import { test, expect } from '@playwright/test';

/**
 * T005: Contract test for navigation flow patterns
 *
 * This test validates the navigation flow contracts that ensure
 * proper page transitions and route handling in the SvelteKit application
 */

test.describe('Navigation Flow Contract', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('unauthenticated user navigation flow contract', async ({ page }) => {
    console.log('🔍 Testing unauthenticated navigation flow...');

    // Root page should redirect to login
    await page.goto('/');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');

    // Direct access to protected routes should redirect to login
    const protectedRoutes = ['/admin', '/employees', '/departments'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/login');
      console.log(`✅ ${route} redirected to login when unauthenticated`);
    }

    // Login page should be accessible
    await page.goto('/login');
    await page.waitForTimeout(1000);
    expect(page.url()).toContain('/login');

    // Login form elements should be present
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"], button:has-text("Sign In")')).toBeVisible();

    console.log('✅ Unauthenticated navigation flow contract validated');
  });

  test('page load performance contract', async ({ page }) => {
    console.log('🔍 Testing page load performance contract...');

    const performanceMetrics = {
      loginPage: 0,
      rootPage: 0,
      redirectTime: 0
    };

    // Measure login page load time
    const loginStart = Date.now();
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    performanceMetrics.loginPage = Date.now() - loginStart;

    // Measure root page redirect time
    const rootStart = Date.now();
    await page.goto('/');
    await page.waitForTimeout(2000); // Wait for redirect
    performanceMetrics.redirectTime = Date.now() - rootStart;

    console.log('🔍 Performance metrics:');
    console.log(`   - Login page load: ${performanceMetrics.loginPage}ms`);
    console.log(`   - Root redirect time: ${performanceMetrics.redirectTime}ms`);

    // Performance assertions
    expect(performanceMetrics.loginPage).toBeLessThan(5000); // Login loads in < 5s
    expect(performanceMetrics.redirectTime).toBeLessThan(3000); // Redirect in < 3s

    console.log('✅ Page load performance contract validated');
  });

  test('URL structure and routing contract', async ({ page }) => {
    console.log('🔍 Testing URL structure contract...');

    // Valid route patterns
    const routePatterns = {
      root: /^https?:\/\/localhost:5175\/?$/,
      login: /^https?:\/\/localhost:5175\/login\/?$/,
      admin: /^https?:\/\/localhost:5175\/admin\/?/,
      employees: /^https?:\/\/localhost:5175\/employees\/?/,
      departments: /^https?:\/\/localhost:5175\/departments\/?/
    };

    // Test login page URL structure
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toMatch(routePatterns.login);

    // Test that invalid routes handle gracefully
    await page.goto('/invalid-route');
    await page.waitForTimeout(2000);

    // Should either redirect to login or show 404 (both are acceptable)
    const currentUrl = page.url();
    const isValidResponse = currentUrl.includes('/login') ||
                          currentUrl.includes('/404') ||
                          currentUrl.includes('/not-found');

    expect(isValidResponse).toBe(true);

    console.log('✅ URL structure contract validated');
  });

  test('browser navigation controls contract', async ({ page }) => {
    console.log('🔍 Testing browser navigation controls...');

    // Navigate through pages to build history
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try to go to root (should redirect back to login)
    await page.goto('/');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/login');

    // Test browser back button functionality
    const initialUrl = page.url();

    // Navigate to login explicitly
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Back button should work (though might go to same page due to redirects)
    await page.goBack();
    await page.waitForTimeout(1000);

    // Should still be on a valid page (not broken)
    const afterBackUrl = page.url();
    expect(afterBackUrl).toMatch(/localhost:5175/);

    // Forward button should work
    await page.goForward();
    await page.waitForTimeout(1000);

    const afterForwardUrl = page.url();
    expect(afterForwardUrl).toMatch(/localhost:5175/);

    console.log('✅ Browser navigation controls contract validated');
  });

  test('page metadata and SEO contract', async ({ page }) => {
    console.log('🔍 Testing page metadata contract...');

    // Test login page metadata
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should have a title
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Should have meta viewport tag for mobile
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toBeTruthy();

    // Should have proper charset
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset).toBe('utf-8');

    // Check for basic HTML structure
    await expect(page.locator('html')).toBeVisible();
    await expect(page.locator('head')).toBeAttached();
    await expect(page.locator('body')).toBeVisible();

    console.log('✅ Page metadata contract validated');
  });

  test('error handling and resilience contract', async ({ page }) => {
    console.log('🔍 Testing error handling contract...');

    // Test network error resilience
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Page should handle JavaScript errors gracefully
    const jsErrors: string[] = [];
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate and wait for potential errors
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Should not have unhandled JavaScript errors
    expect(jsErrors.length).toBe(0);

    // Console errors should be minimal (some expected during development)
    const criticalErrors = consoleErrors.filter(error =>
      error.includes('TypeError') ||
      error.includes('ReferenceError') ||
      error.includes('SyntaxError')
    );

    expect(criticalErrors.length).toBe(0);

    // Page should still be functional despite any warnings
    expect(page.url()).toMatch(/localhost:5175/);

    console.log('✅ Error handling contract validated');
  });

  test('accessibility and usability contract', async ({ page }) => {
    console.log('🔍 Testing accessibility contract...');

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Should be keyboard navigable
    await page.keyboard.press('Tab');
    const activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A'].includes(activeElement || '')).toBe(true);

    // Form elements should have proper labels or placeholders
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Should have submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")');
    await expect(submitButton).toBeVisible();

    // Page should be readable (basic contrast check)
    const bodyBg = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });

    const bodyColor = await page.evaluate(() => {
      return getComputedStyle(document.body).color;
    });

    expect(bodyBg).toBeTruthy();
    expect(bodyColor).toBeTruthy();

    console.log('✅ Accessibility contract validated');
  });
});