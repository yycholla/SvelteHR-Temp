import { describe, it, expect } from 'vitest';

/**
 * Contract test for data loading queries
 * Tests the GraphQL schema for dashboard and employee data
 */

interface DashboardData {
	summary: {
		totalEmployees: number;
		activeEmployees: number;
		departmentCount: number;
		pendingRequests: number;
		avgTenure: string;
	};
	recentActivities: Array<{
		id: string;
		type: string;
		description: string;
		timestamp: string;
		userId: string;
		userName: string;
	}>;
	upcomingEvents: Array<{
		id: string;
		title: string;
		date: string;
		type: string;
		participants: number;
	}>;
	metrics: Array<{
		name: string;
		value: number;
		change: number;
		trend: 'UP' | 'DOWN' | 'STABLE';
	}>;
	lastUpdated: string;
}

interface EmployeeListData {
	employees: Array<{
		id: string;
		firstName: string;
		lastName: string;
		email: string;
		role: string;
		department: {
			id: string;
			name: string;
			code: string;
			managerName?: string;
		};
		status: 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';
		hireDate: string;
		phoneNumber?: string;
		lastActive?: string;
	}>;
	pagination: {
		currentPage: number;
		totalPages: number;
		pageSize: number;
		hasNext: boolean;
		hasPrevious: boolean;
	};
	totalCount: number;
}

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

// Skip these tests in CI (no backend available)
const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip('Data Loading GraphQL Contract', () => {
	it('should load dashboard data with correct schema', async () => {
		// This test will initially fail until the query is implemented
		const query = `
			query GetDashboardData($userId: ID!, $includeAnalytics: Boolean) {
				getDashboardData(userId: $userId, includeAnalytics: $includeAnalytics) {
					success
					data {
						summary {
							totalEmployees
							activeEmployees
							departmentCount
							pendingRequests
							avgTenure
						}
						recentActivities {
							id
							type
							description
							timestamp
							userId
							userName
						}
						upcomingEvents {
							id
							title
							date
							type
							participants
						}
						metrics {
							name
							value
							change
							trend
						}
						lastUpdated
					}
					error {
						code
						message
						details
						timestamp
					}
					retryable
				}
			}
		`;

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query,
				variables: {
					userId: '1',
					includeAnalytics: true
				}
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('data');
		expect(data.data).toHaveProperty('getDashboardData');

		const result = data.data.getDashboardData;

		// Validate response schema
		expect(typeof result.success).toBe('boolean');
		expect(typeof result.retryable).toBe('boolean');

		if (result.success && result.data) {
			const dashboardData: DashboardData = result.data;

			// Validate summary
			expect(dashboardData.summary).toBeDefined();
			expect(typeof dashboardData.summary.totalEmployees).toBe('number');
			expect(typeof dashboardData.summary.activeEmployees).toBe('number');
			expect(typeof dashboardData.summary.departmentCount).toBe('number');
			expect(typeof dashboardData.summary.pendingRequests).toBe('number');
			expect(typeof dashboardData.summary.avgTenure).toBe('string');

			// Validate activities
			expect(Array.isArray(dashboardData.recentActivities)).toBe(true);
			dashboardData.recentActivities.forEach((activity) => {
				expect(typeof activity.id).toBe('string');
				expect(typeof activity.type).toBe('string');
				expect(typeof activity.description).toBe('string');
				expect(typeof activity.timestamp).toBe('string');
				expect(typeof activity.userId).toBe('string');
				expect(typeof activity.userName).toBe('string');
				// Validate timestamp is valid date
				expect(new Date(activity.timestamp).getTime()).toBeGreaterThan(0);
			});

			// Validate metrics
			expect(Array.isArray(dashboardData.metrics)).toBe(true);
			dashboardData.metrics.forEach((metric) => {
				expect(typeof metric.name).toBe('string');
				expect(typeof metric.value).toBe('number');
				expect(typeof metric.change).toBe('number');
				expect(['UP', 'DOWN', 'STABLE']).toContain(metric.trend);
			});

			// Validate lastUpdated
			expect(new Date(dashboardData.lastUpdated).getTime()).toBeGreaterThan(0);
		}

		if (!result.success && result.error) {
			expect(typeof result.error.code).toBe('string');
			expect(typeof result.error.message).toBe('string');
			expect(typeof result.error.timestamp).toBe('string');
		}
	});

	test('should load employee list with pagination', async ({ request }) => {
		// This test will initially fail until the query is implemented
		const query = `
			query GetEmployees($page: Int, $limit: Int, $filter: EmployeeFilter) {
				getEmployees(page: $page, limit: $limit, filter: $filter) {
					success
					data {
						employees {
							id
							firstName
							lastName
							email
							role
							department {
								id
								name
								code
								managerName
							}
							status
							hireDate
							phoneNumber
							lastActive
						}
						pagination {
							currentPage
							totalPages
							pageSize
							hasNext
							hasPrevious
						}
						totalCount
					}
					error {
						code
						message
						timestamp
					}
					retryable
				}
			}
		`;

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query,
				variables: {
					page: 1,
					limit: 20,
					filter: {
						status: 'ACTIVE'
					}
				}
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('data');
		expect(data.data).toHaveProperty('getEmployees');

		const result = data.data.getEmployees;

		if (result.success && result.data) {
			const employeeData: EmployeeListData = result.data;

			// Validate pagination
			expect(employeeData.pagination).toBeDefined();
			expect(typeof employeeData.pagination.currentPage).toBe('number');
			expect(typeof employeeData.pagination.totalPages).toBe('number');
			expect(typeof employeeData.pagination.pageSize).toBe('number');
			expect(typeof employeeData.pagination.hasNext).toBe('boolean');
			expect(typeof employeeData.pagination.hasPrevious).toBe('boolean');
			expect(typeof employeeData.totalCount).toBe('number');

			// Validate employees array
			expect(Array.isArray(employeeData.employees)).toBe(true);
			employeeData.employees.forEach((employee) => {
				expect(typeof employee.id).toBe('string');
				expect(typeof employee.firstName).toBe('string');
				expect(typeof employee.lastName).toBe('string');
				expect(typeof employee.email).toBe('string');
				expect(typeof employee.role).toBe('string');
				expect(['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED']).toContain(employee.status);

				// Validate department
				expect(employee.department).toBeDefined();
				expect(typeof employee.department.id).toBe('string');
				expect(typeof employee.department.name).toBe('string');
				expect(typeof employee.department.code).toBe('string');

				// Validate dates
				expect(new Date(employee.hireDate).getTime()).toBeGreaterThan(0);
				if (employee.lastActive) {
					expect(new Date(employee.lastActive).getTime()).toBeGreaterThan(0);
				}
			});

			// Page size should match actual employee count (or be the last page)
			if (employeeData.pagination.hasNext) {
				expect(employeeData.employees.length).toBe(employeeData.pagination.pageSize);
			} else {
				expect(employeeData.employees.length).toBeLessThanOrEqual(employeeData.pagination.pageSize);
			}
		}
	});

	test('should handle analytics data with empty state', async ({ request }) => {
		// This test verifies the analytics query handles empty data correctly
		const query = `
			query GetDepartmentAnalytics($departmentId: ID, $dateRange: DateRangeInput) {
				getDepartmentAnalytics(departmentId: $departmentId, dateRange: $dateRange) {
					success
					data {
						departmentDistribution {
							department
							count
							percentage
						}
						performanceMetrics {
							category
							avgRating
							count
						}
						leaveStatistics {
							leaveType
							count
							avgDuration
						}
						growthTrends {
							period
							headcount
							growth
						}
						calculatedAt
					}
					error {
						code
						message
						timestamp
					}
					retryable
					emptyReason
				}
			}
		`;

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query,
				variables: {
					dateRange: {
						start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
						end: new Date().toISOString()
					}
				}
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		const result = data.data.getDepartmentAnalytics;

		if (result.success && result.data) {
			// Validate analytics arrays
			expect(Array.isArray(result.data.departmentDistribution)).toBe(true);
			expect(Array.isArray(result.data.performanceMetrics)).toBe(true);
			expect(Array.isArray(result.data.leaveStatistics)).toBe(true);
			expect(Array.isArray(result.data.growthTrends)).toBe(true);

			// Validate department distribution
			result.data.departmentDistribution.forEach((dept: any) => {
				expect(typeof dept.department).toBe('string');
				expect(typeof dept.count).toBe('number');
				expect(typeof dept.percentage).toBe('number');
				expect(dept.count).toBeGreaterThanOrEqual(0);
				expect(dept.percentage).toBeGreaterThanOrEqual(0);
				expect(dept.percentage).toBeLessThanOrEqual(1);
			});

			// Validate performance metrics
			result.data.performanceMetrics.forEach((perf: any) => {
				expect(typeof perf.category).toBe('string');
				expect(typeof perf.avgRating).toBe('number');
				expect(typeof perf.count).toBe('number');
				expect(perf.avgRating).toBeGreaterThanOrEqual(1);
				expect(perf.avgRating).toBeLessThanOrEqual(5);
			});

			expect(new Date(result.data.calculatedAt).getTime()).toBeGreaterThan(0);
		}

		if (!result.success && result.emptyReason) {
			expect(['NO_DATA', 'INSUFFICIENT_DATA', 'FILTER_NO_RESULTS', 'PERMISSION_DENIED']).toContain(
				result.emptyReason
			);
		}
	});

	test('should handle filter validation', async ({ request }) => {
		// Test invalid filters
		const query = `
			query GetEmployees($page: Int, $limit: Int, $filter: EmployeeFilter) {
				getEmployees(page: $page, limit: $limit, filter: $filter) {
					success
					error {
						code
						message
					}
				}
			}
		`;

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query,
				variables: {
					page: -1, // Invalid page
					limit: 1000, // Excessive limit
					filter: {
						status: 'INVALID_STATUS' // Invalid status
					}
				}
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		const data = await response.json();

		// Should return validation error
		if (data.data?.getEmployees) {
			expect(data.data.getEmployees.success).toBe(false);
			expect(data.data.getEmployees.error).toBeDefined();
		} else {
			expect(data.errors).toBeDefined();
		}
	});
});
