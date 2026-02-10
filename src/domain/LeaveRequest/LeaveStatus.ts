import { Result, DomainError } from '$domain';
import { InvalidLeaveStatusError } from './errors';

export class LeaveStatus {
	private constructor(private readonly value: string) {}

	static readonly PENDING = new LeaveStatus('pending');
	static readonly APPROVED = new LeaveStatus('approved');
	static readonly REJECTED = new LeaveStatus('rejected');
	static readonly CANCELLED = new LeaveStatus('cancelled');

	canTransitionTo(newStatus: LeaveStatus): boolean {
		const transitions: Record<string, string[]> = {
			pending: ['approved', 'rejected', 'cancelled'],
			approved: ['cancelled'],
			rejected: [],
			cancelled: []
		};

		return transitions[this.value]?.includes(newStatus.value) || false;
	}

	toString(): string {
		return this.value;
	}

	equals(other: LeaveStatus): boolean {
		return this.value === other.value;
	}

	static fromString(str: string): Result<LeaveStatus, DomainError> {
		const normalized = str.toLowerCase();

		switch (normalized) {
			case 'pending':
				return Result.ok(LeaveStatus.PENDING);
			case 'approved':
				return Result.ok(LeaveStatus.APPROVED);
			case 'rejected':
				return Result.ok(LeaveStatus.REJECTED);
			case 'cancelled':
				return Result.ok(LeaveStatus.CANCELLED);
			default:
				return Result.error(new InvalidLeaveStatusError(str));
		}
	}
}
