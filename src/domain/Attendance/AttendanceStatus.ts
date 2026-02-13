// src/domain/Attendance/AttendanceStatus.ts
import { Result } from '$domain/Result';
import { InvalidAttendanceStatusError } from '$domain/errors';

type AttendanceStatusValue = 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';

const VALID_STATUSES: ReadonlySet<string> = new Set([
	'present',
	'absent',
	'late',
	'half_day',
	'on_leave'
]);

export class AttendanceStatus {
	private constructor(private readonly _value: AttendanceStatusValue) {}

	static create(value: string): Result<AttendanceStatus, InvalidAttendanceStatusError> {
		if (!VALID_STATUSES.has(value)) {
			return Result.error(new InvalidAttendanceStatusError(value));
		}

		return Result.ok(new AttendanceStatus(value as AttendanceStatusValue));
	}

	get value(): AttendanceStatusValue {
		return this._value;
	}

	get isPresent(): boolean {
		return this._value === 'present';
	}

	get isAbsent(): boolean {
		return this._value === 'absent';
	}

	get requiresAction(): boolean {
		return this._value === 'late' || this._value === 'absent';
	}

	equals(other: AttendanceStatus): boolean {
		return this._value === other._value;
	}
}
