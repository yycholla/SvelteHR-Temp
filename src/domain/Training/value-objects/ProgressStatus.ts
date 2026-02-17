import { Result } from '$domain/Result';
import { InvalidAssignmentError } from '../errors/TrainingErrors';

export type ProgressStatusValue = 'not_started' | 'in_progress' | 'completed';

const VALID_STATUSES: ReadonlySet<ProgressStatusValue> = new Set([
	'not_started',
	'in_progress',
	'completed'
]);

export class ProgressStatus {
	private constructor(private readonly _value: ProgressStatusValue) {}

	static create(status: string): Result<ProgressStatus, InvalidAssignmentError> {
		const trimmed = status.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidAssignmentError(
					`Invalid progress status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		if (!VALID_STATUSES.has(trimmed as ProgressStatusValue)) {
			return Result.error(
				new InvalidAssignmentError(
					`Invalid progress status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new ProgressStatus(trimmed as ProgressStatusValue));
	}

	get value(): ProgressStatusValue {
		return this._value;
	}

	isCompleted(): boolean {
		return this._value === 'completed';
	}

	isStarted(): boolean {
		return this._value !== 'not_started';
	}

	equals(other: ProgressStatus): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
