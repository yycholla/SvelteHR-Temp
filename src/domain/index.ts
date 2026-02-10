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
	DepartmentAlreadyExistsError,
	DepartmentDeletionError,
	CircularDepartmentReferenceError,
	InvalidDepartmentNameError,
	DepartmentHierarchyError,
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

// LeaveRequest domain
export {
	LeaveRequest,
	LeaveDateRange,
	LeaveType,
	LeaveStatus,
	type CreateLeaveRequestData,
	type UpdateLeaveRequestData,
	type LeaveRequestDTO,
	type LeaveRequestFilters,
	type LeaveRequestListResult,
	type LeaveBalance,
	type LeaveStatistics,
	type LeaveStatisticsFilters,
	LeaveRequestNotFoundError,
	InvalidDateRangeError,
	InvalidDateError,
	PastDateError,
	FutureDateError,
	ExcessiveLeaveDurationError,
	LeaveReasonRequiredError,
	InvalidLeaveTypeError,
	InvalidLeaveStatusError,
	InvalidStatusTransitionError,
	LeaveRejectionCommentsRequiredError,
	OverlappingLeaveRequestError,
	InsufficientLeaveBalanceError,
	UnauthorizedApprovalError,
	UnauthorizedCancellationError
} from './LeaveRequest';
