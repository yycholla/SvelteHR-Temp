/**
 * Employee Service
 * 
 * Provides high-level employee management operations using GraphQL client
 * Implements business logic for employee CRUD operations, search, filtering, and validation
 * 
 * This service acts as an abstraction layer over the GraphQL employee operations
 * and provides additional business logic for employee management workflows.
 */

import { employeeOperations, type GraphQLResponse } from '../graphql/client';
import type { CreateEmployeeInput } from '../../tests/contract/employees.test';

/**
 * Employee service result types
 */
export interface EmployeeResult {
	success: boolean;
	data?: any;
	error?: string;
}

export interface EmployeesListResult {
	success: boolean;
	data?: {
		employees: any[];
		total: number;
		page: number;
		limit: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
	error?: string;
}

/**
 * Employee search and filter options
 */
export interface EmployeeSearchOptions {
	page?: number;
	limit?: number;
	search?: string;
	department?: string;
	status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED';
	sortBy?: 'FIRST_NAME' | 'LAST_NAME' | 'HIRE_DATE' | 'POSITION';
	sortOrder?: 'ASC' | 'DESC';
}

/**
 * Employee update input
 */
export interface UpdateEmployeeInput {
	firstName?: string;
	lastName?: string;
	email?: string;
	position?: string;
	departmentId?: string;
	salary?: number;
	phone?: string;
	address?: string;
	managerId?: string;
}

/**
 * Employee Service Class
 * 
 * Provides business-level employee management operations that integrate
 * GraphQL operations with application business logic
 */
export class EmployeeService {
	/**
	 * Get paginated list of employees with search and filtering
	 */
	async getEmployees(options: EmployeeSearchOptions = {}): Promise<EmployeesListResult> {
		try {
			const {
				page = 1,
				limit = 20,
				search,
				department,
				status,
				sortBy = 'LAST_NAME',
				sortOrder = 'ASC'
			} = options;

			const response = await employeeOperations.getEmployees({
				page,
				limit,
				search,
				department,
				status,
				sortBy,
				sortOrder
			});

			if (response.errors || !response.data?.employees) {
				return {
					success: false,
					error: response.errors?.[0]?.message || 'Failed to fetch employees'
				};
			}

			const employeeData = response.data.employees;

			return {
				success: true,
				data: {
					employees: employeeData.employees || [],
					total: employeeData.total || 0,
					page: employeeData.page || page,
					limit: employeeData.limit || limit,
					hasNextPage: employeeData.hasNextPage || false,
					hasPreviousPage: employeeData.hasPreviousPage || false
				}
			};
		} catch (error) {
			console.error('EmployeeService.getEmployees error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch employees'
			};
		}
	}

	/**
	 * Get single employee by ID
	 */
	async getEmployee(id: string): Promise<EmployeeResult> {
		try {
			if (!id) {
				return {
					success: false,
					error: 'Employee ID is required'
				};
			}

			const response = await employeeOperations.getEmployee(id);

			if (response.errors || !response.data?.employee) {
				return {
					success: false,
					error: response.errors?.[0]?.message || 'Employee not found'
				};
			}

			return {
				success: true,
				data: response.data.employee
			};
		} catch (error) {
			console.error('EmployeeService.getEmployee error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch employee'
			};
		}
	}

	/**
	 * Get employee by employee ID (not database ID)
	 */
	async getEmployeeByEmployeeId(employeeId: string): Promise<EmployeeResult> {
		try {
			if (!employeeId) {
				return {
					success: false,
					error: 'Employee ID is required'
				};
			}

			// Note: This would use employeeOperations.getEmployeeByEmployeeId if implemented
			// For now, we'll search through the employees list
			const searchResult = await this.getEmployees({ search: employeeId });
			
			if (!searchResult.success || !searchResult.data?.employees.length) {
				return {
					success: false,
					error: 'Employee not found'
				};
			}

			// Find exact match for employeeId
			const employee = searchResult.data.employees.find(
				emp => emp.employeeId === employeeId
			);

			if (!employee) {
				return {
					success: false,
					error: 'Employee not found'
				};
			}

			return {
				success: true,
				data: employee
			};
		} catch (error) {
			console.error('EmployeeService.getEmployeeByEmployeeId error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to fetch employee'
			};
		}
	}

	/**
	 * Create new employee
	 */
	async createEmployee(input: CreateEmployeeInput): Promise<EmployeeResult> {
		try {
			// Validate required fields
			const requiredFields = ['email', 'firstName', 'lastName', 'employeeId'];
			const missingFields = requiredFields.filter(field => !input[field as keyof CreateEmployeeInput]);
			
			if (missingFields.length > 0) {
				return {
					success: false,
					error: `Missing required fields: ${missingFields.join(', ')}`
				};
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(input.email)) {
				return {
					success: false,
					error: 'Invalid email format'
				};
			}

			const response = await employeeOperations.createEmployee(input);

			if (response.errors || !response.data?.createEmployee) {
				return {
					success: false,
					error: response.errors?.[0]?.message || 'Failed to create employee'
				};
			}

			return {
				success: true,
				data: response.data.createEmployee
			};
		} catch (error) {
			console.error('EmployeeService.createEmployee error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to create employee'
			};
		}
	}

	/**
	 * Update existing employee
	 */
	async updateEmployee(id: string, input: UpdateEmployeeInput): Promise<EmployeeResult> {
		try {
			if (!id) {
				return {
					success: false,
					error: 'Employee ID is required'
				};
			}

			// Validate email format if provided
			if (input.email) {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(input.email)) {
					return {
						success: false,
						error: 'Invalid email format'
					};
				}
			}

			// Note: This would use employeeOperations.updateEmployee if implemented
			// For now, return a mock response
			return {
				success: false,
				error: 'Update employee operation not yet implemented in GraphQL client'
			};
		} catch (error) {
			console.error('EmployeeService.updateEmployee error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update employee'
			};
		}
	}

	/**
	 * Update current user's employee profile (limited fields)
	 */
	async updateMyProfile(input: { phone?: string; address?: string }): Promise<EmployeeResult> {
		try {
			// Note: This would use employeeOperations.updateMyProfile if implemented
			// For now, return a mock response
			return {
				success: false,
				error: 'Update my profile operation not yet implemented in GraphQL client'
			};
		} catch (error) {
			console.error('EmployeeService.updateMyProfile error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to update profile'
			};
		}
	}

	/**
	 * Deactivate employee
	 */
	async deactivateEmployee(id: string, reason?: string): Promise<EmployeeResult> {
		try {
			if (!id) {
				return {
					success: false,
					error: 'Employee ID is required'
				};
			}

			// Note: This would use employeeOperations.deactivateEmployee if implemented
			// For now, return a mock response
			return {
				success: false,
				error: 'Deactivate employee operation not yet implemented in GraphQL client'
			};
		} catch (error) {
			console.error('EmployeeService.deactivateEmployee error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to deactivate employee'
			};
		}
	}

	/**
	 * Reactivate employee
	 */
	async reactivateEmployee(id: string): Promise<EmployeeResult> {
		try {
			if (!id) {
				return {
					success: false,
					error: 'Employee ID is required'
				};
			}

			// Note: This would use employeeOperations.reactivateEmployee if implemented
			// For now, return a mock response
			return {
				success: false,
				error: 'Reactivate employee operation not yet implemented in GraphQL client'
			};
		} catch (error) {
			console.error('EmployeeService.reactivateEmployee error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to reactivate employee'
			};
		}
	}

	/**
	 * Search employees by name or employee ID
	 */
	async searchEmployees(query: string, options: Omit<EmployeeSearchOptions, 'search'> = {}): Promise<EmployeesListResult> {
		if (!query || query.trim().length < 2) {
			return {
				success: false,
				error: 'Search query must be at least 2 characters long'
			};
		}

		return this.getEmployees({
			...options,
			search: query.trim()
		});
	}

	/**
	 * Get employees by department
	 */
	async getEmployeesByDepartment(departmentId: string, options: Omit<EmployeeSearchOptions, 'department'> = {}): Promise<EmployeesListResult> {
		if (!departmentId) {
			return {
				success: false,
				error: 'Department ID is required'
			};
		}

		return this.getEmployees({
			...options,
			department: departmentId
		});
	}

	/**
	 * Get employee statistics
	 */
	async getEmployeeStats(): Promise<EmployeeResult> {
		try {
			// Get all employees to calculate statistics
			const allEmployeesResult = await this.getEmployees({ limit: 1000 });
			
			if (!allEmployeesResult.success || !allEmployeesResult.data) {
				return {
					success: false,
					error: allEmployeesResult.error || 'Failed to fetch employee statistics'
				};
			}

			const employees = allEmployeesResult.data.employees;
			const total = employees.length;
			const active = employees.filter(emp => emp.status === 'ACTIVE').length;
			const inactive = employees.filter(emp => emp.status === 'INACTIVE').length;
			const terminated = employees.filter(emp => emp.status === 'TERMINATED').length;

			// Calculate new employees this month
			const thisMonth = new Date();
			const firstOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
			const newThisMonth = employees.filter(emp => {
				if (!emp.hireDate) return false;
				const hireDate = new Date(emp.hireDate);
				return hireDate >= firstOfMonth;
			}).length;

			return {
				success: true,
				data: {
					total,
					active,
					inactive,
					terminated,
					newThisMonth,
					departments: this.calculateDepartmentStats(employees)
				}
			};
		} catch (error) {
			console.error('EmployeeService.getEmployeeStats error:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Failed to calculate employee statistics'
			};
		}
	}

	/**
	 * Calculate department statistics
	 */
	private calculateDepartmentStats(employees: any[]): Record<string, number> {
		const deptStats: Record<string, number> = {};
		
		employees.forEach(emp => {
			if (emp.department?.name) {
				const deptName = emp.department.name;
				deptStats[deptName] = (deptStats[deptName] || 0) + 1;
			}
		});

		return deptStats;
	}

	/**
	 * Validate employee data
	 */
	validateEmployeeData(input: CreateEmployeeInput | UpdateEmployeeInput): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		// Email validation
		if ('email' in input && input.email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(input.email)) {
				errors.push('Invalid email format');
			}
		}

		// Name validation
		if ('firstName' in input && input.firstName && input.firstName.trim().length < 2) {
			errors.push('First name must be at least 2 characters long');
		}

		if ('lastName' in input && input.lastName && input.lastName.trim().length < 2) {
			errors.push('Last name must be at least 2 characters long');
		}

		// Employee ID validation (for create operations)
		if ('employeeId' in input && input.employeeId) {
			const employeeIdRegex = /^[A-Z]{2,4}\d{3,6}$/;
			if (!employeeIdRegex.test(input.employeeId)) {
				errors.push('Employee ID must follow format: 2-4 uppercase letters followed by 3-6 digits (e.g., EMP001, HR1234)');
			}
		}

		// Salary validation
		if ('salary' in input && input.salary !== undefined) {
			if (input.salary < 0 || input.salary > 10000000) {
				errors.push('Salary must be between 0 and 10,000,000');
			}
		}

		// Phone validation
		if ('phone' in input && input.phone) {
			const phoneRegex = /^\+?[1-9]\d{1,14}$/;
			if (!phoneRegex.test(input.phone.replace(/[\s\-\(\)]/g, ''))) {
				errors.push('Invalid phone number format');
			}
		}

		return {
			valid: errors.length === 0,
			errors
		};
	}
}

/**
 * Singleton instance of EmployeeService
 */
export const employeeService = new EmployeeService();