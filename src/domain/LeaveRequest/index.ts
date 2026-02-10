/**
 * LeaveRequest Domain Module
 *
 * Public API for the LeaveRequest domain layer.
 * This module exports all domain entities, value objects, errors, and types.
 */

// Main Entity
export { LeaveRequest } from './LeaveRequest';

// Value Objects
export { LeaveDateRange } from './LeaveDateRange';
export { LeaveType } from './LeaveType';
export { LeaveStatus } from './LeaveStatus';

// Types & DTOs
export type {
	CreateLeaveRequestData,
	UpdateLeaveRequestData,
	LeaveRequestDTO,
	LeaveRequestFilters,
	LeaveRequestListResult,
	LeaveBalance,
	LeaveStatistics,
	LeaveStatisticsFilters
} from './types';

// Domain Errors
export {
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
} from './errors';
