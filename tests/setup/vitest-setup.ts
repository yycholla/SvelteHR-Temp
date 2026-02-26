// Global Vitest Setup for SvelteHR
// Base configuration for all test environments
// Created: 2025-09-24

import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// Declare global types for testUtils
declare global {
	namespace NodeJS {
		interface Global {
			testUtils: {
				waitForNextTick(): Promise<void>;
				sleep(ms: number): Promise<void>;
			};
		}
	}
	namespace Vi {
		interface TestUtils {
			waitForNextTick(): Promise<void>;
			sleep(ms: number): Promise<void>;
		}
	}
}

// Global test environment setup
beforeAll(() => {
	// Set consistent timezone for tests
	process.env.TZ = 'UTC';

	// Mock console methods in test environment to reduce noise
	if (process.env.NODE_ENV === 'test') {
		vi.spyOn(console, 'log').mockImplementation(() => {});
		vi.spyOn(console, 'info').mockImplementation(() => {});
		vi.spyOn(console, 'debug').mockImplementation(() => {});

		// Keep warnings and errors for debugging
		const originalWarn = console.warn;
		const originalError = console.error;

		vi.spyOn(console, 'warn').mockImplementation((...args) => {
			if (process.env.VITEST_VERBOSE === 'true') {
				originalWarn(...args);
			}
		});

		vi.spyOn(console, 'error').mockImplementation((...args) => {
			if (process.env.VITEST_VERBOSE === 'true') {
				originalError(...args);
			}
		});
	}
});

// Global test cleanup
afterAll(() => {
	// Restore all mocks
	vi.restoreAllMocks();
});

// Per-test setup
beforeEach(() => {
	// Clear all timers before each test
	vi.clearAllTimers();

	// Reset modules between tests for isolation
	vi.resetModules();
});

// Per-test cleanup
afterEach(() => {
	// Clear all mocks after each test
	vi.clearAllMocks();

	// Reset any fake timers
	vi.useRealTimers();
});

// Add global test utilities
interface CustomGlobalThis {
	testUtils: {
		waitForNextTick(): Promise<void>;
		sleep(ms: number): Promise<void>;
	};
}
(globalThis as unknown as CustomGlobalThis).testUtils = {
	waitForNextTick: () => new Promise((resolve) => process.nextTick(resolve)),
	sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
};

// Performance monitoring for tests
const testPerformance = new Map<string, number>();

beforeEach((context) => {
	if (context && context.task) {
		testPerformance.set(context.task.name, Date.now());
	}
});

afterEach((context) => {
	if (context && context.task) {
		const startTime = testPerformance.get(context.task.name);
		if (startTime) {
			const duration = Date.now() - startTime;
			if (duration > 5000) {
				// Warn for tests taking longer than 5 seconds
				console.warn(`⚠️  Slow test detected: "${context.task.name}" took ${duration}ms`);
			}
			testPerformance.delete(context.task.name);
		}
	}
});

// Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
	console.error('Uncaught Exception:', error);
});

// Export common test constants
export const TEST_CONSTANTS = {
	DEFAULT_TIMEOUT: 10000,
	LONG_TIMEOUT: 30000,
	SHORT_TIMEOUT: 5000,
	DATABASE_URL:
		process.env.TEST_DATABASE_URL ||
		process.env.DATABASE_URL ||
		'postgresql://postgres:postgres123@localhost:5433/hr_system',
	API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:4000',
	JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only',
	GRAPHQL_ENDPOINT: process.env.GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'
} as const;

// Make test helpers available globally
import * as factories from '../helpers/factories';
import * as testContainer from '../helpers/test-container';

declare global {
	var EmployeeFactory: typeof factories.EmployeeFactory;
	var DepartmentFactory: typeof factories.DepartmentFactory;
	var RoleFactory: typeof factories.RoleFactory;
	var createTestContainer: typeof testContainer.createTestContainer;
	var createMockGraphQL: typeof testContainer.createMockGraphQL;
	var createMockAuth: typeof testContainer.createMockAuth;
	var createMockStorage: typeof testContainer.createMockStorage;
}

global.EmployeeFactory = factories.EmployeeFactory;
global.DepartmentFactory = factories.DepartmentFactory;
global.RoleFactory = factories.RoleFactory;
global.createTestContainer = testContainer.createTestContainer;
global.createMockGraphQL = testContainer.createMockGraphQL;
global.createMockAuth = testContainer.createMockAuth;
global.createMockStorage = testContainer.createMockStorage;
