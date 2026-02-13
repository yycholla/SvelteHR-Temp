import { Result } from '$domain/Result';
import { EventTypeValidationError } from '../errors/EventErrors';

export type EventTypeValue =
	| 'meeting'
	| 'training'
	| 'review'
	| 'social'
	| 'holiday'
	| 'time_off'
	| 'other';

const VALID_TYPES: ReadonlySet<EventTypeValue> = new Set([
	'meeting',
	'training',
	'review',
	'social',
	'holiday',
	'time_off',
	'other'
]);

export class EventType {
	private constructor(private readonly _value: EventTypeValue) {}

	static create(type: string): Result<EventType, EventTypeValidationError> {
		// Normalize: trim, lowercase, convert kebab-case to snake_case
		const normalized = type.trim().toLowerCase().replace(/-/g, '_');

		if (normalized.length === 0) {
			return Result.error(new EventTypeValidationError('Event type cannot be empty'));
		}

		if (!VALID_TYPES.has(normalized as EventTypeValue)) {
			return Result.error(
				new EventTypeValidationError(
					`Invalid type: "${type}". Must be one of: ${Array.from(VALID_TYPES).join(', ')}`
				)
			);
		}

		return Result.ok(new EventType(normalized as EventTypeValue));
	}

	get value(): EventTypeValue {
		return this._value;
	}

	equals(other: EventType): boolean {
		return this._value === other._value;
	}

	isMeeting(): boolean {
		return this._value === 'meeting';
	}

	isTraining(): boolean {
		return this._value === 'training';
	}

	isReview(): boolean {
		return this._value === 'review';
	}

	isSocial(): boolean {
		return this._value === 'social';
	}

	isHoliday(): boolean {
		return this._value === 'holiday';
	}

	isTimeOff(): boolean {
		return this._value === 'time_off';
	}

	isOther(): boolean {
		return this._value === 'other';
	}

	toString(): string {
		return this._value;
	}
}
