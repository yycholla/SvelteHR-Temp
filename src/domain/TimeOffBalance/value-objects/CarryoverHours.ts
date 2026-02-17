// src/domain/TimeOffBalance/value-objects/CarryoverHours.ts
import { Result } from '$domain/Result';
import { CarryoverHoursValidationError } from '../errors/TimeOffBalanceErrors';

/**
 * CarryoverHours Value Object
 *
 * Represents hours carried over from a previous period to the current balance (0-1000 hours).
 * Immutable value object tracking carryover amounts specifically.
 *
 * @example
 * ```typescript
 * const carryover = CarryoverHours.create(40);
 * if (carryover.isOk) {
 *   console.log(carryover.value.value); // 40
 *   console.log(carryover.value.isZero); // false
 * }
 * ```
 */
export class CarryoverHours {
	private static readonly MAX_HOURS = 1000;

	private constructor(private readonly _value: number) {}

	/**
	 * Creates a new CarryoverHours instance.
	 *
	 * @param hours - Number of carryover hours (0-1000)
	 * @returns Result containing CarryoverHours or validation error
	 *
	 * @example
	 * ```typescript
	 * const carryover = CarryoverHours.create(40);
	 * const invalid = CarryoverHours.create(-5); // Error: cannot be negative
	 * ```
	 */
	static create(hours: number): Result<CarryoverHours, CarryoverHoursValidationError> {
		// Validate finite number
		if (!Number.isFinite(hours)) {
			return Result.error(
				new CarryoverHoursValidationError('Carryover hours must be a valid number')
			);
		}

		// Validate non-negative
		if (hours < 0) {
			return Result.error(new CarryoverHoursValidationError('Carryover hours cannot be negative'));
		}

		// Validate maximum
		if (hours > this.MAX_HOURS) {
			return Result.error(
				new CarryoverHoursValidationError(
					`Carryover hours cannot exceed ${this.MAX_HOURS} (got ${hours})`
				)
			);
		}

		return Result.ok(new CarryoverHours(hours));
	}

	/**
	 * The raw carryover hours value.
	 */
	get value(): number {
		return this._value;
	}

	/**
	 * Whether the carryover is zero hours.
	 */
	get isZero(): boolean {
		return this._value === 0;
	}

	/**
	 * Checks equality with another CarryoverHours.
	 *
	 * @param other - The other CarryoverHours to compare
	 * @returns True if hours are equal
	 */
	equals(other: CarryoverHours): boolean {
		return this._value === other._value;
	}

	/**
	 * String representation of carryover hours.
	 */
	toString(): string {
		return `${this._value} hours`;
	}
}
