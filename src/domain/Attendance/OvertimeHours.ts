// src/domain/Attendance/OvertimeHours.ts
import { Result } from '$domain/Result';
import { InvalidOvertimeHoursError } from '$domain/errors';
import type { WorkHours } from './WorkHours';

const MAX_OVERTIME_HOURS = 12;

export class OvertimeHours {
	private constructor(private readonly _value: number) {}

	static create(hours: number): Result<OvertimeHours, InvalidOvertimeHoursError> {
		if (hours < 0) {
			return Result.error(
				new InvalidOvertimeHoursError('Overtime hours cannot be negative', hours)
			);
		}

		if (hours > MAX_OVERTIME_HOURS) {
			return Result.error(new InvalidOvertimeHoursError('Overtime hours cannot exceed 12', hours));
		}

		return Result.ok(new OvertimeHours(hours));
	}

	static fromWorkHours(
		workHours: WorkHours,
		standardHours: number = 8
	): Result<OvertimeHours, InvalidOvertimeHoursError> {
		const overtime = Math.max(0, workHours.value - standardHours);
		return OvertimeHours.create(overtime);
	}

	get value(): number {
		return this._value;
	}

	get hasOvertime(): boolean {
		return this._value > 0;
	}

	equals(other: OvertimeHours): boolean {
		return this._value === other._value;
	}

	add(other: OvertimeHours): Result<OvertimeHours, InvalidOvertimeHoursError> {
		return OvertimeHours.create(this._value + other._value);
	}
}
