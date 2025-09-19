import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// Run tests in parallel on CI
	workers: process.env.CI ? 2 : undefined,

	// Fail build on CI if tests are flaky
	retries: process.env.CI ? 2 : 0,

	// Directory for test artifacts
	outputDir: 'test-results/',

	// Test directories
	testDir: './tests',

	// Global test timeout
	timeout: 30 * 1000,

	// Expect timeout
	expect: {
		timeout: 5000
	},

	// Use development server for faster feedback during development
	webServer: [
		{
			command: 'npm run dev',
			port: 5175,
			reuseExistingServer: !process.env.CI,
			timeout: 120 * 1000
		}
		// Uncomment if we need to test against PostGraphile separately
		// {
		//   command: 'npm run backend:dev',
		//   port: 4000,
		//   reuseExistingServer: !process.env.CI,
		//   timeout: 60 * 1000,
		// }
	],

	use: {
		// Base URL for tests
		baseURL: 'http://localhost:5175',

		// Collect trace on failure for debugging
		trace: 'retain-on-failure',

		// Take screenshot on failure
		screenshot: 'only-on-failure',

		// Record video on failure
		video: 'retain-on-failure',

		// Navigation timeout
		navigationTimeout: 30 * 1000,

		// Action timeout
		actionTimeout: 10 * 1000
	},

	// Configure projects for major browsers
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},

		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},

		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}

		// Mobile testing (uncomment if needed)
		// {
		//   name: 'Mobile Chrome',
		//   use: { ...devices['Pixel 5'] },
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },
	],

	// Reporter configuration
	reporter: [
		['html', { outputFolder: 'playwright-report' }],
		['line'],
		['json', { outputFile: 'test-results/results.json' }]
	]
});
