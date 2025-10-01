import { test, expect } from '@playwright/test';

/**
 * Contract test for seed data mutations
 * Tests the GraphQL schema for seed data operations
 */

interface SeedDataStatus {
	isSeeded: boolean;
	entityCounts: {
		users: number;
		departments: number;
		leaveRequests: number;
		performanceReviews: number;
		goals: number;
		total: number;
	};
	lastSeededAt?: string;
	version?: string;
}

interface SeedDataResult {
	success: boolean;
	message: string;
	entitiesCreated: {
		users: number;
		departments: number;
		leaveRequests: number;
		performanceReviews: number;
		goals: number;
		total: number;
	};
	errors?: string[];
}

const GRAPHQL_ENDPOINT = 'http://localhost:4000/graphql';

test.describe('Seed Data GraphQL Contract', () => {
	test('should query seed data status with correct schema', async ({ request }) => {
		// This test will initially fail until the GraphQL schema is implemented
		const query = `
			query SeedDataStatus {
				seedDataStatus {
					isSeeded
					entityCounts {
						users
						departments
						leaveRequests
						performanceReviews
						goals
						total
					}
					lastSeededAt
					version
				}
			}
		`;

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('data');
		expect(data.data).toHaveProperty('seedDataStatus');

		const seedStatus: SeedDataStatus = data.data.seedDataStatus;

		// Validate schema
		expect(typeof seedStatus.isSeeded).toBe('boolean');
		expect(seedStatus).toHaveProperty('entityCounts');
		expect(typeof seedStatus.entityCounts.users).toBe('number');
		expect(typeof seedStatus.entityCounts.departments).toBe('number');
		expect(typeof seedStatus.entityCounts.leaveRequests).toBe('number');
		expect(typeof seedStatus.entityCounts.performanceReviews).toBe('number');
		expect(typeof seedStatus.entityCounts.goals).toBe('number');
		expect(typeof seedStatus.entityCounts.total).toBe('number');

		// Entity counts should be non-negative
		expect(seedStatus.entityCounts.users).toBeGreaterThanOrEqual(0);
		expect(seedStatus.entityCounts.departments).toBeGreaterThanOrEqual(0);
		expect(seedStatus.entityCounts.total).toBeGreaterThanOrEqual(0);

		// Total should be sum of individual counts
		const expectedTotal =
			seedStatus.entityCounts.users +
			seedStatus.entityCounts.departments +
			seedStatus.entityCounts.leaveRequests +
			seedStatus.entityCounts.performanceReviews +
			seedStatus.entityCounts.goals;
		expect(seedStatus.entityCounts.total).toBe(expectedTotal);
	});

	test('should initialize seed data with correct input schema', async ({ request }) => {
		// This test will initially fail until the mutation is implemented
		const mutation = `
			mutation InitializeSeedData($config: SeedDataInput!) {
				initializeSeedData(config: $config) {
					success
					message
					entitiesCreated {
						users
						departments
						leaveRequests
						performanceReviews
						goals
						total
					}
					errors
				}
			}
		`;

		const variables = {
			config: {
				users: { min: 10, max: 15 },
				departments: { min: 5, max: 8 },
				leaveRequests: { min: 10, max: 20 },
				performanceReviews: { min: 10, max: 15 },
				goals: { min: 15, max: 25 },
				generateRelationships: true
			}
		};

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query: mutation,
				variables
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('data');
		expect(data.data).toHaveProperty('initializeSeedData');

		const result: SeedDataResult = data.data.initializeSeedData;

		// Validate response schema
		expect(typeof result.success).toBe('boolean');
		expect(typeof result.message).toBe('string');
		expect(result).toHaveProperty('entitiesCreated');
		expect(typeof result.entitiesCreated.users).toBe('number');
		expect(typeof result.entitiesCreated.departments).toBe('number');
		expect(typeof result.entitiesCreated.total).toBe('number');

		// If successful, counts should be within specified ranges
		if (result.success) {
			expect(result.entitiesCreated.users).toBeGreaterThanOrEqual(10);
			expect(result.entitiesCreated.users).toBeLessThanOrEqual(15);
			expect(result.entitiesCreated.departments).toBeGreaterThanOrEqual(5);
			expect(result.entitiesCreated.departments).toBeLessThanOrEqual(8);
		}

		// If errors exist, should be array of strings
		if (result.errors) {
			expect(Array.isArray(result.errors)).toBe(true);
			result.errors.forEach(error => {
				expect(typeof error).toBe('string');
			});
		}
	});

	test('should clear seed data with confirmation', async ({ request }) => {
		// This test will initially fail until the mutation is implemented
		const mutation = `
			mutation ClearSeedData($confirm: Boolean!) {
				clearSeedData(confirm: $confirm) {
					success
					message
					entitiesDeleted {
						users
						departments
						leaveRequests
						performanceReviews
						goals
						total
					}
				}
			}
		`;

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query: mutation,
				variables: { confirm: true }
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('data');
		expect(data.data).toHaveProperty('clearSeedData');

		const result = data.data.clearSeedData;

		// Validate response schema
		expect(typeof result.success).toBe('boolean');
		expect(typeof result.message).toBe('string');
		expect(result).toHaveProperty('entitiesDeleted');
		expect(typeof result.entitiesDeleted.total).toBe('number');
	});

	test('should reject clear without confirmation', async ({ request }) => {
		const mutation = `
			mutation ClearSeedData($confirm: Boolean!) {
				clearSeedData(confirm: $confirm) {
					success
					message
				}
			}
		`;

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query: mutation,
				variables: { confirm: false }
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		const data = await response.json();

		// Should either return an error or success: false
		if (data.data?.clearSeedData) {
			expect(data.data.clearSeedData.success).toBe(false);
		} else if (data.errors) {
			expect(Array.isArray(data.errors)).toBe(true);
		}
	});

	test('should validate input constraints', async ({ request }) => {
		// Test invalid input to ensure proper validation
		const mutation = `
			mutation InitializeSeedData($config: SeedDataInput!) {
				initializeSeedData(config: $config) {
					success
					message
					errors
				}
			}
		`;

		// Invalid config: min > max
		const variables = {
			config: {
				users: { min: 20, max: 10 }, // Invalid: min > max
				departments: { min: 5, max: 8 },
				leaveRequests: { min: 10, max: 20 },
				performanceReviews: { min: 10, max: 15 },
				goals: { min: 15, max: 25 },
				generateRelationships: true
			}
		};

		const response = await request.post(GRAPHQL_ENDPOINT, {
			data: {
				query: mutation,
				variables
			},
			headers: {
				'Content-Type': 'application/json'
			}
		});

		const data = await response.json();

		// Should return validation error
		if (data.data?.initializeSeedData) {
			expect(data.data.initializeSeedData.success).toBe(false);
			expect(data.data.initializeSeedData.errors).toBeDefined();
		} else {
			expect(data.errors).toBeDefined();
		}
	});
});