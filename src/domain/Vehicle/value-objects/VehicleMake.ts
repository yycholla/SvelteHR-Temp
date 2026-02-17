// src/domain/Vehicle/value-objects/VehicleMake.ts
import { Result } from '$domain/Result';
import { InvalidVehicleError } from '../errors/VehicleErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 50;

/**
 * Value object representing the manufacturer (make) of a vehicle.
 *
 * Invariants:
 * - Must be 1-50 characters (after trimming)
 * - Must not be empty
 *
 * @example
 * ```typescript
 * const makeResult = VehicleMake.create('Toyota');
 * if (makeResult.isOk) {
 *   console.log(makeResult.value.value); // 'Toyota'
 * }
 * ```
 */
export class VehicleMake {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a VehicleMake value object.
	 * @param value - Raw make string (e.g. 'Toyota', 'Honda')
	 * @returns Result containing VehicleMake or InvalidVehicleError
	 */
	static create(value: string): Result<VehicleMake, InvalidVehicleError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidVehicleError('Vehicle make must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidVehicleError('Vehicle make cannot be empty'));
		}

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidVehicleError(`Vehicle make must be at least ${MIN_LENGTH} character(s)`)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidVehicleError(`Vehicle make must be at most ${MAX_LENGTH} characters`)
			);
		}

		return Result.ok(new VehicleMake(trimmed));
	}

	/** The trimmed make value */
	get value(): string {
		return this._value;
	}

	equals(other: VehicleMake): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
