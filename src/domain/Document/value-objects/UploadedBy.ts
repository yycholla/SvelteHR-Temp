import { Result } from '$domain/Result';
import { UploadedByValidationError } from '../errors/DocumentErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UploadedBy {
	private constructor(private readonly _value: string) {}

	static create(userId: string): Result<UploadedBy, UploadedByValidationError> {
		const normalized = userId.trim().toLowerCase();

		if (normalized.length === 0) {
			return Result.error(new UploadedByValidationError('Uploaded by user ID cannot be empty'));
		}

		if (!UUID_REGEX.test(normalized)) {
			return Result.error(
				new UploadedByValidationError(`Invalid UUID format for user ID: "${userId}"`)
			);
		}

		return Result.ok(new UploadedBy(normalized));
	}

	get value(): string {
		return this._value;
	}

	equals(other: UploadedBy): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
