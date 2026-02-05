/**
 * Base error class for all domain errors.
 * Provides structured error information with error codes and context.
 */
export class DomainError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly context?: Record<string, unknown>
	) {
		super(message);
		this.name = 'DomainError';
	}
}

/**
 * Error thrown when an employee is not found.
 */
export class EmployeeNotFoundError extends DomainError {
	constructor(employeeId: string) {
		super(`Employee with ID ${employeeId} not found`, 'EMPLOYEE_NOT_FOUND', { employeeId });
		this.name = 'EmployeeNotFoundError';
	}
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends DomainError {
	constructor(field: string, rule: string, value?: unknown) {
		super(`Validation failed for ${field}: ${rule}`, 'VALIDATION_ERROR', {
			field,
			rule,
			value
		});
		this.name = 'ValidationError';
	}
}

/**
 * Error thrown when data transformation fails.
 */
export class DataTransformError extends DomainError {
	constructor(message: string, data?: unknown) {
		super(message, 'DATA_TRANSFORM_ERROR', { data });
		this.name = 'DataTransformError';
	}
}

/**
 * Error thrown when a business rule is violated.
 */
export class BusinessRuleError extends DomainError {
	constructor(rule: string, details?: string) {
		super(
			`Business rule violated: ${rule}${details ? ` - ${details}` : ''}`,
			'BUSINESS_RULE_ERROR',
			{
				rule,
				details
			}
		);
		this.name = 'BusinessRuleError';
	}
}

/**
 * Error thrown when hire date validation fails.
 */
export class InvalidHireDateError extends DomainError {
	constructor(reason: string) {
		super(`Invalid hire date: ${reason}`, 'INVALID_HIRE_DATE', { reason });
		this.name = 'InvalidHireDateError';
	}
}

/**
 * Error thrown when email validation fails.
 */
export class InvalidEmailError extends DomainError {
	constructor(reason: string) {
		super(`Invalid email: ${reason}`, 'INVALID_EMAIL', { reason });
		this.name = 'InvalidEmailError';
	}
}

/**
 * Error thrown when attempting to create an employee with duplicate email.
 */
export class EmployeeAlreadyExistsError extends DomainError {
	constructor(email: string) {
		super(`Employee with email ${email} already exists`, 'EMPLOYEE_ALREADY_EXISTS', { email });
		this.name = 'EmployeeAlreadyExistsError';
	}
}

/**
 * Error thrown when employee deactivation fails.
 */
export class EmployeeDeactivationError extends DomainError {
	constructor(employeeId: string, reason: string) {
		super(`Cannot deactivate employee ${employeeId}: ${reason}`, 'EMPLOYEE_DEACTIVATION_FAILED', {
			employeeId,
			reason
		});
		this.name = 'EmployeeDeactivationError';
	}
}

/**
 * Error thrown when a department is not found.
 */
export class DepartmentNotFoundError extends DomainError {
	constructor(departmentId: string) {
		super(`Department with ID ${departmentId} not found`, 'DEPARTMENT_NOT_FOUND', { departmentId });
		this.name = 'DepartmentNotFoundError';
	}
}

/**
 * Error thrown when attempting to create a department with duplicate name.
 */
export class DepartmentAlreadyExistsError extends DomainError {
	constructor(name: string, parentId: string | null) {
		const location = parentId ? `under parent ${parentId}` : 'at root level';
		super(
			`Department with name "${name}" already exists ${location}`,
			'DEPARTMENT_ALREADY_EXISTS',
			{ name, parentId }
		);
		this.name = 'DepartmentAlreadyExistsError';
	}
}

/**
 * Error thrown when department name validation fails.
 */
export class InvalidDepartmentNameError extends DomainError {
	constructor(reason: string, name?: string) {
		super(`Invalid department name: ${reason}`, 'INVALID_DEPARTMENT_NAME', { reason, name });
		this.name = 'InvalidDepartmentNameError';
	}
}

/**
 * Error thrown when a circular reference is detected in department hierarchy.
 */
export class CircularDepartmentReferenceError extends DomainError {
	constructor(departmentId: string, parentId: string) {
		super(
			`Circular reference detected: Department ${departmentId} cannot have parent ${parentId}`,
			'CIRCULAR_DEPARTMENT_REFERENCE',
			{ departmentId, parentId }
		);
		this.name = 'CircularDepartmentReferenceError';
	}
}

/**
 * Error thrown when department hierarchy operations fail.
 */
export class DepartmentHierarchyError extends DomainError {
	constructor(operation: string, reason: string) {
		super(
			`Department hierarchy error during ${operation}: ${reason}`,
			'DEPARTMENT_HIERARCHY_ERROR',
			{
				operation,
				reason
			}
		);
		this.name = 'DepartmentHierarchyError';
	}
}

/**
 * Error thrown when department deletion fails due to constraints.
 */
export class DepartmentDeletionError extends DomainError {
	constructor(departmentId: string, reason: string) {
		super(`Cannot delete department ${departmentId}: ${reason}`, 'DEPARTMENT_DELETION_FAILED', {
			departmentId,
			reason
		});
		this.name = 'DepartmentDeletionError';
	}
}

/**
 * Error thrown when a service is unavailable.
 */
export class ServiceUnavailableError extends DomainError {
	constructor(service: string) {
		super(`Service ${service} is unavailable`, 'SERVICE_UNAVAILABLE', { service });
		this.name = 'ServiceUnavailableError';
	}
}
