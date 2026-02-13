// src/domain/Attendance/LateReason.ts
import { Result } from '$domain/Result';
import { ValidationError } from '$domain/errors';

const MAX_LENGTH = 500;

export class LateReason {
	private constructor(private readonly _value: string | null) {}

	static create(reason: string | null): Result<LateReason, ValidationError> {
		if (reason === null) {
			return Result.ok(new LateReason(null));
		}

		const trimmed = reason.trim();

		// Empty string is allowed
		if (trimmed.length === 0) {
			return Result.ok(new LateReason(''));
		}

		// Validate max length
		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new ValidationError('lateReason', `exceeds maximum length of ${MAX_LENGTH} characters`)
			);
		}

		return Result.ok(new LateReason(trimmed));
	}

	get value(): string | null {
		return this._value;
	}

	get isEmpty(): boolean {
		return this._value === null || this._value.length === 0;
	}

	equals(other: LateReason): boolean {
		return this._value === other._value;
	}
}
