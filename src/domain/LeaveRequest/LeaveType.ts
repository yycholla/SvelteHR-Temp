import { Result, DomainError } from '$domain';
import { InvalidLeaveTypeError } from './errors';

export class LeaveType {
	private constructor(
		public readonly id: string,
		public readonly name: string,
		public readonly requiresApproval: boolean
	) {}

	static VACATION = new LeaveType('vacation', 'Vacation', true);
	static SICK = new LeaveType('sick', 'Sick Leave', false); // Auto-approved
	static PERSONAL = new LeaveType('personal', 'Personal Leave', true);
	static BEREAVEMENT = new LeaveType('bereavement', 'Bereavement', true);
	static UNPAID = new LeaveType('unpaid', 'Unpaid Leave', true);

	static fromString(str: string): Result<LeaveType, DomainError> {
		const normalized = str.toLowerCase().trim();

		switch (normalized) {
			case 'vacation':
				return Result.ok(LeaveType.VACATION);
			case 'sick':
			case 'sick leave':
				return Result.ok(LeaveType.SICK);
			case 'personal':
			case 'personal leave':
				return Result.ok(LeaveType.PERSONAL);
			case 'bereavement':
				return Result.ok(LeaveType.BEREAVEMENT);
			case 'unpaid':
			case 'unpaid leave':
				return Result.ok(LeaveType.UNPAID);
			default:
				return Result.error(new InvalidLeaveTypeError(str));
		}
	}

	toString(): string {
		return this.name;
	}

	equals(other: LeaveType): boolean {
		return this.id === other.id;
	}
}
