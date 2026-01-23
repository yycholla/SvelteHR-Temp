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
 * Error thrown when a service is unavailable.
 */
export class ServiceUnavailableError extends DomainError {
	constructor(service: string) {
		super(`Service ${service} is unavailable`, 'SERVICE_UNAVAILABLE', { service });
		this.name = 'ServiceUnavailableError';
	}
}
