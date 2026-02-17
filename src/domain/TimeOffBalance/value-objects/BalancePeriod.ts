// src/domain/TimeOffBalance/value-objects/BalancePeriod.ts
import { Result } from '$domain/Result';
import { BalancePeriodValidationError } from '../errors/TimeOffBalanceErrors';

/**
 * BalancePeriod Value Object
 *
 * Represents the period (year) for which a time off balance is tracked.
 * Immutable value object with business logic for period comparison.
 *
 * @example
 * ```typescript
 * const period = BalancePeriod.create(2024);
 * if (period.isOk) {
 *   console.log(period.value.isCurrent); // true if current year
 * }
 * ```
 */
export class BalancePeriod {
	private static readonly MIN_YEAR = 2000;

	private constructor(private readonly _year: number) {}

	/**
	 * Creates a new BalancePeriod instance.
	 *
	 * @param year - The year (2000 or later, max 10 years in future)
	 * @returns Result containing BalancePeriod or validation error
	 *
	 * @example
	 * ```typescript
	 * const period = BalancePeriod.create(2024);
	 * const invalid = BalancePeriod.create(1999); // Error: before 2000
	 * ```
	 */
	static create(year: number): Result<BalancePeriod, BalancePeriodValidationError> {
		// Validate finite number
		if (!Number.isFinite(year) || !Number.isInteger(year)) {
			return Result.error(new BalancePeriodValidationError('Year must be a valid integer'));
		}

		// Validate minimum year
		if (year < this.MIN_YEAR) {
			return Result.error(
				new BalancePeriodValidationError(`Year must be ${this.MIN_YEAR} or later (got ${year})`)
			);
		}

		// Validate maximum year (not more than 10 years in future)
		const currentYear = new Date().getFullYear();
		const maxYear = currentYear + 10;
		if (year > maxYear) {
			return Result.error(
				new BalancePeriodValidationError(
					`Year cannot be more than 10 years in the future (got ${year}, max ${maxYear})`
				)
			);
		}

		return Result.ok(new BalancePeriod(year));
	}

	/**
	 * The year value.
	 */
	get year(): number {
		return this._year;
	}

	/**
	 * Whether this period represents the current year.
	 */
	get isCurrent(): boolean {
		return this._year === new Date().getFullYear();
	}

	/**
	 * Whether this period is in the past.
	 */
	get isPast(): boolean {
		return this._year < new Date().getFullYear();
	}

	/**
	 * Whether this period is in the future.
	 */
	get isFuture(): boolean {
		return this._year > new Date().getFullYear();
	}

	/**
	 * Checks equality with another BalancePeriod.
	 *
	 * @param other - The other BalancePeriod to compare
	 * @returns True if periods are equal
	 */
	equals(other: BalancePeriod): boolean {
		return this._year === other._year;
	}

	/**
	 * String representation of balance period.
	 */
	toString(): string {
		return `${this._year}`;
	}
}
