import { Result } from '$domain/Result';
import { NotificationTitleValidationError } from '../errors/NotificationErrors';

const MAX_LENGTH = 200;
const MIN_LENGTH = 1;

export class NotificationTitle {
	private constructor(private readonly _value: string) {}

	static create(title: string): Result<NotificationTitle, NotificationTitleValidationError> {
		const trimmed = title.trim();

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new NotificationTitleValidationError('Invalid notification title: title cannot be empty')
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new NotificationTitleValidationError(
					`Invalid notification title: title cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new NotificationTitle(trimmed));
	}

	equals(other: NotificationTitle): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}

	get value(): string {
		return this._value;
	}

	get length(): number {
		return this._value.length;
	}
}
