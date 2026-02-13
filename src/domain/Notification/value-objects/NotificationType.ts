import { Result } from '$domain/Result';
import { NotificationTypeValidationError } from '../errors/NotificationErrors';

type NotificationTypeValue =
	| 'info'
	| 'warning'
	| 'success'
	| 'error'
	| 'task_assigned'
	| 'task_completed'
	| 'leave_approved'
	| 'leave_rejected'
	| 'review_scheduled'
	| 'event_reminder';

const VALID_TYPES: ReadonlySet<NotificationTypeValue> = new Set([
	'info',
	'warning',
	'success',
	'error',
	'task_assigned',
	'task_completed',
	'leave_approved',
	'leave_rejected',
	'review_scheduled',
	'event_reminder'
]);

const SYSTEM_TYPES: ReadonlySet<NotificationTypeValue> = new Set([
	'info',
	'warning',
	'success',
	'error'
]);

export class NotificationType {
	private constructor(private readonly _value: NotificationTypeValue) {}

	static create(type: string): Result<NotificationType, NotificationTypeValidationError> {
		const normalized = type.trim().toLowerCase() as NotificationTypeValue;

		if (normalized.length === 0) {
			return Result.error(
				new NotificationTypeValidationError(
					`Invalid notification type: "${type}". Must be one of: ${Array.from(VALID_TYPES).join(', ')}`
				)
			);
		}

		if (!VALID_TYPES.has(normalized)) {
			return Result.error(
				new NotificationTypeValidationError(
					`Invalid notification type: "${type}". Must be one of: ${Array.from(VALID_TYPES).join(', ')}`
				)
			);
		}

		return Result.ok(new NotificationType(normalized));
	}

	get value(): NotificationTypeValue {
		return this._value;
	}

	isSystemType(): boolean {
		return SYSTEM_TYPES.has(this._value);
	}

	equals(other: NotificationType): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
