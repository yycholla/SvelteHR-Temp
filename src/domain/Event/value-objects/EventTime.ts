import { Result } from '$domain/Result';
import { EventTimeValidationError } from '../errors/EventErrors';

export class EventTime {
	private constructor(
		private readonly _startTime: Date,
		private readonly _endTime: Date
	) {}

	static create(startTime: Date, endTime: Date): Result<EventTime, EventTimeValidationError> {
		// Defensive copies on input
		const safeStart = new Date(startTime.getTime());
		const safeEnd = new Date(endTime.getTime());

		// Validation: endTime must be >= startTime (equal is allowed for instant events)
		if (safeEnd.getTime() < safeStart.getTime()) {
			return Result.error(
				new EventTimeValidationError('End time must be after or equal to start time')
			);
		}

		return Result.ok(new EventTime(safeStart, safeEnd));
	}

	get startTime(): Date {
		// Defensive copy on output
		return new Date(this._startTime.getTime());
	}

	get endTime(): Date {
		// Defensive copy on output
		return new Date(this._endTime.getTime());
	}

	equals(other: EventTime): boolean {
		return (
			this._startTime.getTime() === other._startTime.getTime() &&
			this._endTime.getTime() === other._endTime.getTime()
		);
	}

	toString(): string {
		return `${this._startTime.toISOString()} - ${this._endTime.toISOString()}`;
	}
}
