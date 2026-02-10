import { Result, DomainError } from '$domain';
import { LeaveType } from './LeaveType';
import { LeaveStatus } from './LeaveStatus';
import { LeaveDateRange } from './LeaveDateRange';
import {
	LeaveReasonRequiredError,
	InvalidStatusTransitionError,
	LeaveRejectionCommentsRequiredError
} from './errors';
import type { CreateLeaveRequestData, LeaveRequestDTO } from './types';

/**
 * LeaveRequest Entity
 *
 * Represents an employee's leave request with all business rules enforced.
 * This is an immutable entity - all modifications return new instances.
 */
export class LeaveRequest {
	private constructor(
		public readonly id: string,
		public readonly employeeId: string,
		public readonly managerId: string | null,
		public readonly leaveType: LeaveType,
		public readonly dateRange: LeaveDateRange,
		public readonly reason: string,
		public readonly status: LeaveStatus,
		public readonly managerComments: string | null,
		public readonly createdAt: Date,
		public readonly updatedAt: Date
	) {}

	/**
	 * Factory method to create a new leave request
	 * Validates all business rules before creation
	 */
	static create(data: CreateLeaveRequestData): Result<LeaveRequest, DomainError> {
		// Validate and parse leave type
		const leaveTypeResult = LeaveType.fromString(data.leaveType);
		if (leaveTypeResult.isError) return Result.error(leaveTypeResult.error);

		// Validate and parse date range
		const dateRangeResult = LeaveDateRange.create(data.startDate, data.endDate);
		if (dateRangeResult.isError) return Result.error(dateRangeResult.error);

		// Business Rule: Reason required for leave requests > 5 days
		const dateRange = dateRangeResult.value;
		if (dateRange.businessDays > 5 && !data.reason?.trim()) {
			return Result.error(new LeaveReasonRequiredError(dateRange.businessDays));
		}

		// Create entity
		return Result.ok(
			new LeaveRequest(
				crypto.randomUUID(),
				data.employeeId,
				null, // No manager assigned yet
				leaveTypeResult.value,
				dateRange,
				data.reason || '',
				LeaveStatus.PENDING,
				null, // No comments yet
				new Date(),
				new Date()
			)
		);
	}

	/**
	 * Approve this leave request
	 * Business Rule: Only pending requests can be approved
	 *
	 * @param managerId - ID of the approving manager
	 * @param comments - Optional approval comments
	 * @returns New LeaveRequest instance with approved status
	 */
	approve(managerId: string, comments?: string): Result<LeaveRequest, DomainError> {
		// Business Rule: Check valid state transition
		if (!this.status.canTransitionTo(LeaveStatus.APPROVED)) {
			return Result.error(new InvalidStatusTransitionError(this.status, LeaveStatus.APPROVED));
		}

		return Result.ok(
			new LeaveRequest(
				this.id,
				this.employeeId,
				managerId,
				this.leaveType,
				this.dateRange,
				this.reason,
				LeaveStatus.APPROVED,
				comments || null,
				this.createdAt,
				new Date() // Update timestamp
			)
		);
	}

	/**
	 * Reject this leave request
	 * Business Rule: Only pending requests can be rejected
	 * Business Rule: Rejection requires manager comments
	 *
	 * @param managerId - ID of the rejecting manager
	 * @param comments - Required rejection reason
	 * @returns New LeaveRequest instance with rejected status
	 */
	reject(managerId: string, comments: string): Result<LeaveRequest, DomainError> {
		// Business Rule: Comments required for rejection
		if (!comments?.trim()) {
			return Result.error(new LeaveRejectionCommentsRequiredError());
		}

		// Business Rule: Check valid state transition
		if (!this.status.canTransitionTo(LeaveStatus.REJECTED)) {
			return Result.error(new InvalidStatusTransitionError(this.status, LeaveStatus.REJECTED));
		}

		return Result.ok(
			new LeaveRequest(
				this.id,
				this.employeeId,
				managerId,
				this.leaveType,
				this.dateRange,
				this.reason,
				LeaveStatus.REJECTED,
				comments,
				this.createdAt,
				new Date()
			)
		);
	}

	/**
	 * Cancel this leave request
	 * Business Rule: Only pending or approved requests can be cancelled
	 * Employee can cancel their own pending request
	 * Manager can cancel approved request
	 *
	 * @returns New LeaveRequest instance with cancelled status
	 */
	cancel(): Result<LeaveRequest, DomainError> {
		// Business Rule: Check valid state transition
		if (!this.status.canTransitionTo(LeaveStatus.CANCELLED)) {
			return Result.error(new InvalidStatusTransitionError(this.status, LeaveStatus.CANCELLED));
		}

		return Result.ok(
			new LeaveRequest(
				this.id,
				this.employeeId,
				this.managerId,
				this.leaveType,
				this.dateRange,
				this.reason,
				LeaveStatus.CANCELLED,
				this.managerComments,
				this.createdAt,
				new Date()
			)
		);
	}

	/**
	 * Check if this leave request overlaps with another
	 * Used for preventing double-bookings
	 */
	overlapsWith(other: LeaveRequest): boolean {
		// Only consider pending or approved requests as conflicts
		if (
			(this.status.equals(LeaveStatus.PENDING) || this.status.equals(LeaveStatus.APPROVED)) &&
			(other.status.equals(LeaveStatus.PENDING) || other.status.equals(LeaveStatus.APPROVED))
		) {
			return this.dateRange.overlapsWith(other.dateRange);
		}
		return false;
	}

	/**
	 * Check if this request is for the same employee
	 */
	isForEmployee(employeeId: string): boolean {
		return this.employeeId === employeeId;
	}

	/**
	 * Check if request is in pending state
	 */
	isPending(): boolean {
		return this.status.equals(LeaveStatus.PENDING);
	}

	/**
	 * Check if request is approved
	 */
	isApproved(): boolean {
		return this.status.equals(LeaveStatus.APPROVED);
	}

	/**
	 * Check if request is rejected
	 */
	isRejected(): boolean {
		return this.status.equals(LeaveStatus.REJECTED);
	}

	/**
	 * Check if request is cancelled
	 */
	isCancelled(): boolean {
		return this.status.equals(LeaveStatus.CANCELLED);
	}

	/**
	 * Get number of business days requested
	 */
	getBusinessDays(): number {
		return this.dateRange.businessDays;
	}

	/**
	 * Serialize to DTO for API/UI consumption
	 */
	toDTO(): LeaveRequestDTO {
		return {
			id: this.id,
			employeeId: this.employeeId,
			managerId: this.managerId,
			leaveType: this.leaveType.toString(),
			startDate: this.dateRange.startDate.toISOString().split('T')[0],
			endDate: this.dateRange.endDate.toISOString().split('T')[0],
			businessDays: this.dateRange.businessDays,
			reason: this.reason,
			status: this.status.toString(),
			managerComments: this.managerComments,
			createdAt: this.createdAt.toISOString(),
			updatedAt: this.updatedAt.toISOString()
		};
	}

	/**
	 * String representation for debugging
	 */
	toString(): string {
		return `LeaveRequest(${this.id}, ${this.employeeId}, ${this.status.toString()}, ${this.dateRange.toString()})`;
	}
}
