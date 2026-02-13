// src/domain/Attendance/ClockOutTime.ts
import { Result } from '$domain/Result';
import { InvalidClockTimeError } from '$domain/errors';
import type { ClockInTime } from './ClockInTime';

export class ClockOutTime {
	private constructor(private readonly _value: Date) {}

	static create(
		time: Date | string,
		clockInTime: ClockInTime
	): Result<ClockOutTime, InvalidClockTimeError> {
		// Parse to Date if string
		const date = typeof time === 'string' ? new Date(time) : time;

		// Validate timestamp
		if (isNaN(date.getTime())) {
			return Result.error(new InvalidClockTimeError('Invalid timestamp'));
		}

		// Validate that clock out is after clock in
		if (date.getTime() <= clockInTime.value.getTime()) {
			return Result.error(new InvalidClockTimeError('Clock out time must be after clock in time'));
		}

		// Create with defensive copy
		return Result.ok(new ClockOutTime(new Date(date.getTime())));
	}

	get value(): Date {
		// Return defensive copy to maintain immutability
		return new Date(this._value.getTime());
	}

	equals(other: ClockOutTime): boolean {
		return this._value.getTime() === other._value.getTime();
	}

	isAfter(other: ClockOutTime): boolean {
		return this._value.getTime() > other._value.getTime();
	}

	toISOString(): string {
		return this._value.toISOString();
	}
}
