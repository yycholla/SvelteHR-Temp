// src/services/EmployeeService.ts
import {
	type BulkOperationResult,
	type CreateEmployeeData,
	DomainError,
	type Employee,
	EmployeeAlreadyExistsError,
	Employee as EmployeeEntity,
	type EmployeeListFilters,
	type EmployeeListResult,
	EmployeeNotFoundError,
	Result,
	type UpdateEmployeeData
} from '$domain';
import type { EmployeeRepository } from '$services';

/**
 * Application service for managing employees.
 * Orchestrates domain logic and repository operations.
 */
export class EmployeeService {
	constructor(private readonly employeeRepository: EmployeeRepository) {}

	/**
	 * Get an employee by ID
	 * @param id - The employee ID
	 * @returns Result containing the employee or an error
	 */
	async getEmployeeById(id: string): Promise<Result<Employee, DomainError>> {
		try {
			const employee = await this.employeeRepository.findById(id);

			if (!employee) {
				return Result.error(new EmployeeNotFoundError(id));
			}

			return Result.ok(employee);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch employee', 'EMPLOYEE_FETCH_FAILED', {
					employeeId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all employees with optional filters, sorting, and pagination
	 * @param filters - Optional filters for search, department, active status, sorting, and pagination
	 * @returns Result containing EmployeeListResult (employees + metadata) or an error
	 */
	async getEmployees(
		filters?: EmployeeListFilters
	): Promise<Result<EmployeeListResult, DomainError>> {
		try {
			const result = await this.employeeRepository.findAll(filters);
			return Result.ok(result);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch employees', 'EMPLOYEES_FETCH_FAILED', {
					filters,
					originalError: error
				})
			);
		}
	}

	/**
	 * Create a new employee
	 * @param data - The employee data
	 * @returns Result containing the created employee or an error
	 */
	async createEmployee(data: CreateEmployeeData): Promise<Result<Employee, DomainError>> {
		try {
			// Check for duplicate email
			const existingEmployee = await this.employeeRepository.findByEmail(data.email);
			if (existingEmployee) {
				return Result.error(new EmployeeAlreadyExistsError(data.email));
			}

			// Create domain entity (validates business rules)
			const employeeResult = EmployeeEntity.create(data);
			if (employeeResult.isError) {
				return Result.error(employeeResult.error);
			}

			// Persist via repository
			const savedEmployee = await this.employeeRepository.save(employeeResult.value);
			return Result.ok(savedEmployee);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to create employee', 'EMPLOYEE_CREATE_FAILED', {
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Update an existing employee
	 * @param id - The employee ID
	 * @param data - The fields to update
	 * @returns Result containing the updated employee or an error
	 */
	async updateEmployee(
		id: string,
		data: UpdateEmployeeData
	): Promise<Result<Employee, DomainError>> {
		try {
			// Fetch existing employee
			const employee = await this.employeeRepository.findById(id);
			if (!employee) {
				return Result.error(new EmployeeNotFoundError(id));
			}

			// Apply updates using domain methods
			if (data.jobTitle !== undefined) {
				const result = employee.updateJobTitle(data.jobTitle);
				if (result.isError) {
					return Result.error(result.error);
				}
			}

			if (data.phone !== undefined) {
				const result = employee.updatePhone(data.phone);
				if (result.isError) {
					return Result.error(result.error);
				}
			}

			if (data.departmentId !== undefined) {
				const result = employee.changeDepartment(data.departmentId);
				if (result.isError) {
					return Result.error(result.error);
				}
			}

			// Note: email, firstName, lastName updates would require recreating the entity
			// or adding domain methods for those operations. For now, we only support
			// the fields that have domain methods available.

			// Save updated employee
			const updatedEmployee = await this.employeeRepository.update(id, employee);
			return Result.ok(updatedEmployee);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to update employee', 'EMPLOYEE_UPDATE_FAILED', {
					employeeId: id,
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Delete an employee (soft delete - deactivates)
	 * @param id - The employee ID
	 * @returns Result indicating success or an error
	 */
	async deleteEmployee(id: string): Promise<Result<void, DomainError>> {
		try {
			// Fetch existing employee
			const employee = await this.employeeRepository.findById(id);
			if (!employee) {
				return Result.error(new EmployeeNotFoundError(id));
			}

			// Deactivate using domain method
			const deactivateResult = employee.deactivate();
			if (deactivateResult.isError) {
				return Result.error(deactivateResult.error);
			}

			// Save updated employee (soft delete)
			await this.employeeRepository.update(id, employee);

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to delete employee', 'EMPLOYEE_DELETE_FAILED', {
					employeeId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Bulk activate multiple employees
	 * @param employeeIds - Array of employee IDs to activate
	 * @returns Result containing BulkOperationResult with success/failure counts and errors
	 */
	async bulkActivate(employeeIds: string[]): Promise<Result<BulkOperationResult, DomainError>> {
		// Validate input
		if (!employeeIds || employeeIds.length === 0) {
			return Result.error(
				new DomainError('Employee IDs array cannot be empty', 'EMPTY_INPUT', {
					employeeIds
				})
			);
		}

		// Remove duplicates
		const uniqueIds = Array.from(new Set(employeeIds));

		const result: BulkOperationResult = {
			successCount: 0,
			failureCount: 0,
			errors: []
		};

		// Process each employee
		for (const id of uniqueIds) {
			try {
				// Get employee
				const employeeResult = await this.getEmployeeById(id);

				if (employeeResult.isError) {
					result.failureCount++;
					result.errors.push({ employeeId: id, error: employeeResult.error });
					continue;
				}

				const employee = employeeResult.value;

				// Skip if already active (idempotent operation)
				if (employee.isActive) {
					result.successCount++;
					continue;
				}

				// Activate
				const activateResult = employee.activate();
				if (activateResult.isError) {
					result.failureCount++;
					result.errors.push({ employeeId: id, error: activateResult.error });
					continue;
				}

				// Save
				await this.employeeRepository.update(id, employee);
				result.successCount++;
			} catch (error) {
				result.failureCount++;
				result.errors.push({
					employeeId: id,
					error: new DomainError('Failed to activate employee', 'ACTIVATION_FAILED', { error })
				});
			}
		}

		return Result.ok(result);
	}

	/**
	 * Bulk deactivate multiple employees
	 * @param employeeIds - Array of employee IDs to deactivate
	 * @returns Result containing BulkOperationResult with success/failure counts and errors
	 */
	async bulkDeactivate(employeeIds: string[]): Promise<Result<BulkOperationResult, DomainError>> {
		// Validate input
		if (!employeeIds || employeeIds.length === 0) {
			return Result.error(
				new DomainError('Employee IDs array cannot be empty', 'EMPTY_INPUT', {
					employeeIds
				})
			);
		}

		// Remove duplicates
		const uniqueIds = Array.from(new Set(employeeIds));

		const result: BulkOperationResult = {
			successCount: 0,
			failureCount: 0,
			errors: []
		};

		// Process each employee
		for (const id of uniqueIds) {
			try {
				// Get employee
				const employeeResult = await this.getEmployeeById(id);

				if (employeeResult.isError) {
					result.failureCount++;
					result.errors.push({ employeeId: id, error: employeeResult.error });
					continue;
				}

				const employee = employeeResult.value;

				// Skip if already inactive (idempotent operation)
				if (!employee.isActive) {
					result.successCount++;
					continue;
				}

				// Deactivate
				const deactivateResult = employee.deactivate();
				if (deactivateResult.isError) {
					result.failureCount++;
					result.errors.push({ employeeId: id, error: deactivateResult.error });
					continue;
				}

				// Save
				await this.employeeRepository.update(id, employee);
				result.successCount++;
			} catch (error) {
				result.failureCount++;
				result.errors.push({
					employeeId: id,
					error: new DomainError('Failed to deactivate employee', 'DEACTIVATION_FAILED', { error })
				});
			}
		}

		return Result.ok(result);
	}
}
