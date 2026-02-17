// src/domain/Vehicle/value-objects/LicensePlate.ts
import { Result } from '$domain/Result';
import { InvalidVehicleError } from '../errors/VehicleErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 20;

// Allows alphanumeric characters, dashes, and spaces
const VALID_PLATE_PATTERN = /^[A-Z0-9][A-Z0-9\s\-]*$/i;

/**
 * Value object representing a vehicle license plate.
 *
 * Invariants:
 * - Must be 1-20 characters (after trimming)
 * - Must not be empty
 * - Must only contain alphanumeric characters, dashes, and spaces
 *
 * @example
 * ```typescript
 * const plateResult = LicensePlate.create('ABC-1234');
 * if (plateResult.isOk) {
 *   console.log(plateResult.value.value); // 'ABC-1234'
 * }
 * ```
 */
export class LicensePlate {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a LicensePlate value object.
	 * @param value - Raw license plate string (e.g. 'ABC-1234', 'XYZ 567')
	 * @returns Result containing LicensePlate or InvalidVehicleError
	 */
	static create(value: string): Result<LicensePlate, InvalidVehicleError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidVehicleError('License plate must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidVehicleError('License plate cannot be empty'));
		}

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidVehicleError(`License plate must be at least ${MIN_LENGTH} character(s)`)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidVehicleError(`License plate must be at most ${MAX_LENGTH} characters`)
			);
		}

		if (!VALID_PLATE_PATTERN.test(trimmed)) {
			return Result.error(
				new InvalidVehicleError(
					'License plate contains invalid characters. Only alphanumeric characters, dashes, and spaces are allowed'
				)
			);
		}

		return Result.ok(new LicensePlate(trimmed));
	}

	/** The trimmed license plate value */
	get value(): string {
		return this._value;
	}

	equals(other: LicensePlate): boolean {
		return this._value.toUpperCase() === other._value.toUpperCase();
	}

	toString(): string {
		return this._value;
	}
}
