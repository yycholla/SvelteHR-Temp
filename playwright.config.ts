import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	// Enhanced parallel execution based on environment
	workers: process.env.CI
		? 4
		: (() => {
				if (!process.env.PLAYWRIGHT_WORKERS) return 2;
				const parsed = parseInt(process.env.PLAYWRIGHT_WORKERS, 10);
				return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
			})(),

	// Improved retry strategy for reliability
	retries: process.env.CI
		? 3
		: (() => {
				if (!process.env.PLAYWRIGHT_RETRIES) return 1;
				const parsed = parseInt(process.env.PLAYWRIGHT_RETRIES, 10);
				return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
			})(),

	// Directory for test artifacts
	outputDir: 'test-results/',

	// Test directories with granular control
	testDir: './tests',
	testMatch: ['**/e2e/**/*.spec.ts', '**/e2e/**/*.spec.js'],
	testIgnore: [
		'**/contract/**/*',
		'**/integration/**/*',
		'**/unit/**/*',
		'**/*.puppeteer.test.ts',
		'**/*.browser.test.ts',
		'**/*.test.ts'
	],

	// Performance-optimized timeouts
	timeout: process.env.CI ? 60 * 1000 : 30 * 1000,

	// Global setup and teardown
	globalSetup: './tests/utils/global-setup.ts',
	globalTeardown: './tests/utils/global-teardown.ts',

	// Expect timeout with performance considerations
	expect: {
		timeout: process.env.CI ? 10 * 1000 : 5 * 1000
	},

	// Enhanced web server configuration
	// NOTE: webServer disabled when using Docker containers
	// Docker services (frontend-dev on 5173, graphql on 4000) should be running via docker-compose
	webServer: process.env.CI
		? [
				{
					command: 'npm run dev',
					port: 5174,
					reuseExistingServer: false,
					timeout: 120 * 1000,
					env: {
						NODE_ENV: 'test',
						DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL
					}
				}
			]
		: undefined,

	use: {
		// Base URL for tests
		// Use port 5173 for local Docker development, 5174 for CI
		baseURL:
			process.env.PLAYWRIGHT_BASE_URL ||
			(process.env.CI ? 'http://localhost:5174' : 'http://localhost:5173'),

		// Enhanced debugging capabilities
		trace: process.env.CI ? 'retain-on-failure' : 'on-first-retry',

		// Screenshot strategy
		screenshot: process.env.CI ? 'only-on-failure' : 'only-on-failure',

		// Video recording for debugging
		video: process.env.CI ? 'retain-on-failure' : 'retain-on-failure',

		// Performance-optimized timeouts
		navigationTimeout: 30 * 1000,
		actionTimeout: 15 * 1000,

		// Browser context options
		ignoreHTTPSErrors: true,
		bypassCSP: true,

		// Performance monitoring
		extraHTTPHeaders: {
			'Accept-Language': 'en-US,en;q=0.9'
		},

		// Viewport consistency
		viewport: { width: 1280, height: 720 },

		// Locale and timezone
		locale: 'en-US',
		timezoneId: 'America/New_York'
	},

	// Comprehensive browser testing matrix
	projects: [
		// Desktop browsers with different configurations
		{
			name: 'chromium-desktop',
			use: {
				...devices['Desktop Chrome'],
				channel: 'chrome'
			}
		},

		{
			name: 'firefox-desktop',
			use: {
				...devices['Desktop Firefox']
			}
		},

		{
			name: 'webkit-desktop',
			use: {
				...devices['Desktop Safari']
			}
		},

		// Performance testing with Chrome DevTools
		{
			name: 'chromium-performance',
			use: {
				...devices['Desktop Chrome'],
				channel: 'chrome',
				launchOptions: {
					args: ['--enable-precise-memory-info', '--enable-performance-timing-profiler']
				}
			},
			testMatch: '**/performance/**/*.spec.ts'
		},

		// Accessibility testing
		{
			name: 'chromium-a11y',
			use: {
				...devices['Desktop Chrome'],
				channel: 'chrome'
			},
			testMatch: '**/accessibility/**/*.spec.ts'
		},

		// Mobile browser testing (conditional based on environment)
		...(process.env.PLAYWRIGHT_MOBILE_TESTS === 'true'
			? [
					{
						name: 'mobile-chrome',
						use: { ...devices['Pixel 5'] },
						testMatch: '**/mobile/**/*.spec.ts'
					},
					{
						name: 'mobile-safari',
						use: { ...devices['iPhone 12'] },
						testMatch: '**/mobile/**/*.spec.ts'
					}
				]
			: []),

		// API testing project
		{
			name: 'api-tests',
			use: {
				baseURL: process.env.API_BASE_URL || 'http://localhost:4000'
			},
			testMatch: '**/api/**/*.spec.ts'
		},

		// Visual regression testing
		{
			name: 'visual-regression',
			use: {
				...devices['Desktop Chrome'],
				channel: 'chrome',
				// Consistent viewport for visual comparisons
				viewport: { width: 1920, height: 1080 },
				// Disable animations for consistent screenshots
				reducedMotion: 'reduce',
				// Force color scheme for consistency
				colorScheme: 'light'
			},
			testMatch: '**/visual/**/*.spec.ts',
			// Visual tests should have specific config
			expect: {
				// Looser timeout for visual comparisons
				timeout: 15 * 1000,
				toHaveScreenshot: {
					// Tolerate minor pixel differences
					maxDiffPixels: 100,
					// Threshold for considering pixels different
					threshold: 0.2,
					// Animation handling
					animations: 'disabled',
					// CSS animations
					caret: 'hide'
				}
			}
		}
	],

	// Enhanced reporting configuration
	reporter: [
		// HTML report with detailed information
		[
			'html',
			{
				outputFolder: 'playwright-report',
				open: process.env.CI ? 'never' : 'on-failure'
			}
		],

		// Console output for development
		['line'],

		// JSON report for CI/CD integration
		[
			'json',
			{
				outputFile: 'test-results/results.json'
			}
		],

		// JUnit XML for test result integration
		[
			'junit',
			{
				outputFile: 'test-results/junit-results.xml'
			}
		],

		// Custom performance reporter (conditional)
		...(process.env.PLAYWRIGHT_PERFORMANCE_REPORT === 'true'
			? [['./tests/reporters/performance-reporter.ts']]
			: [])
	],

	// Test metadata and annotations
	metadata: {
		testEnvironment: process.env.NODE_ENV || 'development',
		buildNumber: process.env.BUILD_NUMBER || 'local',
		commitHash: process.env.COMMIT_HASH || 'unknown'
	},

	// Fullyparallel execution for better performance
	fullyParallel: true,

	// Forbid test.only in CI
	forbidOnly: !!process.env.CI,

	// Maximum failures before stopping test suite
	maxFailures: process.env.CI ? 10 : undefined
});
