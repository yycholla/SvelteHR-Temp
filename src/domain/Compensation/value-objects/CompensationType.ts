// src/domain/Compensation/value-objects/CompensationType.ts
import { Result } from '$domain/Result';
import { InvalidCompensationError } from '../errors';

export type CompensationTypeValue =
	| 'base_salary'
	| 'bonus'
	| 'commission'
	| 'equity'
	| 'stock_options';

const VALID_TYPES: ReadonlySet<CompensationTypeValue> = new Set([
	'base_salary',
	'bonus',
	'commission',
	'equity',
	'stock_options'
]);

/**
 * CompensationType value object representing different forms of employee compensation.
 * Distinguishes between recurring (base salary) and variable (bonus, commission, equity).
 */
export class CompensationType {
	private constructor(private readonly _value: CompensationTypeValue) {}

	static create(type: string): Result<CompensationType, InvalidCompensationError> {
		const normalizedType = type.trim().toLowerCase() as CompensationTypeValue;

		if (!VALID_TYPES.has(normalizedType)) {
			return Result.error(
				new InvalidCompensationError(
					`Invalid compensation type: ${type}. Must be one of: base_salary, bonus, commission, equity, stock_options`,
					type
				)
			);
		}

		return Result.ok(new CompensationType(normalizedType));
	}

	get value(): CompensationTypeValue {
		return this._value;
	}

	equals(other: CompensationType): boolean {
		return this._value === other._value;
	}

	/**
	 * Checks if this is a recurring compensation type (base salary).
	 */
	isRecurring(): boolean {
		return this._value === 'base_salary';
	}

	/**
	 * Checks if this is a variable compensation type (bonus, commission, equity).
	 */
	isVariable(): boolean {
		return !this.isRecurring();
	}

	/**
	 * Checks if this is an equity-based compensation type.
	 */
	isEquityBased(): boolean {
		return this._value === 'equity' || this._value === 'stock_options';
	}
}
