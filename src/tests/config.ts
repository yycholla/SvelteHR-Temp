/**
 * Test Configuration
 * 
 * Centralized configuration for all test suites
 */

// Development server configuration
export const TEST_CONFIG = {
	// Use correct port from dev server
	API_BASE_URL: 'http://localhost:4001',
	GRAPHQL_ENDPOINT: 'http://localhost:4001/api/graphql',
	
	// Test authentication tokens
	VALID_TOKEN: 'mock-admin-token-12345',
	EXPIRED_TOKEN: 'mock-expired-token-99999',
	INVALID_TOKEN: 'invalid-token-format',
	
	// Test user IDs
	ADMIN_USER_ID: '550e8400-e29b-41d4-a716-446655440000',
	HR_USER_ID: '550e8400-e29b-41d4-a716-446655440001',
	EMPLOYEE_USER_ID: '550e8400-e29b-41d4-a716-446655440002',
	
	// Test department IDs
	ENGINEERING_DEPT_ID: '660e8400-e29b-41d4-a716-446655440000',
	HR_DEPT_ID: '660e8400-e29b-41d4-a716-446655440001',
	
	// Test timeouts
	REQUEST_TIMEOUT: 5000,
	SERVER_STARTUP_TIMEOUT: 10000
} as const;

// Wait for server to be ready
export async function waitForServer(
	endpoint: string = TEST_CONFIG.GRAPHQL_ENDPOINT,
	maxAttempts: number = 20,
	delayMs: number = 500
): Promise<boolean> {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const response = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: '{ __typename }'
				})
			});
			
			// Any response (even errors) means server is up
			if (response.status) {
				return true;
			}
		} catch (error) {
			if (attempt === maxAttempts) {
				console.error(`Server not ready after ${maxAttempts} attempts:`, error);
				return false;
			}
			await new Promise(resolve => setTimeout(resolve, delayMs));
		}
	}
	return false;
}