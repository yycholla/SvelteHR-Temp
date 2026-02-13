import { Result } from '$domain/Result';
import { NotificationPriorityValidationError } from '../errors/NotificationErrors';

type NotificationPriorityValue = 'low' | 'normal' | 'high' | 'urgent';

const VALID_PRIORITIES: ReadonlySet<NotificationPriorityValue> = new Set([
	'low',
	'normal',
	'high',
	'urgent'
]);

const HIGH_PRIORITIES: ReadonlySet<NotificationPriorityValue> = new Set(['high', 'urgent']);

export class NotificationPriority {
	private constructor(private readonly _value: NotificationPriorityValue) {}

	static create(
		priority: string
	): Result<NotificationPriority, NotificationPriorityValidationError> {
		const normalized = priority.trim().toLowerCase() as NotificationPriorityValue;

		if (normalized.length === 0) {
			return Result.error(
				new NotificationPriorityValidationError(
					'Invalid notification priority: priority cannot be empty'
				)
			);
		}

		if (!VALID_PRIORITIES.has(normalized)) {
			return Result.error(
				new NotificationPriorityValidationError(
					`Invalid notification priority: "${priority}". Must be one of: ${Array.from(VALID_PRIORITIES).join(', ')}`
				)
			);
		}

		return Result.ok(new NotificationPriority(normalized));
	}

	isHighPriority(): boolean {
		return HIGH_PRIORITIES.has(this._value);
	}

	equals(other: NotificationPriority): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}

	get value(): NotificationPriorityValue {
		return this._value;
	}
}
