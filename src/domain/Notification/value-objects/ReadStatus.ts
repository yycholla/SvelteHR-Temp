import { Result } from '$domain/Result';
import { ReadStatusValidationError } from '../errors/NotificationErrors';

type ReadStatusValue = 'read' | 'unread';

const VALID_STATUSES: ReadonlySet<ReadStatusValue> = new Set(['read', 'unread']);

export class ReadStatus {
	private constructor(private readonly _value: ReadStatusValue) {}

	static create(status: string): Result<ReadStatus, ReadStatusValidationError> {
		const normalized = status.trim().toLowerCase() as ReadStatusValue;

		if (normalized.length === 0) {
			return Result.error(
				new ReadStatusValidationError('Invalid read status: status cannot be empty')
			);
		}

		if (!VALID_STATUSES.has(normalized)) {
			return Result.error(
				new ReadStatusValidationError(
					`Invalid read status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new ReadStatus(normalized));
	}

	isRead(): boolean {
		return this._value === 'read';
	}

	equals(other: ReadStatus): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}

	get value(): ReadStatusValue {
		return this._value;
	}
}
