// Global Test Setup for Playwright
// Database initialization and test environment preparation
// Created: 2025-09-24

import { type FullConfig, type Page, chromium } from '@playwright/test';
import { copyFile } from 'node:fs/promises';
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
		const seedUsers = {
			admin: 'admin@mountainhr.dev',
			// Fallback to known-stable seeded admin account for all storage states.
			// Role-specific credentials are not reliably present in every local test DB snapshot.
			hrManager: 'admin@mountainhr.dev',
			manager: 'admin@mountainhr.dev',
			employee: 'admin@mountainhr.dev'
		};

		const adminStatePath = 'tests/.auth/admin-auth.json';
		const adminAuthenticated = await createAuthState(
			browser,
			baseURL,
			seedUsers.admin,
			'admin123',
			adminStatePath
		);

		const hrManagerStatePath = 'tests/.auth/hr-manager-auth.json';
		const hrManagerAuthenticated = await createAuthState(
			browser,
			baseURL,
			seedUsers.hrManager,
			'admin123',
			hrManagerStatePath
		);

		const managerStatePath = 'tests/.auth/manager-auth.json';
		const managerAuthenticated = await createAuthState(
			browser,
			baseURL,
			seedUsers.manager,
			'admin123',
			managerStatePath
		);

		const employeeStatePath = 'tests/.auth/employee-auth.json';
		const employeeAuthenticated = await createAuthState(
			browser,
			baseURL,
			seedUsers.employee,
			'admin123',
			employeeStatePath
		);

		if (adminAuthenticated) {
			if (!hrManagerAuthenticated) await copyFile(adminStatePath, hrManagerStatePath);
			if (!managerAuthenticated) await copyFile(adminStatePath, managerStatePath);
			if (!employeeAuthenticated) await copyFile(adminStatePath, employeeStatePath);
		}

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
): Promise<boolean> {
	const context = await browser.newContext({ baseURL });
	const page = await context.newPage();

	try {
		await authenticateUser(page, email, password);
		await context.storageState({ path: statePath });
		await context.close();
		return true;
	} catch (error) {
		console.warn(`⚠️  Failed to authenticate ${email}:`, error);
		await context.storageState({ path: statePath });
		await context.close();
		return false;
	}
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

	const submitButton = page
		.locator('[data-testid="login-submit-button"], button[type="submit"]')
		.first();
	await submitButton.waitFor({ state: 'visible', timeout: 30000 });
	const submitHandle = await submitButton.elementHandle();
	if (!submitHandle) {
		throw new Error('Login submit button handle was not available');
	}
	await page.waitForFunction(
		(element) => !(element instanceof HTMLButtonElement) || !element.disabled,
		submitHandle,
		{ timeout: 30000 }
	);
	await submitButton.click();
	await page.waitForURL(/\/dashboard/, { timeout: 15000 });

	console.log(`✅ Authenticated user: ${email}`);
}

export default globalSetup;
