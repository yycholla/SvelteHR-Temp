// src/domain/Vehicle/value-objects/VehicleYear.ts
import { Result } from '$domain/Result';
import { InvalidVehicleError } from '../errors/VehicleErrors';

const MIN_YEAR = 1900;
const VINTAGE_THRESHOLD = 1980;

/**
 * Value object representing the manufacturing year of a vehicle.
 *
 * Invariants:
 * - Must be an integer
 * - Must be between 1900 and the current year + 1 (to allow next-year models)
 *
 * @example
 * ```typescript
 * const yearResult = VehicleYear.create(2023);
 * if (yearResult.isOk) {
 *   console.log(yearResult.value.value); // 2023
 *   console.log(yearResult.value.isVintage()); // false
 * }
 * ```
 */
export class VehicleYear {
	private constructor(private readonly _value: number) {}

	/**
	 * Create a VehicleYear value object.
	 * @param value - Year as a number (e.g. 2023)
	 * @returns Result containing VehicleYear or InvalidVehicleError
	 */
	static create(value: unknown): Result<VehicleYear, InvalidVehicleError> {
		if (typeof value !== 'number' && typeof value !== 'string') {
			return Result.error(new InvalidVehicleError('Vehicle year must be a number'));
		}

		const parsed = typeof value === 'string' ? parseInt(value, 10) : value;

		if (!Number.isFinite(parsed) || isNaN(parsed)) {
			return Result.error(new InvalidVehicleError('Vehicle year must be a valid number'));
		}

		if (!Number.isInteger(parsed)) {
			return Result.error(new InvalidVehicleError('Vehicle year must be an integer'));
		}

		const maxYear = new Date().getFullYear() + 1;

		if (parsed < MIN_YEAR) {
			return Result.error(
				new InvalidVehicleError(`Vehicle year must be at least ${MIN_YEAR}`)
			);
		}

		if (parsed > maxYear) {
			return Result.error(
				new InvalidVehicleError(`Vehicle year must be at most ${maxYear}`)
			);
		}

		return Result.ok(new VehicleYear(parsed));
	}

	/** The year value as a number */
	get value(): number {
		return this._value;
	}

	/**
	 * Returns true if the vehicle year predates 1980 (considered vintage).
	 */
	isVintage(): boolean {
		return this._value < VINTAGE_THRESHOLD;
	}

	equals(other: VehicleYear): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value.toString();
	}
}
