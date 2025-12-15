import { logger } from '$lib/utils/logger';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { ResourceValidationResult } from './types';

/**
 * Validate an employee resource
 */
export async function validateEmployeeResource(employeeId: string): Promise<ResourceValidationResult> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query ValidateEmployee($employeeId: UUID!) {
						userById(id: $employeeId) {
							id
							displayName
							email
							archived
							archivedAt
						}
					}
				`,
				variables: { employeeId }
			})
		});

		if (!response.ok) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Failed to fetch employee'
			};
		}

		const data = await response.json();
		const employee = data?.data?.userById;

		if (!employee) {
			return {
				valid: false,
				exists: false,
				accessible: false,
				availabilityStatus: 'Unavailable',
				error: 'Employee not found'
			};
		}

		// Check if employee is archived
		if (employee.archived) {
			return {
				valid: false,
				exists: true,
				accessible: false,
				availabilityStatus: 'Unavailable',
				resourceTitle: employee.displayName,
				error: 'Employee is archived'
			};
		}

		return {
			valid: true,
			exists: true,
			accessible: true,
			availabilityStatus: 'Available',
			resourceTitle: employee.displayName,
			metadata: {
				email: employee.email
			}
		};
	} catch (error) {
		logger.error('Error checking employee', error as Error);
		return {
			valid: false,
			exists: false,
			accessible: false,
			availabilityStatus: 'Unavailable',
			error: 'Error checking employee'
		};
	}
}
