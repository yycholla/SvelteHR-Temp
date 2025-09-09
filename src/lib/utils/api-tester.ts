import { ApiServices } from '$lib/api/services';
import { errorHandler } from './error-handler';

/**
 * API Testing Utility
 * Tests all endpoints and validates schemas
 */

interface TestResult {
	endpoint: string;
	success: boolean;
	error?: string;
	responseTime?: number;
	statusCode?: number;
	data?: any;
}

interface TestSuite {
	name: string;
	results: TestResult[];
	totalTests: number;
	passedTests: number;
	failedTests: number;
	totalTime: number;
}

class ApiTester {
	private results: TestSuite[] = [];

	/**
	 * Test all employee endpoints
	 */
	async testEmployeeEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Employee API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test employee list
		suite.results.push(
			await this.testEndpoint('GET /employees', () => ApiServices.employees.list())
		);

		// Test employee list with filters
		suite.results.push(
			await this.testEndpoint('GET /employees?search=admin', () =>
				ApiServices.employees.list({ search: 'admin' })
			)
		);

		// Test single employee (if any exist)
		try {
			const employees = await ApiServices.employees.list({ pageSize: 1 });
			if (employees.employees.length > 0) {
				const employeeId = employees.employees[0].id;
				suite.results.push(
					await this.testEndpoint(`GET /employees/${employeeId}`, () =>
						ApiServices.employees.getById(employeeId)
					)
				);
			}
		} catch (error) {
			console.warn('Could not test single employee endpoint:', error);
		}

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test all department endpoints
	 */
	async testDepartmentEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Department API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test department list
		suite.results.push(
			await this.testEndpoint('GET /departments', () => ApiServices.departments.list())
		);

		// Test single department (if any exist)
		try {
			const departments = await ApiServices.departments.list();
			if (departments.length > 0) {
				const departmentId = departments[0].id;
				suite.results.push(
					await this.testEndpoint(`GET /departments/${departmentId}`, () =>
						ApiServices.departments.getById(departmentId)
					)
				);
			}
		} catch (error) {
			console.warn('Could not test single department endpoint:', error);
		}

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test all role endpoints
	 */
	async testRoleEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Role API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test role list
		suite.results.push(await this.testEndpoint('GET /roles', () => ApiServices.roles.list()));

		// Test single role (if any exist)
		try {
			const roles = await ApiServices.roles.list();
			if (roles.length > 0) {
				const roleId = roles[0].id;
				suite.results.push(
					await this.testEndpoint(`GET /roles/${roleId}`, () => ApiServices.roles.getById(roleId))
				);

				suite.results.push(
					await this.testEndpoint(`GET /roles/${roleId}/permissions`, () =>
						ApiServices.roles.getPermissions(roleId)
					)
				);
			}
		} catch (error) {
			console.warn('Could not test single role endpoint:', error);
		}

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test all task endpoints
	 */
	async testTaskEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Task API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test task list
		suite.results.push(await this.testEndpoint('GET /tasks', () => ApiServices.tasks.list()));

		// Test task list with filters
		suite.results.push(
			await this.testEndpoint('GET /tasks?status=Pending', () =>
				ApiServices.tasks.list({ status: 'Pending' })
			)
		);

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test all notification endpoints
	 */
	async testNotificationEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Notification API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test notification list
		suite.results.push(
			await this.testEndpoint('GET /notifications', () => ApiServices.notifications.list())
		);

		// Test unread count
		suite.results.push(
			await this.testEndpoint('GET /notifications/unread-count', () =>
				ApiServices.notifications.getUnreadCount()
			)
		);

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test all compliance endpoints
	 */
	async testComplianceEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Compliance API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test compliance list
		suite.results.push(
			await this.testEndpoint('GET /compliance', () => ApiServices.compliance.list())
		);

		// Test compliance stats
		suite.results.push(
			await this.testEndpoint('GET /compliance/stats', () => ApiServices.compliance.getStats())
		);

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test all leave endpoints
	 */
	async testLeaveEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Leave API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test leave balances
		suite.results.push(
			await this.testEndpoint('GET /leave/balances', () => ApiServices.leave.listBalances())
		);

		// Test leave requests
		suite.results.push(
			await this.testEndpoint('GET /leave/requests', () => ApiServices.leave.listRequests())
		);

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test monitoring endpoints
	 */
	async testMonitoringEndpoints(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Monitoring API',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test health check
		suite.results.push(
			await this.testEndpoint('GET /monitoring/health', () => ApiServices.monitoring.getHealth())
		);

		// Test metrics
		suite.results.push(
			await this.testEndpoint('GET /monitoring/metrics', () => ApiServices.monitoring.getMetrics())
		);

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Test a single endpoint
	 */
	private async testEndpoint(name: string, testFunction: () => Promise<any>): Promise<TestResult> {
		const startTime = performance.now();

		try {
			const data = await testFunction();
			const endTime = performance.now();

			return {
				endpoint: name,
				success: true,
				responseTime: endTime - startTime,
				statusCode: 200,
				data: data
			};
		} catch (error: any) {
			const endTime = performance.now();

			return {
				endpoint: name,
				success: false,
				error: error.message || 'Unknown error',
				responseTime: endTime - startTime,
				statusCode: error.response?.status || 0
			};
		}
	}

	/**
	 * Calculate statistics for a test suite
	 */
	private calculateSuiteStats(suite: TestSuite): void {
		suite.totalTests = suite.results.length;
		suite.passedTests = suite.results.filter((r) => r.success).length;
		suite.failedTests = suite.results.filter((r) => !r.success).length;
		suite.totalTime = suite.results.reduce((sum, r) => sum + (r.responseTime || 0), 0);
	}

	/**
	 * Run all API tests
	 */
	async runAllTests(): Promise<TestSuite[]> {
		console.log('🧪 Starting comprehensive API tests...');

		this.results = [];

		// Run all test suites
		const suites = [
			this.testEmployeeEndpoints(),
			this.testDepartmentEndpoints(),
			this.testRoleEndpoints(),
			this.testTaskEndpoints(),
			this.testNotificationEndpoints(),
			this.testComplianceEndpoints(),
			this.testLeaveEndpoints(),
			this.testMonitoringEndpoints()
		];

		try {
			this.results = await Promise.all(suites);
		} catch (error) {
			console.error('Error running test suites:', error);
		}

		this.printResults();
		return this.results;
	}

	/**
	 * Run basic connectivity test
	 */
	async runConnectivityTest(): Promise<boolean> {
		console.log('🔌 Testing API connectivity...');

		try {
			await ApiServices.monitoring.getHealth();
			console.log('✅ API connectivity test passed');
			return true;
		} catch (error) {
			console.error('❌ API connectivity test failed:', error);
			return false;
		}
	}

	/**
	 * Test schema validation
	 */
	async testSchemaValidation(): Promise<TestSuite> {
		const suite: TestSuite = {
			name: 'Schema Validation',
			results: [],
			totalTests: 0,
			passedTests: 0,
			failedTests: 0,
			totalTime: 0
		};

		// Test employee schema
		suite.results.push(
			await this.testEndpoint('Employee Schema Validation', async () => {
				const employees = await ApiServices.employees.list({ pageSize: 1 });
				if (employees.employees.length > 0) {
					const employee = employees.employees[0];
					// Check required fields
					if (!employee.id || !employee.firstName || !employee.lastName) {
						throw new Error('Missing required employee fields');
					}
				}
				return { validated: true };
			})
		);

		// Test department schema
		suite.results.push(
			await this.testEndpoint('Department Schema Validation', async () => {
				const departments = await ApiServices.departments.list();
				if (departments.length > 0) {
					const department = departments[0];
					if (!department.id || !department.name) {
						throw new Error('Missing required department fields');
					}
				}
				return { validated: true };
			})
		);

		this.calculateSuiteStats(suite);
		return suite;
	}

	/**
	 * Print test results to console
	 */
	private printResults(): void {
		console.log('\n📊 API Test Results Summary');
		console.log('='.repeat(50));

		let totalTests = 0;
		let totalPassed = 0;
		let totalFailed = 0;
		let totalTime = 0;

		this.results.forEach((suite) => {
			totalTests += suite.totalTests;
			totalPassed += suite.passedTests;
			totalFailed += suite.failedTests;
			totalTime += suite.totalTime;

			const successRate =
				suite.totalTests > 0 ? ((suite.passedTests / suite.totalTests) * 100).toFixed(1) : '0.0';
			const avgTime =
				suite.totalTests > 0 ? (suite.totalTime / suite.totalTests).toFixed(2) : '0.00';

			console.log(`\n${suite.name}:`);
			console.log(`  ✅ Passed: ${suite.passedTests}/${suite.totalTests} (${successRate}%)`);
			console.log(`  ❌ Failed: ${suite.failedTests}`);
			console.log(`  ⏱️  Avg Response Time: ${avgTime}ms`);

			// Show failed tests
			const failedTests = suite.results.filter((r) => !r.success);
			if (failedTests.length > 0) {
				console.log('  Failed Tests:');
				failedTests.forEach((test) => {
					console.log(`    - ${test.endpoint}: ${test.error}`);
				});
			}
		});

		const overallSuccess = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0.0';

		console.log('\n' + '='.repeat(50));
		console.log(`Overall Results:`);
		console.log(`  📊 Total Tests: ${totalTests}`);
		console.log(`  ✅ Passed: ${totalPassed} (${overallSuccess}%)`);
		console.log(`  ❌ Failed: ${totalFailed}`);
		console.log(`  ⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
		console.log(
			`  🔄 API Status: ${totalFailed === 0 ? 'All systems operational' : 'Some issues detected'}`
		);
	}

	/**
	 * Get test summary for UI display
	 */
	getTestSummary() {
		const totalTests = this.results.reduce((sum, suite) => sum + suite.totalTests, 0);
		const totalPassed = this.results.reduce((sum, suite) => sum + suite.passedTests, 0);
		const totalFailed = this.results.reduce((sum, suite) => sum + suite.failedTests, 0);
		const totalTime = this.results.reduce((sum, suite) => sum + suite.totalTime, 0);

		return {
			suites: this.results,
			totalTests,
			totalPassed,
			totalFailed,
			successRate: totalTests > 0 ? (totalPassed / totalTests) * 100 : 0,
			totalTime,
			status: totalFailed === 0 ? 'healthy' : 'degraded'
		};
	}
}

// Export singleton instance
export const apiTester = new ApiTester();

// Utility functions
export const TestUtils = {
	/**
	 * Quick health check
	 */
	async quickHealthCheck(): Promise<boolean> {
		return apiTester.runConnectivityTest();
	},

	/**
	 * Run full test suite
	 */
	async runFullTests(): Promise<any> {
		const results = await apiTester.runAllTests();
		return apiTester.getTestSummary();
	},

	/**
	 * Test specific endpoint
	 */
	async testEndpoint(name: string, testFn: () => Promise<any>): Promise<boolean> {
		try {
			await testFn();
			console.log(`✅ ${name} test passed`);
			return true;
		} catch (error) {
			console.error(`❌ ${name} test failed:`, error);
			return false;
		}
	}
};
