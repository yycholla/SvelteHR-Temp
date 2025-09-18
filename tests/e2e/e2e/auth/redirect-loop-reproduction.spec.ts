import { test, expect } from '@playwright/test';
import { login, waitForAuthentication, TEST_USERS, setupAuthLogging, detectRedirectLoop } from '../helpers/auth';

/**
 * T006: E2E test for redirect loop reproduction
 *
 * CRITICAL: This test MUST FAIL to demonstrate the current redirect loop bug
 * This test reproduces the infinite redirect behavior between login and admin pages
 */

test.describe('Authentication Redirect Loop Reproduction', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app first to establish context
    await page.goto('/');

    // Clear any existing auth state
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('SHOULD FAIL: admin login creates infinite redirect loop', async ({ page }) => {
    // Set up logging to capture auth-related console messages
    const authLogs = await setupAuthLogging(page);

    // Set up redirect detection
    const redirectPromise = detectRedirectLoop(page, 10000); // Monitor for 10 seconds

    console.log('🔍 Starting login process to reproduce redirect loop...');

    // Attempt to login with admin credentials
    await login(page, TEST_USERS.admin);

    console.log('🔍 Login form submitted, monitoring for redirect behavior...');

    // Wait for initial authentication (this should work)
    try {
      await waitForAuthentication(page, 5000);
      console.log('✅ JWT token received in localStorage');
    } catch (error) {
      test.fail(true, 'Authentication failed - JWT token not received');
    }

    // Monitor for redirect loop behavior
    const redirectResult = await redirectPromise;

    console.log(`🔍 Redirect monitoring complete:`);
    console.log(`   - Redirect count: ${redirectResult.redirectCount}`);
    console.log(`   - Has loop detected: ${redirectResult.hasLoop}`);
    console.log(`   - URL history: ${redirectResult.urlHistory.map(h => h.url).join(' -> ')}`);

    // Log auth-related console messages
    console.log('🔍 Authentication-related console logs:');
    authLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log}`);
    });

    // THIS ASSERTION SHOULD FAIL - proving the redirect loop exists
    expect(redirectResult.hasLoop).toBe(false); // This will fail if loop detected
    expect(redirectResult.redirectCount).toBeLessThan(3); // Should be < 3 redirects

    // Verify we end up on the admin page (not stuck in loop)
    await expect(page).toHaveURL(/\/admin/, { timeout: 5000 });

    // Verify no excessive auth validation calls
    const validateSessionCalls = authLogs.filter(log =>
      log.includes('validateSession: Starting validation')
    ).length;

    console.log(`🔍 validateSession calls detected: ${validateSessionCalls}`);
    expect(validateSessionCalls).toBeLessThanOrEqual(2); // Should be <= 2 calls

    // If we reach here without failing, the bug is fixed
    console.log('✅ No redirect loop detected - test would pass if bug is fixed');
  });

  test('SHOULD FAIL: multiple validateSession calls occur during login', async ({ page }) => {
    const authLogs = await setupAuthLogging(page);
    let validateSessionCount = 0;

    // Count validateSession calls in real-time
    page.on('console', (msg) => {
      if (msg.text().includes('validateSession: Starting validation')) {
        validateSessionCount++;
        console.log(`⚠️  validateSession call #${validateSessionCount} detected`);
      }
    });

    // Perform login
    await login(page, TEST_USERS.admin);

    // Wait for auth completion
    await waitForAuthentication(page);

    // Wait additional time for any delayed validation calls
    await page.waitForTimeout(5000);

    console.log(`🔍 Final validateSession call count: ${validateSessionCount}`);

    // THIS SHOULD FAIL - there should be only 1 validateSession call
    expect(validateSessionCount).toBe(1);

    // Check for multiple admin layout messages (indicating re-rendering)
    const adminLayoutCalls = authLogs.filter(log =>
      log.includes('Admin layout: User is admin')
    ).length;

    console.log(`🔍 Admin layout authorization calls: ${adminLayoutCalls}`);
    expect(adminLayoutCalls).toBe(1); // Should only authorize once
  });

  test('SHOULD FAIL: auth state stabilizes quickly without loops', async ({ page }) => {
    const authLogs = await setupAuthLogging(page);
    const startTime = Date.now();

    // Perform login
    await login(page, TEST_USERS.admin);
    await waitForAuthentication(page);

    // Monitor console logs for 3 seconds after auth
    let authActivityCount = 0;
    const monitoringPeriod = 3000; // 3 seconds

    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('validateSession') ||
          text.includes('AuthGuard') ||
          text.includes('Admin layout')) {
        const timeSinceStart = Date.now() - startTime;
        if (timeSinceStart > 2000) { // After 2 seconds from start
          authActivityCount++;
          console.log(`⚠️  Late auth activity (${timeSinceStart}ms): ${text}`);
        }
      }
    });

    // Wait for the monitoring period
    await page.waitForTimeout(monitoringPeriod);

    console.log(`🔍 Auth activity after stabilization period: ${authActivityCount} calls`);

    // THIS SHOULD FAIL - no auth activity should occur after initial stabilization
    expect(authActivityCount).toBe(0);

    // Verify final URL is stable
    const finalUrl = page.url();
    await page.waitForTimeout(1000);
    const urlAfterWait = page.url();

    expect(finalUrl).toBe(urlAfterWait); // URL should not change
    expect(finalUrl).toContain('/admin'); // Should be on admin page
  });

  test('SHOULD FAIL: session storage flags are managed correctly', async ({ page }) => {
    // Start with clean state
    await page.goto('/');

    // Perform login
    await login(page, TEST_USERS.admin);
    await waitForAuthentication(page);

    // Check session storage flags
    const sessionFlags = await page.evaluate(() => {
      const flags: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes('hr_')) {
          flags.push(`${key}=${sessionStorage.getItem(key)}`);
        }
      }
      return flags;
    });

    console.log(`🔍 Session storage flags found: ${sessionFlags.join(', ')}`);

    // Wait and check again for accumulating flags
    await page.waitForTimeout(2000);

    const laterFlags = await page.evaluate(() => {
      const flags: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes('hr_')) {
          flags.push(`${key}=${sessionStorage.getItem(key)}`);
        }
      }
      return flags;
    });

    console.log(`🔍 Session storage flags after wait: ${laterFlags.join(', ')}`);

    // THIS SHOULD FAIL - session flags should be cleaned up, not accumulating
    expect(laterFlags.length).toBeLessThanOrEqual(1); // Should not accumulate flags

    // Try opening a new tab to test cross-tab behavior
    const newPage = await page.context().newPage();
    await newPage.goto('/admin');

    // Check if new tab is also affected by redirect issues
    await page.waitForTimeout(2000);

    const newTabUrl = newPage.url();
    console.log(`🔍 New tab final URL: ${newTabUrl}`);

    // Should navigate to admin directly (already authenticated)
    expect(newTabUrl).toContain('/admin');

    await newPage.close();
  });
});