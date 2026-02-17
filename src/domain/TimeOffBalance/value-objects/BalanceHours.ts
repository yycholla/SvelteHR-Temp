// src/domain/TimeOffBalance/value-objects/BalanceHours.ts
import { Result } from '$domain/Result';
import { BalanceHoursValidationError } from '../errors/TimeOffBalanceErrors';

/**
 * BalanceHours Value Object
 *
 * Represents hours in a time off balance (0-1000 hours).
 * Immutable value object with business logic for hours arithmetic.
 *
 * @example
 * ```typescript
 * const hours = BalanceHours.create(40);
 * if (hours.isOk) {
 *   console.log(hours.value.value); // 40
 *   console.log(hours.value.isZero); // false
 * }
 * ```
 */
export class BalanceHours {
	private static readonly MAX_HOURS = 1000;

	private constructor(private readonly _value: number) {}

	/**
	 * Creates a new BalanceHours instance.
	 *
	 * @param hours - Number of hours (0-1000)
	 * @returns Result containing BalanceHours or validation error
	 *
	 * @example
	 * ```typescript
	 * const hours = BalanceHours.create(40);
	 * const invalid = BalanceHours.create(-5); // Error: cannot be negative
	 * ```
	 */
	static create(hours: number): Result<BalanceHours, BalanceHoursValidationError> {
		// Validate finite number
		if (!Number.isFinite(hours)) {
			return Result.error(new BalanceHoursValidationError('Balance hours must be a valid number'));
		}

		// Validate non-negative
		if (hours < 0) {
			return Result.error(new BalanceHoursValidationError('Balance hours cannot be negative'));
		}

		// Validate maximum
		if (hours > this.MAX_HOURS) {
			return Result.error(
				new BalanceHoursValidationError(
					`Balance hours cannot exceed ${this.MAX_HOURS} (got ${hours})`
				)
			);
		}

		return Result.ok(new BalanceHours(hours));
	}

	/**
	 * The raw hours value.
	 */
	get value(): number {
		return this._value;
	}

	/**
	 * Whether the balance is zero hours.
	 */
	get isZero(): boolean {
		return this._value === 0;
	}

	/**
	 * Checks if this balance is sufficient to cover the requested hours.
	 *
	 * @param requested - The requested hours
	 * @returns True if balance >= requested
	 *
	 * @example
	 * ```typescript
	 * const balance = BalanceHours.create(40).value;
	 * const request = BalanceHours.create(30).value;
	 * balance.isSufficient(request); // true
	 * ```
	 */
	isSufficient(requested: BalanceHours): boolean {
		return this._value >= requested._value;
	}

	/**
	 * Adds hours to this balance.
	 *
	 * @param other - Hours to add
	 * @returns Result containing new BalanceHours or validation error
	 *
	 * @example
	 * ```typescript
	 * const hours1 = BalanceHours.create(40).value;
	 * const hours2 = BalanceHours.create(20).value;
	 * const sum = hours1.add(hours2); // 60 hours
	 * ```
	 */
	add(other: BalanceHours): Result<BalanceHours, BalanceHoursValidationError> {
		return BalanceHours.create(this._value + other._value);
	}

	/**
	 * Subtracts hours from this balance.
	 *
	 * @param other - Hours to subtract
	 * @returns Result containing new BalanceHours or validation error
	 *
	 * @example
	 * ```typescript
	 * const hours1 = BalanceHours.create(40).value;
	 * const hours2 = BalanceHours.create(20).value;
	 * const diff = hours1.subtract(hours2); // 20 hours
	 * ```
	 */
	subtract(other: BalanceHours): Result<BalanceHours, BalanceHoursValidationError> {
		return BalanceHours.create(this._value - other._value);
	}

	/**
	 * Checks equality with another BalanceHours.
	 *
	 * @param other - The other BalanceHours to compare
	 * @returns True if hours are equal
	 */
	equals(other: BalanceHours): boolean {
		return this._value === other._value;
	}

	/**
	 * String representation of hours.
	 */
	toString(): string {
		return `${this._value} hours`;
	}
}
