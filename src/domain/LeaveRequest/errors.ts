import { DomainError } from '$domain/errors';

export class LeaveRequestNotFoundError extends DomainError {
	constructor(id: string) {
		super(`Leave request not found: ${id}`, 'LEAVE_REQUEST_NOT_FOUND', { id });
	}
}

export class InvalidDateRangeError extends DomainError {
	constructor(message: string) {
		super(message, 'INVALID_DATE_RANGE');
	}
}

export class PastDateError extends DomainError {
	constructor(message: string) {
		super(message, 'PAST_DATE');
	}
}

export class FutureDateError extends DomainError {
	constructor(message: string) {
		super(message, 'FUTURE_DATE');
	}
}

export class ExcessiveLeaveDurationError extends DomainError {
	constructor(days: number) {
		super(`Leave duration exceeds maximum: ${days} days`, 'EXCESSIVE_DURATION', { days });
	}
}

export class LeaveReasonRequiredError extends DomainError {
	constructor(days: number) {
		super(`Reason required for leave requests over 5 days (${days} days)`, 'REASON_REQUIRED', {
			days
		});
	}
}

export class InvalidLeaveTypeError extends DomainError {
	constructor(type: string) {
		super(`Invalid leave type: ${type}`, 'INVALID_LEAVE_TYPE', { type });
	}
}

export class InvalidLeaveStatusError extends DomainError {
	constructor(status: string) {
		super(`Invalid leave status: ${status}`, 'INVALID_LEAVE_STATUS', { status });
	}
}

export class InvalidStatusTransitionError extends DomainError {
	constructor(from: unknown, to: unknown) {
		const fromStr =
			from && typeof from === 'object' && 'toString' in from ? from.toString() : String(from);
		const toStr = to && typeof to === 'object' && 'toString' in to ? to.toString() : String(to);
		super(`Cannot transition from ${fromStr} to ${toStr}`, 'INVALID_STATUS_TRANSITION', {
			from: fromStr,
			to: toStr
		});
	}
}

export class LeaveRejectionCommentsRequiredError extends DomainError {
	constructor() {
		super('Rejection comments are required', 'REJECTION_COMMENTS_REQUIRED');
	}
}

export class OverlappingLeaveRequestError extends DomainError {
	constructor(overlapping: Array<{ id: string; startDate: Date; endDate: Date }>) {
		super('Overlapping leave request exists', 'LEAVE_OVERLAP', { overlapping });
	}
}

export class InsufficientLeaveBalanceError extends DomainError {
	constructor(available: number, requested: number) {
		super(
			`Insufficient leave balance: ${available} days available, ${requested} days requested`,
			'INSUFFICIENT_BALANCE',
			{ available, requested }
		);
	}
}

export class UnauthorizedApprovalError extends DomainError {
	constructor(managerId: string, employeeId: string) {
		super(
			`Manager ${managerId} not authorized to approve leave for employee ${employeeId}`,
			'UNAUTHORIZED_APPROVAL',
			{ managerId, employeeId }
		);
	}
}

export class UnauthorizedCancellationError extends DomainError {
	constructor(employeeId: string, requestId: string) {
		super(
			`Employee ${employeeId} not authorized to cancel request ${requestId}`,
			'UNAUTHORIZED_CANCELLATION',
			{ employeeId, requestId }
		);
	}
}

export class InvalidDateError extends DomainError {
	constructor(message: string) {
		super(message, 'INVALID_DATE');
	}
}
