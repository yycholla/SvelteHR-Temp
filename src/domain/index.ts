// Domain Layer - Public API
// Re-exports all public domain types and classes

// Core types
export { Result } from './Result';
export {
	DomainError,
	ValidationError,
	EmployeeNotFoundError,
	EmployeeAlreadyExistsError,
	EmployeeDeactivationError,
	InvalidEmailError,
	InvalidHireDateError,
	DepartmentNotFoundError,
	ServiceUnavailableError
} from './errors';

// Employee domain
export {
	Employee,
	Email,
	PersonName,
	HireDate,
	EmployeeStatus,
	type CreateEmployeeData,
	type UpdateEmployeeData,
	type EmployeeListFilters,
	type EmployeeListResult,
	type EmployeeSortField,
	type SortOrder,
	type BulkOperationResult
} from './Employee';
