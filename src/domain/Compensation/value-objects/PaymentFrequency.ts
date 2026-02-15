// src/domain/Compensation/value-objects/PaymentFrequency.ts
import { Result } from '$domain/Result';
import { InvalidCompensationError } from '../errors';

export type PaymentFrequencyValue = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'annually';

const VALID_FREQUENCIES: ReadonlySet<PaymentFrequencyValue> = new Set([
	'weekly',
	'biweekly',
	'semimonthly',
	'monthly',
	'annually'
]);

const PERIODS_PER_YEAR: ReadonlyMap<PaymentFrequencyValue, number> = new Map([
	['weekly', 52],
	['biweekly', 26],
	['semimonthly', 24],
	['monthly', 12],
	['annually', 1]
]);

/**
 * PaymentFrequency value object representing how often compensation is paid.
 * Provides conversion utilities for annualization calculations.
 */
export class PaymentFrequency {
	private constructor(private readonly _value: PaymentFrequencyValue) {}

	static create(frequency: string): Result<PaymentFrequency, InvalidCompensationError> {
		const normalizedFrequency = frequency.trim().toLowerCase() as PaymentFrequencyValue;

		if (!VALID_FREQUENCIES.has(normalizedFrequency)) {
			return Result.error(
				new InvalidCompensationError(
					`Invalid payment frequency: ${frequency}. Must be one of: weekly, biweekly, semimonthly, monthly, annually`,
					frequency
				)
			);
		}

		return Result.ok(new PaymentFrequency(normalizedFrequency));
	}

	get value(): PaymentFrequencyValue {
		return this._value;
	}

	equals(other: PaymentFrequency): boolean {
		return this._value === other._value;
	}

	/**
	 * Returns the number of pay periods per year.
	 */
	getPeriodsPerYear(): number {
		return PERIODS_PER_YEAR.get(this._value)!;
	}

	/**
	 * Converts a per-period amount to annual amount.
	 */
	toAnnual(perPeriodAmount: number): number {
		return perPeriodAmount * this.getPeriodsPerYear();
	}

	/**
	 * Converts an annual amount to per-period amount.
	 */
	fromAnnual(annualAmount: number): number {
		return annualAmount / this.getPeriodsPerYear();
	}
}
