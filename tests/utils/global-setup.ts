// Global Test Setup for Playwright
// Database initialization and test environment preparation
// Created: 2025-09-24

import { type FullConfig, type Page, chromium } from '@playwright/test';
import { DatabaseTestUtils, createTestContext } from './test-helpers';

async function globalSetup(config: FullConfig) {
	console.log('🚀 Starting global test setup...');

	try {
		// Initialize test database
		await DatabaseTestUtils.setupTestDatabase();
		console.log('✅ Test database initialized');

		// Seed initial test data
		const testContext = await DatabaseTestUtils.seedTestData();
		console.log('✅ Test data seeded');

		// Store test context globally for use in tests
		process.env.TEST_CONTEXT = JSON.stringify(testContext);

		// Determine base URL (use Docker port 5173 for local, 5174 for CI)
		const baseURL =
			process.env.PLAYWRIGHT_BASE_URL ||
			(process.env.CI ? 'http://localhost:5174' : 'http://localhost:5173');

		// Setup browser for authentication state
		const browser = await chromium.launch();
		const users = testContext.users;

		await createAuthState(
			browser,
			baseURL,
			users.admin.email,
			'admin123',
			'tests/.auth/admin-auth.json'
		);
		await createAuthState(
			browser,
			baseURL,
			users.hrManager.email,
			'admin123',
			'tests/.auth/hr-manager-auth.json'
		);
		await createAuthState(
			browser,
			baseURL,
			users.manager.email,
			'admin123',
			'tests/.auth/manager-auth.json'
		);
		await createAuthState(
			browser,
			baseURL,
			users.employee.email,
			'admin123',
			'tests/.auth/employee-auth.json'
		);

		await browser.close();
		console.log('✅ Authentication states created');

		console.log('🎉 Global test setup completed successfully');
	} catch (error) {
		console.error('❌ Global test setup failed:', error);
		process.exit(1);
	}
}

async function createAuthState(
	browser: Awaited<ReturnType<typeof chromium.launch>>,
	baseURL: string,
	email: string,
	password: string,
	statePath: string
) {
	const context = await browser.newContext({ baseURL });
	const page = await context.newPage();

	try {
		await authenticateUser(page, email, password);
	} catch (error) {
		console.warn(`⚠️  Failed to authenticate ${email}:`, error);
	}
	await context.storageState({ path: statePath });
	await context.close();
}

async function authenticateUser(page: Page, email: string, password: string) {
	await page.goto('/login');

	await page
		.locator('[data-testid="login-username-input"], input[type="email"]')
		.first()
		.fill(email);
	await page
		.locator('[data-testid="login-password-input"], input[type="password"]')
		.first()
		.fill(password);
	await page.locator('[data-testid="login-submit-button"], button[type="submit"]').first().click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });

	console.log(`✅ Authenticated user: ${email}`);
}

export default globalSetup;
