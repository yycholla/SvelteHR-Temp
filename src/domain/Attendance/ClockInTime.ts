// src/domain/Attendance/ClockInTime.ts
import { Result } from '$domain/Result';
import { InvalidClockTimeError } from '$domain/errors';

export class ClockInTime {
	private constructor(private readonly _value: Date) {}

	static create(time: Date | string): Result<ClockInTime, InvalidClockTimeError> {
		// Parse to Date if string
		const date = typeof time === 'string' ? new Date(time) : time;

		// Validate timestamp
		if (isNaN(date.getTime())) {
			return Result.error(new InvalidClockTimeError('Invalid timestamp'));
		}

		// Create with defensive copy
		return Result.ok(new ClockInTime(new Date(date.getTime())));
	}

	get value(): Date {
		// Return defensive copy to maintain immutability
		return new Date(this._value.getTime());
	}

	equals(other: ClockInTime): boolean {
		return this._value.getTime() === other._value.getTime();
	}

	isBefore(other: ClockInTime): boolean {
		return this._value.getTime() < other._value.getTime();
	}

	toISOString(): string {
		return this._value.toISOString();
	}
}
