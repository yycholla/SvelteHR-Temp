// Vitest Integration Test Setup
// Database connection and test environment for integration tests
// Created: 2025-09-24

import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';
import { DatabaseTestUtils, cleanupTestData, createTestContext } from '../utils/test-helpers';
import './vitest-setup'; // Import base setup

let testContext: any;

beforeAll(async () => {
	// Setup test database
	await DatabaseTestUtils.setupTestDatabase();

	// Create test context with users, departments, etc.
	testContext = await createTestContext();

	// Store test context globally for tests
	global.testContext = testContext;
}, 30000); // 30 second timeout for setup

afterAll(async () => {
	// Cleanup test data
	if (testContext) {
		await cleanupTestData(testContext);
	}

	// Cleanup test database
	await DatabaseTestUtils.cleanupTestDatabase();
}, 30000); // 30 second timeout for cleanup

beforeEach(() => {
	// Reset any test state before each test
	// Tests should be isolated and not depend on each other
});

afterEach(() => {
	// Cleanup after each test if needed
	// Most cleanup is handled globally in afterAll
});

// Make test context available to integration tests
declare global {
	var testContext: any;
}
