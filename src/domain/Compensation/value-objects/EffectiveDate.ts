// src/domain/Compensation/value-objects/EffectiveDate.ts
import { Result } from '$domain/Result';
import { InvalidCompensationError } from '../errors';

/**
 * EffectiveDate value object representing when a compensation change takes effect.
 * Validates date format and provides comparison utilities.
 */
export class EffectiveDate {
	private constructor(private readonly props: { date: Date }) {}

	static create(date: Date | string): Result<EffectiveDate, InvalidCompensationError> {
		const parsedDate = typeof date === 'string' ? new Date(date) : new Date(date.getTime());

		if (isNaN(parsedDate.getTime())) {
			return Result.error(
				new InvalidCompensationError('Invalid effective date: must be a valid date', date)
			);
		}

		return Result.ok(new EffectiveDate({ date: parsedDate }));
	}

	get value(): Date {
		// Defensive copy to prevent external mutation
		return new Date(this.props.date.getTime());
	}

	equals(other: EffectiveDate): boolean {
		return this.props.date.getTime() === other.props.date.getTime();
	}

	/**
	 * Checks if this effective date is before another date.
	 */
	isBefore(other: EffectiveDate): boolean {
		return this.props.date.getTime() < other.props.date.getTime();
	}

	/**
	 * Checks if this effective date is after another date.
	 */
	isAfter(other: EffectiveDate): boolean {
		return this.props.date.getTime() > other.props.date.getTime();
	}

	/**
	 * Checks if this effective date is in the past.
	 */
	isPast(): boolean {
		return this.props.date.getTime() < Date.now();
	}

	/**
	 * Checks if this effective date is in the future.
	 */
	isFuture(): boolean {
		return this.props.date.getTime() > Date.now();
	}

	/**
	 * Returns ISO string representation.
	 */
	toISOString(): string {
		return this.props.date.toISOString();
	}
}
