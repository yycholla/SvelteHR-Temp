// src/domain/TimeOffBalance/value-objects/AccrualRate.ts
import { Result } from '$domain/Result';
import { AccrualRateValidationError } from '../errors/TimeOffBalanceErrors';

/**
 * Valid accrual period values.
 */
export type AccrualPeriod = 'biweek' | 'month' | 'year';

/**
 * AccrualRate Value Object
 *
 * Represents the rate at which time off hours accrue per period.
 * Immutable value object with annual conversion logic.
 *
 * @example
 * ```typescript
 * const rate = AccrualRate.create(10, 'month');
 * if (rate.isOk) {
 *   console.log(rate.value.toAnnual()); // 120 hours/year
 * }
 * ```
 */
export class AccrualRate {
	private static readonly MAX_HOURS_PER_PERIOD: ReadonlyMap<AccrualPeriod, number> = new Map([
		['biweek', 40],
		['month', 40],
		['year', 2080]
	]);
	private static readonly PERIODS_PER_YEAR: ReadonlyMap<AccrualPeriod, number> = new Map([
		['biweek', 26],
		['month', 12],
		['year', 1]
	]);

	private static readonly VALID_PERIODS: ReadonlySet<string> = new Set(['biweek', 'month', 'year']);

	private constructor(
		private readonly _hoursPerPeriod: number,
		private readonly _period: AccrualPeriod
	) {}

	/**
	 * Creates a new AccrualRate instance.
	 *
	 * @param hoursPerPeriod - Hours accrued per period (0-40)
	 * @param period - The accrual period
	 * @returns Result containing AccrualRate or validation error
	 *
	 * @example
	 * ```typescript
	 * const rate = AccrualRate.create(10, 'month');
	 * const invalid = AccrualRate.create(-5, 'month'); // Error
	 * ```
	 */
	static create(
		hoursPerPeriod: number,
		period: AccrualPeriod
	): Result<AccrualRate, AccrualRateValidationError> {
		// Validate finite number
		if (!Number.isFinite(hoursPerPeriod)) {
			return Result.error(
				new AccrualRateValidationError('Accrual rate hours must be a valid number')
			);
		}

		// Validate non-negative
		if (hoursPerPeriod < 0) {
			return Result.error(new AccrualRateValidationError('Accrual rate hours cannot be negative'));
		}

		// Validate period before using for max lookup
		if (!this.VALID_PERIODS.has(period)) {
			return Result.error(
				new AccrualRateValidationError(
					`Invalid period: "${period}". Must be one of: ${Array.from(this.VALID_PERIODS).join(', ')}`
				)
			);
		}

		// Validate maximum (period-specific)
		const maxHours = this.MAX_HOURS_PER_PERIOD.get(period)!;
		if (hoursPerPeriod > maxHours) {
			return Result.error(
				new AccrualRateValidationError(
					`Accrual rate hours cannot exceed ${maxHours} per period (got ${hoursPerPeriod})`
				)
			);
		}

		return Result.ok(new AccrualRate(hoursPerPeriod, period));
	}

	/**
	 * Hours accrued per period.
	 */
	get hoursPerPeriod(): number {
		return this._hoursPerPeriod;
	}

	/**
	 * The accrual period.
	 */
	get period(): AccrualPeriod {
		return this._period;
	}

	/**
	 * Converts this accrual rate to annual hours.
	 *
	 * @returns Total hours accrued per year
	 *
	 * @example
	 * ```typescript
	 * const rate = AccrualRate.create(10, 'month').value;
	 * rate.toAnnual(); // 120 hours/year
	 * ```
	 */
	toAnnual(): number {
		const periodsPerYear = AccrualRate.PERIODS_PER_YEAR.get(this._period)!;
		return this._hoursPerPeriod * periodsPerYear;
	}

	/**
	 * Checks equality with another AccrualRate.
	 *
	 * @param other - The other AccrualRate to compare
	 * @returns True if rates are equal
	 */
	equals(other: AccrualRate): boolean {
		return this._hoursPerPeriod === other._hoursPerPeriod && this._period === other._period;
	}

	/**
	 * String representation of accrual rate.
	 */
	toString(): string {
		return `${this._hoursPerPeriod} hours per ${this._period}`;
	}
}
