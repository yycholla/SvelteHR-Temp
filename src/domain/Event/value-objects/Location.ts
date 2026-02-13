import { Result } from '$domain/Result';
import { LocationValidationError } from '../errors/EventErrors';

const MAX_LENGTH = 500;

export class Location {
	private constructor(private readonly _value: string) {}

	static create(location: string): Result<Location, LocationValidationError> {
		const trimmed = location.trim();

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new LocationValidationError(
					`Location cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new Location(trimmed));
	}

	get value(): string {
		return this._value;
	}

	equals(other: Location): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
