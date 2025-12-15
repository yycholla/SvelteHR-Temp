import { logger } from '$lib/utils/logger';
import type { ApiResponse } from '$lib/types/index';

// Internal types for GraphQL responses
interface DepartmentManagerData {
	departmentById?: {
		id: string;
		managerId?: string;
	};
}

interface EmployeeDepartmentData {
	managerUser?: {
		id: string;
		departmentByDepartmentId?: {
			id: string;
			managerId?: string;
		};
	};
	targetUser?: {
		id: string;
		departmentId?: string;
	};
}

/**
 * Check if a manager has edit access to a specific department/team
 * Admins have full access to all departments
 * Managers only have edit access to their own department
 */
export async function canEditDepartment(
	userId: string,
	departmentId: string,
	userRole: string
): Promise<boolean> {
	if (userRole.toLowerCase() === 'admin') {
		return true;
	}

	// For managers, check if they manage this department
	const roleLower = userRole.toLowerCase();
	if (roleLower === 'manager' || roleLower === 'hr manager') {
		try {
			// Import here to avoid circular dependencies
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						query CheckDepartmentManager($departmentId: UUID!) {
							departmentById(id: $departmentId) {
								id
								managerId
							}
						}
					`,
					variables: { departmentId }
				})
			});

			const data = (await response.json()) as ApiResponse<DepartmentManagerData>;
			const department = data?.data?.departmentById;

			// Manager can edit if they are the department manager
			return department?.managerId === userId;
		} catch (error) {
			logger.error('Department by id failed', error as Error);
			return false;
		}
	}

	// Employees cannot edit departments
	return false;
}

/**
 * Check if a user can edit a specific employee's data
 * Admins can edit anyone
 * Managers can edit employees in their department
 * Employees can only edit their own data
 */
export async function canEditEmployee(
	userId: string,
	targetEmployeeId: string,
	userRole: string
): Promise<boolean> {
	// Admins can edit anyone
	if (userRole.toLowerCase() === 'admin') {
		return true;
	}

	// Employees can only edit themselves
	if (userRole.toLowerCase() === 'employee') {
		return userId === targetEmployeeId;
	}

	// For managers, check if target employee is in their department
	const roleLower = userRole.toLowerCase();
	if (roleLower === 'manager' || roleLower === 'hr manager') {
		try {
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: `
						query CheckEmployeeDepartment($managerId: UUID!, $employeeId: UUID!) {
							managerUser: userById(id: $managerId) {
								id
								departmentByDepartmentId {
									id
									managerId
								}
							}
							targetUser: userById(id: $employeeId) {
								id
								departmentId
							}
						}
					`,
					variables: { managerId: userId, employeeId: targetEmployeeId }
				})
			});

			const data = (await response.json()) as ApiResponse<EmployeeDepartmentData>;
			const managerDept = data?.data?.managerUser?.departmentByDepartmentId;
			const targetUserDeptId = data?.data?.targetUser?.departmentId;

			// Manager can edit if they manage the employee's department
			return !!(
				managerDept &&
				managerDept.id === targetUserDeptId &&
				managerDept.managerId === userId
			);
		} catch (error) {
			logger.error('Error checking employee edit permissions', error as Error);
			return false;
		}
	}

	return false;
}

/**
 * Check if a user is the manager of a specific department
 * Queries the database to verify the manager assignment
 *
 * @param userId - The user ID to check
 * @param departmentId - The department ID to check against
 * @returns true if the user is the manager of the department, false otherwise
 */
export async function isManagerOfDepartment(
	userId: string,
	departmentId: string
): Promise<boolean> {
	try {
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query CheckDepartmentManager($departmentId: UUID!) {
						departmentById(id: $departmentId) {
							id
							managerId
						}
					}
				`,
				variables: { departmentId }
			})
		});

		const data = (await response.json()) as ApiResponse<DepartmentManagerData>;
		const department = data?.data?.departmentById;

		return department?.managerId === userId;
	} catch (error) {
		logger.error('Error checking department manager', error as Error);
		return false;
	}
}
