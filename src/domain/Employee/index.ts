// Employee Domain Module - Public API
// Re-exports all public types, classes, and interfaces from the Employee domain

// Entity
export { Employee } from './Employee';

// Value Objects
export { Email } from './Email';
export { PersonName } from './PersonName';
export { HireDate } from './HireDate';
export { EmployeeStatus } from './EmployeeStatus';

// Types
export type {
	CreateEmployeeData,
	UpdateEmployeeData,
	EmployeeListFilters,
	EmployeeListResult,
	EmployeeSortField,
	SortOrder,
	BulkOperationResult
} from './types';
