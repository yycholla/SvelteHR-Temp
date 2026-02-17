// src/domain/Compliance/value-objects/ReviewDate.ts
import { Result } from '$domain/Result';
import { InvalidComplianceError } from '../errors/ComplianceErrors';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Value object representing a compliance review date.
 *
 * Rules:
 * - Must be a valid date (not NaN)
 * - Defensive copies prevent external mutation
 *
 * Provides business logic via:
 * - isPast(): returns true if date is before today
 * - daysUntil(): returns number of days until review (negative if past)
 */
export class ReviewDate {
	private constructor(private readonly _value: Date) {}

	/**
	 * Create a ReviewDate value object.
	 * @param value - Date instance or ISO string
	 * @returns Result containing ReviewDate or InvalidComplianceError
	 */
	static create(value: Date | string): Result<ReviewDate, InvalidComplianceError> {
		const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

		if (isNaN(date.getTime())) {
			return Result.error(
				new InvalidComplianceError(
					`Invalid review date: "${String(value)}". Must be a valid date.`
				)
			);
		}

		return Result.ok(new ReviewDate(date));
	}

	/** Defensive copy of the underlying date */
	get value(): Date {
		return new Date(this._value.getTime());
	}

	/**
	 * Returns true if the review date is in the past (before today).
	 */
	isPast(): boolean {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const reviewDay = new Date(this._value.getTime());
		reviewDay.setHours(0, 0, 0, 0);
		return reviewDay < today;
	}

	/**
	 * Returns the number of days until the review date.
	 * Negative values indicate the date has passed.
	 */
	daysUntil(): number {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const reviewDay = new Date(this._value.getTime());
		reviewDay.setHours(0, 0, 0, 0);
		const diffMs = reviewDay.getTime() - today.getTime();
		return Math.round(diffMs / MS_PER_DAY);
	}

	equals(other: ReviewDate): boolean {
		return this._value.getTime() === other._value.getTime();
	}

	toString(): string {
		return this._value.toISOString();
	}
}
