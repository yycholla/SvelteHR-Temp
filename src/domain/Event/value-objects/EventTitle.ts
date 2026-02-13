import { Result } from '$domain/Result';
import { EventTitleValidationError } from '../errors/EventErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 200;

export class EventTitle {
	private constructor(private readonly _value: string) {}

	static create(title: string): Result<EventTitle, EventTitleValidationError> {
		const trimmed = title.trim();

		if (trimmed.length === 0) {
			return Result.error(new EventTitleValidationError('Event title cannot be empty'));
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new EventTitleValidationError(
					`Event title cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new EventTitle(trimmed));
	}

	get value(): string {
		return this._value;
	}

	equals(other: EventTitle): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
