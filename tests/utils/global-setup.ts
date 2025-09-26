// Global Test Setup for Playwright
// Database initialization and test environment preparation
// Created: 2025-09-24

import { chromium, FullConfig } from '@playwright/test';
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

		// Setup browser for authentication state
		const browser = await chromium.launch();
		const context = await browser.newContext();
		const page = await context.newPage();

		// Pre-authenticate test users and store auth states
		const users = testContext.users;

		// Admin authentication
		await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174');
		await authenticateUser(page, users.admin.email, 'admin123');
		await page.context().storageState({ path: 'tests/.auth/admin-auth.json' });

		// HR Manager authentication
		await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174');
		await authenticateUser(page, users.hrManager.email, 'admin123');
		await page.context().storageState({ path: 'tests/.auth/hr-manager-auth.json' });

		// Manager authentication
		await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174');
		await authenticateUser(page, users.manager.email, 'admin123');
		await page.context().storageState({ path: 'tests/.auth/manager-auth.json' });

		// Employee authentication
		await page.goto(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5174');
		await authenticateUser(page, users.employee.email, 'admin123');
		await page.context().storageState({ path: 'tests/.auth/employee-auth.json' });

		await browser.close();
		console.log('✅ Authentication states created');

		console.log('🎉 Global test setup completed successfully');
	} catch (error) {
		console.error('❌ Global test setup failed:', error);
		process.exit(1);
	}
}

async function authenticateUser(page: any, email: string, password: string) {
	try {
		// Navigate to login page
		await page.goto('/auth/login');

		// Fill in credentials
		await page.fill('[data-testid="email-input"]', email);
		await page.fill('[data-testid="password-input"]', password);

		// Submit login form
		await page.click('[data-testid="login-submit"]');

		// Wait for successful login
		await page.waitForURL(/\/dashboard/, { timeout: 10000 });

		console.log(`✅ Authenticated user: ${email}`);
	} catch (error) {
		console.warn(`⚠️  Failed to authenticate ${email}:`, error);
		// Continue with setup even if authentication fails
	}
}

export default globalSetup;
