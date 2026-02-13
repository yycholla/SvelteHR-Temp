// src/domain/Attendance/WorkHours.ts
import { Result } from '$domain/Result';
import { InvalidWorkHoursError } from '$domain/errors';
import type { ClockInTime } from './ClockInTime';
import type { ClockOutTime } from './ClockOutTime';

const MAX_HOURS = 24;
const FULL_DAY_THRESHOLD = 8;
const HALF_DAY_THRESHOLD = 4;

export class WorkHours {
	private constructor(private readonly _value: number) {}

	static create(hours: number): Result<WorkHours, InvalidWorkHoursError> {
		if (hours < 0) {
			return Result.error(new InvalidWorkHoursError('Work hours cannot be negative', hours));
		}

		if (hours > MAX_HOURS) {
			return Result.error(new InvalidWorkHoursError('Work hours cannot exceed 24', hours));
		}

		return Result.ok(new WorkHours(hours));
	}

	static fromClockTimes(
		clockIn: ClockInTime,
		clockOut: ClockOutTime
	): Result<WorkHours, InvalidWorkHoursError> {
		const milliseconds = clockOut.value.getTime() - clockIn.value.getTime();
		const hours = milliseconds / (1000 * 60 * 60);

		return WorkHours.create(hours);
	}

	get value(): number {
		return this._value;
	}

	get isFullDay(): boolean {
		return this._value >= FULL_DAY_THRESHOLD;
	}

	get isHalfDay(): boolean {
		return this._value >= HALF_DAY_THRESHOLD && this._value < FULL_DAY_THRESHOLD;
	}

	equals(other: WorkHours): boolean {
		return this._value === other._value;
	}

	add(other: WorkHours): Result<WorkHours, InvalidWorkHoursError> {
		return WorkHours.create(this._value + other._value);
	}
}
