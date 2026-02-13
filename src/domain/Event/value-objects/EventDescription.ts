import { Result } from '$domain/Result';
import { EventDescriptionValidationError } from '../errors/EventErrors';

const MAX_LENGTH = 2000;

export class EventDescription {
	private constructor(private readonly _value: string) {}

	static create(description: string): Result<EventDescription, EventDescriptionValidationError> {
		const trimmed = description.trim();

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new EventDescriptionValidationError(
					`Event description cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new EventDescription(trimmed));
	}

	get value(): string {
		return this._value;
	}

	equals(other: EventDescription): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
