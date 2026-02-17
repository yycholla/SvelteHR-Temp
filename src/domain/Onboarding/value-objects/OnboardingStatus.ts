import { Result } from '$domain/Result';
import { InvalidAssignmentError } from '../errors/OnboardingErrors';

export type OnboardingStatusValue = 'pending' | 'in_progress' | 'completed' | 'overdue';

const VALID_STATUSES: ReadonlySet<OnboardingStatusValue> = new Set([
	'pending',
	'in_progress',
	'completed',
	'overdue'
]);

export class OnboardingStatus {
	private constructor(private readonly _value: OnboardingStatusValue) {}

	static create(status: string): Result<OnboardingStatus, InvalidAssignmentError> {
		const trimmed = status.trim();

		if (trimmed.length === 0) {
			return Result.error(
				new InvalidAssignmentError(
					`Invalid onboarding status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		if (!VALID_STATUSES.has(trimmed as OnboardingStatusValue)) {
			return Result.error(
				new InvalidAssignmentError(
					`Invalid onboarding status: "${status}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}`
				)
			);
		}

		return Result.ok(new OnboardingStatus(trimmed as OnboardingStatusValue));
	}

	get value(): OnboardingStatusValue {
		return this._value;
	}

	isCompleted(): boolean {
		return this._value === 'completed';
	}

	isOverdue(): boolean {
		return this._value === 'overdue';
	}

	equals(other: OnboardingStatus): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
