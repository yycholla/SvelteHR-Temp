// Vitest Browser Environment Setup with Playwright
// Browser-based component testing configuration
// Created: 2025-09-24

import { beforeAll, afterEach } from 'vitest';
import { page } from '@vitest/browser/context';

beforeAll(async () => {
  console.log('Setting up browser test environment...');

  // Configure browser for component testing
  if (page) {
    try {
      // Set consistent viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      // Set timezone
      await page.emulateTimezone('UTC');

      // Set locale
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
      });

      // Navigate to test page
      await page.goto('about:blank');
    } catch (error) {
      console.error('Failed to setup browser test environment:', error);
      console.error('Failed operation:', (error as Error).message);
      // Rethrow to fail the test suite fast
      throw new Error(`Browser setup failed: ${(error as Error).message}`);
    }
  }
});

afterEach(async () => {
  // Clean up browser state after each test
  if (page) {
    // Clear local storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Clear cookies
    const context = page.context();
    await context.clearCookies();

    // Navigate to blank page
    await page.goto('about:blank');
  }
});