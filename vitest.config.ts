// Comprehensive Vitest Configuration for SvelteHR
// Enhanced testing with browser environment and Svelte component testing
// Created: 2025-09-24

import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [sveltekit()],

	test: {
		// Global test settings
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./tests/setup/vitest-setup.ts'],

		// Test execution settings
		pool: 'threads',
		poolOptions: {
			threads: {
				singleThread: false,
				useAtomics: true
			}
		},

		// Timeout configuration
		testTimeout: process.env.CI ? 30000 : 10000,
		hookTimeout: process.env.CI ? 30000 : 10000,
		teardownTimeout: process.env.CI ? 30000 : 10000,

		// Performance optimization
		isolate: true,
		passWithNoTests: true,
		allowOnly: !process.env.CI,

		// Reporter configuration
		reporter: ['verbose', 'json', 'html', ...(process.env.CI ? ['github-actions'] : [])],

		// Output configuration
		outputFile: {
			json: './test-results/vitest-results.json',
			html: './test-results/vitest-report.html'
		},

		// Coverage configuration
		coverage: {
			enabled: true,
			provider: 'v8',
			reporter: ['text', 'html', 'lcov', 'json'],
			reportsDirectory: './coverage',
			exclude: [
				'node_modules/**',
				'dist/**',
				'.svelte-kit/**',
				'src/app.html',
				'src/service-worker.ts',
				'tests/**',
				'playwright.config.ts',
				'vitest.config.ts',
				'svelte.config.js',
				'vite.config.ts',
				'tailwind.config.js',
				'postcss.config.js',
				'**/*.d.ts',
				'**/*.config.*',
				'**/mock/**',
				'**/fixtures/**',
				'**/.svelte-kit/**'
			],
			include: ['src/lib/**/*.{ts,js,svelte}', 'src/routes/**/*.{ts,js,svelte}', 'src/app.d.ts'],
			all: true,
			lines: 80,
			functions: 80,
			branches: 70,
			statements: 80
		},

		// Multiple test projects for different environments
		projects: [
			// Server-side unit tests (Node.js environment)
			{
				name: 'unit-server',
				extends: './vitest.config.ts',
				test: {
					name: 'unit-server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/unit/**/*.{test,spec}.{js,ts}'],
					exclude: [
						'src/**/*.svelte.{test,spec}.{js,ts}',
						'tests/unit/**/*.svelte.{test,spec}.{js,ts}',
						'src/lib/server/**/*.svelte.{test,spec}.{js,ts}',
						'tests/unit/components/**/*.{test,spec}.{js,ts}', // Component tests run in unit-client
						'tests/unit/routes/**/*.{test,spec}.{js,ts}', // Route/page tests (Svelte components)
						'tests/unit/dashboard-component-syntax.test.ts', // Component test, needs browser
						'tests/unit/encryption.spec.ts', // Web Crypto API (browser only)
						'tests/unit/documentValidation.spec.ts', // File/Blob APIs (browser only)
						'src/**/__tests__/**/*.{test,spec}.{js,ts}', // Component co-located tests (Playwright)
						'tests/integration/**',
						'tests/contract/**',
						'tests/e2e/**'
					],
					setupFiles: ['./tests/setup/vitest-setup-server.ts']
				}
			},

			// Client-side component tests (Browser environment)
			{
				name: 'unit-client',
				extends: './vitest.config.ts',
				resolve: {
					conditions: ['browser']
				},
				test: {
					name: 'unit-client',
					environment: 'jsdom',
					include: [
						'tests/unit/components/**/*.{test,spec}.{js,ts}',
						'tests/unit/routes/**/*.{test,spec}.{js,ts}',
						'src/lib/components/**/*.{test,spec}.{js,ts}'
					],
					exclude: [
						'src/lib/server/**',
						'tests/integration/**',
						'tests/contract/**',
						'tests/e2e/**'
					],
					setupFiles: ['./tests/setup/vitest-setup-client.ts', '@testing-library/jest-dom/vitest']
				}
			},

			// Browser-based component testing with Playwright
			{
				name: 'component-browser',
				extends: './vitest.config.ts',
				test: {
					name: 'component-browser',
					browser: {
						enabled: true,
						provider: 'playwright',
						name: 'chromium',
						headless: true,
						api: {
							port: 63315,
							host: 'localhost'
						},
						instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }]
					},
					include: [
						'tests/e2e/**/*.browser.{test,spec}.{js,ts}',
						'src/lib/components/**/*.browser.{test,spec}.{js,ts}'
					],
					setupFiles: ['./tests/setup/vitest-browser-setup.ts']
				}
			},

			// Integration tests (Node.js environment with database)
			{
				name: 'integration',
				extends: './vitest.config.ts',
				test: {
					name: 'integration',
					environment: 'node',
					include: ['tests/integration/**/*.{test,spec}.{js,ts}'],
					exclude: ['tests/unit/**', 'tests/contract/**', 'tests/e2e/**'],
					setupFiles: ['./tests/setup/vitest-setup-integration.ts'],
					testTimeout: 60000,
					hookTimeout: 30000,
					pool: 'forks', // Use separate processes for isolation
					poolOptions: {
						forks: {
							singleFork: false
						}
					}
				}
			},

			// Contract tests (Schema validation)
			{
				name: 'contract',
				extends: './vitest.config.ts',
				test: {
					name: 'contract',
					environment: 'node',
					include: ['tests/contract/**/*.{test,spec}.{js,ts}'],
					exclude: ['tests/unit/**', 'tests/integration/**', 'tests/e2e/**'],
					setupFiles: ['./tests/setup/vitest-setup-contract.ts']
				}
			},

			// Performance tests
			{
				name: 'performance',
				extends: './vitest.config.ts',
				test: {
					name: 'performance',
					environment: 'node',
					include: ['tests/performance/**/*.{test,spec}.{js,ts}'],
					setupFiles: ['./tests/setup/vitest-setup-performance.ts'],
					testTimeout: 120000, // Longer timeout for performance tests
					reporterOptions: {
						verbose: true
					}
				}
			},

			// GraphQL testing suite
			{
				name: 'graphql',
				extends: './vitest.config.ts',
				test: {
					name: 'graphql',
					environment: 'node',
					include: [
						'tests/unit/graphql/**/*.{test,spec}.{js,ts}',
						'tests/integration/graphql/**/*.{test,spec}.{js,ts}',
						'src/lib/graphql/**/*.{test,spec}.{js,ts}'
					],
					exclude: ['tests/unit/components/**', 'tests/e2e/**'],
					setupFiles: ['./tests/setup/vitest-setup-graphql.ts'],
					testTimeout: 60000, // GraphQL tests may need more time
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						GRAPHQL_ENDPOINT: 'http://localhost:4000/graphql',
						GRAPHQL_WS_ENDPOINT: 'ws://localhost:4000/graphql',
						TEST_DATABASE_URL:
							process.env.TEST_DATABASE_URL ||
							'postgresql://test:test@localhost:5432/sveltehr_test',
						JWT_SECRET: 'test-jwt-secret-key-for-graphql-testing',
						// Performance monitoring
						GRAPHQL_ENABLE_PERFORMANCE_MONITORING: 'true',
						GRAPHQL_PERFORMANCE_THRESHOLD_WARNING: '200',
						GRAPHQL_PERFORMANCE_THRESHOLD_CRITICAL: '500',
						// Complexity analysis
						GRAPHQL_COMPLEXITY_ANALYSIS_ENABLED: 'true',
						GRAPHQL_MAX_QUERY_COMPLEXITY: '1000',
						GRAPHQL_MAX_QUERY_DEPTH: '15',
						// Authorization testing
						GRAPHQL_AUTH_TESTING_ENABLED: 'true',
						// Subscription testing
						GRAPHQL_SUBSCRIPTION_TESTING_ENABLED: 'true',
						GRAPHQL_SUBSCRIPTION_TIMEOUT: '30000'
					}
				}
			},

			// GraphQL schema validation and contract testing
			{
				name: 'graphql-schema',
				extends: './vitest.config.ts',
				test: {
					name: 'graphql-schema',
					environment: 'node',
					include: [
						'tests/contract/graphql-schema-validation.test.ts',
						'tests/contract/test_graphql_schema.spec.ts'
					],
					exclude: [
						'tests/unit/**',
						'tests/integration/**',
						'tests/e2e/**',
						'tests/performance/**'
					],
					setupFiles: ['./tests/setup/vitest-setup-graphql-schema.ts'],
					testTimeout: 45000, // Schema introspection can be slow
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						GRAPHQL_ENDPOINT: 'http://localhost:4000/graphql',
						// Schema validation settings
						GRAPHQL_SCHEMA_VALIDATION_ENABLED: 'true',
						GRAPHQL_INTROSPECTION_ENABLED: 'true',
						GRAPHQL_SCHEMA_CACHE_ENABLED: 'false', // Disable caching for tests
						// Contract testing settings
						GRAPHQL_CONTRACT_TESTING_ENABLED: 'true',
						GRAPHQL_BREAKING_CHANGE_THRESHOLD: '0.1',
						GRAPHQL_DEPRECATION_TRACKING_ENABLED: 'true'
					}
				}
			},

			// GraphQL performance and load testing
			{
				name: 'graphql-performance',
				extends: './vitest.config.ts',
				test: {
					name: 'graphql-performance',
					environment: 'node',
					include: ['tests/performance/**/*graphql*.{test,spec}.{js,ts}'],
					exclude: ['tests/unit/components/**', 'tests/contract/**', 'tests/e2e/**'],
					setupFiles: ['./tests/setup/vitest-setup-graphql-performance.ts'],
					testTimeout: 180000, // 3 minutes for performance tests
					pool: 'forks', // Use separate processes for isolation
					poolOptions: {
						forks: {
							singleFork: false,
							isolate: true
						}
					},
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						GRAPHQL_ENDPOINT: 'http://localhost:4000/graphql',
						// Performance test configuration
						GRAPHQL_PERFORMANCE_TESTING_ENABLED: 'true',
						GRAPHQL_PERFORMANCE_SAMPLE_RATE: '1.0',
						GRAPHQL_PERFORMANCE_RETENTION_DAYS: '1',
						GRAPHQL_PERFORMANCE_ALERT_THRESHOLD: '500',
						// Load testing configuration
						GRAPHQL_LOAD_TEST_ENABLED: 'true',
						GRAPHQL_LOAD_TEST_CONCURRENT_REQUESTS: '10',
						GRAPHQL_LOAD_TEST_DURATION: '30000',
						GRAPHQL_LOAD_TEST_RAMP_UP_TIME: '5000',
						// N+1 detection
						GRAPHQL_N_PLUS_ONE_DETECTION_ENABLED: 'true',
						GRAPHQL_N_PLUS_ONE_THRESHOLD: '10',
						// Memory monitoring
						GRAPHQL_MEMORY_MONITORING_ENABLED: 'true'
					},
					reporterOptions: {
						verbose: true,
						outputFile: './test-results/graphql-performance-results.json'
					}
				}
			},

			// GraphQL subscription testing
			{
				name: 'graphql-subscriptions',
				extends: './vitest.config.ts',
				test: {
					name: 'graphql-subscriptions',
					environment: 'node',
					include: [
						'tests/unit/graphql/**/*subscription*.{test,spec}.{js,ts}',
						'tests/integration/graphql/subscriptions/**/*.{test,spec}.{js,ts}'
					],
					exclude: [
						'tests/unit/components/**',
						'tests/contract/**',
						'tests/e2e/**',
						'tests/performance/**'
					],
					setupFiles: ['./tests/setup/vitest-setup-graphql-subscriptions.ts'],
					testTimeout: 90000, // Subscription tests need more time
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						GRAPHQL_ENDPOINT: 'http://localhost:4000/graphql',
						GRAPHQL_WS_ENDPOINT: 'ws://localhost:4000/graphql',
						// Subscription testing configuration
						GRAPHQL_SUBSCRIPTION_TESTING_ENABLED: 'true',
						GRAPHQL_SUBSCRIPTION_MAX_WAIT_TIME: '30000',
						GRAPHQL_SUBSCRIPTION_HEARTBEAT_INTERVAL: '5000',
						GRAPHQL_SUBSCRIPTION_RECONNECT_ATTEMPTS: '3',
						GRAPHQL_SUBSCRIPTION_DEBUG_MODE: 'true',
						// WebSocket configuration
						GRAPHQL_WS_CONNECTION_TIMEOUT: '10000',
						GRAPHQL_WS_KEEP_ALIVE_INTERVAL: '15000',
						GRAPHQL_WS_MAX_RECONNECT_ATTEMPTS: '5',
						// Real-time testing
						GRAPHQL_REALTIME_TESTING_ENABLED: 'true',
						GRAPHQL_MESSAGE_ORDERING_VALIDATION: 'true'
					}
				}
			},

			// E2E Puppeteer Tests (better Arch Linux support than Playwright)
			{
				name: 'e2e-puppeteer',
				test: {
					name: 'e2e-puppeteer',
					globals: true,
					environment: 'node',
					include: ['tests/e2e/**/*.puppeteer.{test,spec}.{js,ts}'],
					exclude: [
						'tests/e2e/**/*.stagehand.spec.ts',
						'tests/e2e/**/*.browser.{test,spec}.{js,ts}',
						'tests/unit/**',
						'tests/integration/**',
						'tests/contract/**'
					],
					setupFiles: ['./tests/setup/vitest-setup-e2e-puppeteer.ts'],
					testTimeout: 60000,
					hookTimeout: 30000,
					// Disable coverage for E2E tests
					coverage: {
						enabled: false
					},
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
						BROWSER_HEADLESS: process.env.HEADED ? 'false' : 'true'
					}
				}
			},

			// E2E Playwright Tests (main E2E test suite)
			{
				name: 'e2e-playwright',
				test: {
					name: 'e2e-playwright',
					globals: true,
					environment: 'node',
					include: ['tests/e2e/**/*.spec.ts'],
					exclude: [
						'tests/e2e/**/*.puppeteer.{test,spec}.{js,ts}',
						'tests/e2e/**/*.stagehand.spec.ts',
						'tests/e2e/**/*.browser.{test,spec}.{js,ts}',
						'tests/unit/**',
						'tests/integration/**',
						'tests/contract/**'
					],
					setupFiles: ['./tests/setup/vitest-setup-e2e-playwright.ts'],
					testTimeout: 60000,
					hookTimeout: 30000,
					coverage: {
						enabled: false
					},
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						BASE_URL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
						BROWSER_HEADLESS: process.env.HEADED ? 'false' : 'true'
					}
				}
			},

			// Security Tests
			{
				name: 'security',
				extends: './vitest.config.ts',
				test: {
					name: 'security',
					environment: 'node',
					include: ['tests/security/**/*.{test,spec}.{js,ts}'],
					exclude: ['tests/unit/**', 'tests/integration/**', 'tests/contract/**', 'tests/e2e/**'],
					setupFiles: ['./tests/setup/vitest-setup-security.ts'],
					testTimeout: 30000,
					hookTimeout: 15000,
					coverage: {
						enabled: false
					},
					env: {
						NODE_ENV: 'test',
						VITEST: 'true',
						BASE_URL: process.env.BASE_URL || 'http://localhost:5173'
					}
				}
			}
		],

		// Watch mode configuration
		watch: {
			exclude: [
				'node_modules/**',
				'dist/**',
				'.svelte-kit/**',
				'coverage/**',
				'test-results/**',
				'playwright-report/**'
			]
		},

		// Benchmark configuration
		benchmark: {
			outputFile: './test-results/benchmark.json',
			reporters: ['verbose', 'json']
		},

		// Mock configuration
		clearMocks: true,
		restoreMocks: true,
		mockReset: false,

		// Environment variables for tests
		env: {
			NODE_ENV: 'test',
			VITEST: 'true',
			// Test-specific environment variables
			TEST_DATABASE_URL:
				process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/sveltehr_test',
			JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
			API_BASE_URL: 'http://localhost:4000',
			GRAPHQL_ENDPOINT: 'http://localhost:4000/graphql'
		}
	},

	// Resolve configuration
	resolve: {
		alias: {
			$app: resolve('./src/app'),
			$lib: resolve('./src/lib'),
			$components: resolve('./src/lib/components'),
			$services: resolve('./src/lib/services'),
			$utils: resolve('./src/lib/utils'),
			$stores: resolve('./src/lib/stores'),
			$types: resolve('./src/lib/types'),
			$graphql: resolve('./src/lib/graphql'),
			$tests: resolve('./tests'),
			$routes: resolve('./src/routes')
		}
	},

	// Build configuration for tests
	build: {
		target: 'node18'
	},

	// Optimize dependencies for faster test execution
	optimizeDeps: {
		include: [
			'@testing-library/svelte',
			'@testing-library/jest-dom',
			'@testing-library/user-event',
			'vitest-browser-svelte',
			'jsdom',
			'happy-dom'
		],
		exclude: ['@sveltejs/kit']
	},

	// Server configuration for test environment
	server: {
		fs: {
			allow: ['..']
		}
	},

	// Define globals for better IDE support
	define: {
		'import.meta.vitest': 'undefined'
	}
});
