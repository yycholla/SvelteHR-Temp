// src/domain/Vehicle/value-objects/VehicleModel.ts
import { Result } from '$domain/Result';
import { InvalidVehicleError } from '../errors/VehicleErrors';

const MIN_LENGTH = 1;
const MAX_LENGTH = 50;

/**
 * Value object representing the model of a vehicle.
 *
 * Invariants:
 * - Must be 1-50 characters (after trimming)
 * - Must not be empty
 *
 * @example
 * ```typescript
 * const modelResult = VehicleModel.create('Camry');
 * if (modelResult.isOk) {
 *   console.log(modelResult.value.value); // 'Camry'
 * }
 * ```
 */
export class VehicleModel {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a VehicleModel value object.
	 * @param value - Raw model string (e.g. 'Camry', 'Civic')
	 * @returns Result containing VehicleModel or InvalidVehicleError
	 */
	static create(value: string): Result<VehicleModel, InvalidVehicleError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidVehicleError('Vehicle model must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidVehicleError('Vehicle model cannot be empty'));
		}

		if (trimmed.length < MIN_LENGTH) {
			return Result.error(
				new InvalidVehicleError(`Vehicle model must be at least ${MIN_LENGTH} character(s)`)
			);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidVehicleError(`Vehicle model must be at most ${MAX_LENGTH} characters`)
			);
		}

		return Result.ok(new VehicleModel(trimmed));
	}

	/** The trimmed model value */
	get value(): string {
		return this._value;
	}

	equals(other: VehicleModel): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
