// src/domain/Vehicle/value-objects/VehicleColor.ts
import { Result } from '$domain/Result';
import { InvalidVehicleError } from '../errors/VehicleErrors';

const MAX_LENGTH = 30;

/**
 * Value object representing an optional vehicle color.
 *
 * Invariants:
 * - If provided, must be at most 30 characters (after trimming)
 * - Empty or whitespace-only strings are treated as null (absent)
 *
 * @example
 * ```typescript
 * const colorResult = VehicleColor.create('Red');
 * if (colorResult.isOk) {
 *   console.log(colorResult.value?.value); // 'Red'
 * }
 *
 * const emptyResult = VehicleColor.create('');
 * if (emptyResult.isOk) {
 *   console.log(emptyResult.value); // null
 * }
 * ```
 */
export class VehicleColor {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a VehicleColor value object.
	 * Returns null in the Result when value is empty or whitespace.
	 * @param value - Raw color string (e.g. 'Red', 'Midnight Blue') or empty/null
	 * @returns Result containing VehicleColor or null, or InvalidVehicleError
	 */
	static create(value: string | null | undefined): Result<VehicleColor | null, InvalidVehicleError> {
		if (value === null || value === undefined) {
			return Result.ok(null);
		}

		if (typeof value !== 'string') {
			return Result.error(new InvalidVehicleError('Vehicle color must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.ok(null);
		}

		if (trimmed.length > MAX_LENGTH) {
			return Result.error(
				new InvalidVehicleError(`Vehicle color must be at most ${MAX_LENGTH} characters`)
			);
		}

		return Result.ok(new VehicleColor(trimmed));
	}

	/** The trimmed color value */
	get value(): string {
		return this._value;
	}

	equals(other: VehicleColor): boolean {
		return this._value.toLowerCase() === other._value.toLowerCase();
	}

	toString(): string {
		return this._value;
	}
}
