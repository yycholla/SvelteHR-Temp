import type { UserCredentials } from '$lib/models/data-request';
import type { Employee } from './types';

/**
 * Helper function to format employee display name
 */
export function formatEmployeeName(employee: Employee): string {
	if (employee.fullName) {
		return employee.fullName;
	}
	if (employee.firstName && employee.lastName) {
		return `${employee.firstName} ${employee.lastName}`;
	}
	return employee.displayName || employee.email;
}

/**
 * Helper function to check if user can view employee
 */
export function canViewEmployee(employee: Employee, userCredentials: UserCredentials): boolean {
	// Admin can view all employees
	if (
		userCredentials.permissions.includes('*') ||
		userCredentials.permissions.includes('*:*') ||
		userCredentials.permissions.includes('employees:read')
	) {
		return true;
	}

	// Users can view their own profile
	if (employee.id === userCredentials.userId) {
		return true;
	}

	// Managers can view their direct reports
	if (employee.managerId === userCredentials.userId) {
		return true;
	}

	return false;
}
