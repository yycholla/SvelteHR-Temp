import { Result } from '$domain/Result';
import { NotificationCategoryValidationError } from '../errors/NotificationErrors';

type NotificationCategoryValue = 'general' | 'task' | 'leave' | 'performance';

const VALID_CATEGORIES: ReadonlySet<NotificationCategoryValue> = new Set([
	'general',
	'task',
	'leave',
	'performance'
]);

export class NotificationCategory {
	private constructor(private readonly _value: NotificationCategoryValue) {}

	static create(
		category: string
	): Result<NotificationCategory, NotificationCategoryValidationError> {
		const normalized = category.trim().toLowerCase() as NotificationCategoryValue;

		if (normalized.length === 0) {
			return Result.error(
				new NotificationCategoryValidationError(
					'Invalid notification category: category cannot be empty'
				)
			);
		}

		if (!VALID_CATEGORIES.has(normalized)) {
			return Result.error(
				new NotificationCategoryValidationError(
					`Invalid notification category: "${category}". Must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}`
				)
			);
		}

		return Result.ok(new NotificationCategory(normalized));
	}

	equals(other: NotificationCategory): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}

	get value(): NotificationCategoryValue {
		return this._value;
	}
}
