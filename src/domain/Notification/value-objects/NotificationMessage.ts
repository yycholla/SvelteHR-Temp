import { Result } from '$domain/Result';
import { NotificationMessageValidationError } from '../errors/NotificationErrors';

const MAX_LENGTH = 1000;
const MIN_LENGTH = 1;

export class NotificationMessage {
	private constructor(private readonly _value: string) {}

	static create(message: string): Result<NotificationMessage, NotificationMessageValidationError> {
		const trimmed = message.trim();

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new NotificationMessageValidationError(
					'Invalid notification message: message cannot be empty'
				)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new NotificationMessageValidationError(
					`Invalid notification message: message cannot exceed ${MAX_LENGTH} characters (got ${trimmed.length})`
				)
			);
		}

		return Result.ok(new NotificationMessage(trimmed));
	}

	equals(other: NotificationMessage): boolean {
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
