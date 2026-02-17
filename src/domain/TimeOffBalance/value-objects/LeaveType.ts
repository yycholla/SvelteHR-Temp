// src/domain/TimeOffBalance/value-objects/LeaveType.ts
import { Result } from '$domain/Result';
import { LeaveTypeValidationError } from '../errors/TimeOffBalanceErrors';

/**
 * Valid leave type values.
 */
export type LeaveTypeValue =
	| 'vacation'
	| 'sick'
	| 'personal'
	| 'bereavement'
	| 'parental'
	| 'unpaid';

/**
 * LeaveType Value Object
 *
 * Represents the type of time off leave (vacation, sick, personal, etc.).
 * Immutable value object with business logic for leave policies.
 *
 * @example
 * ```typescript
 * const leaveType = LeaveType.create('vacation');
 * if (leaveType.isOk) {
 *   console.log(leaveType.value.isPaid); // true
 *   console.log(leaveType.value.requiresDocumentation); // false
 * }
 * ```
 */
export class LeaveType {
	private static readonly VALID_TYPES: ReadonlySet<string> = new Set([
		'vacation',
		'sick',
		'personal',
		'bereavement',
		'parental',
		'unpaid'
	]);

	private static readonly DOCUMENTATION_REQUIRED_TYPES: ReadonlySet<string> = new Set([
		'sick',
		'bereavement',
		'parental'
	]);

	private static readonly DISPLAY_NAMES: ReadonlyMap<LeaveTypeValue, string> = new Map([
		['vacation', 'Vacation'],
		['sick', 'Sick'],
		['personal', 'Personal'],
		['bereavement', 'Bereavement'],
		['parental', 'Parental'],
		['unpaid', 'Unpaid']
	]);

	private constructor(private readonly _value: LeaveTypeValue) {}

	/**
	 * Creates a new LeaveType instance.
	 *
	 * @param type - The leave type string
	 * @returns Result containing LeaveType or validation error
	 *
	 * @example
	 * ```typescript
	 * const vacation = LeaveType.create('vacation');
	 * const invalid = LeaveType.create('holiday'); // Error: Invalid leave type
	 * ```
	 */
	static create(type: string): Result<LeaveType, LeaveTypeValidationError> {
		// Validate non-null/undefined
		if (type === null || type === undefined || type === '') {
			return Result.error(new LeaveTypeValidationError('Leave type cannot be empty'));
		}

		// Normalize to lowercase
		const normalizedType = type.toLowerCase();

		// Validate against allowed types
		if (!this.VALID_TYPES.has(normalizedType)) {
			return Result.error(
				new LeaveTypeValidationError(
					`Invalid leave type: "${type}". Must be one of: ${Array.from(this.VALID_TYPES).join(', ')}`
				)
			);
		}

		return Result.ok(new LeaveType(normalizedType as LeaveTypeValue));
	}

	/**
	 * The raw leave type value.
	 */
	get value(): LeaveTypeValue {
		return this._value;
	}

	/**
	 * Whether this leave type is paid.
	 * All leave types are paid except "unpaid".
	 */
	get isPaid(): boolean {
		return this._value !== 'unpaid';
	}

	/**
	 * Whether this leave type requires documentation.
	 * Sick, bereavement, and parental leave require documentation.
	 */
	get requiresDocumentation(): boolean {
		return LeaveType.DOCUMENTATION_REQUIRED_TYPES.has(this._value);
	}

	/**
	 * Human-readable display name for this leave type.
	 */
	get displayName(): string {
		return LeaveType.DISPLAY_NAMES.get(this._value)!;
	}

	/**
	 * Checks equality with another LeaveType.
	 *
	 * @param other - The other LeaveType to compare
	 * @returns True if leave types are equal
	 */
	equals(other: LeaveType): boolean {
		return this._value === other._value;
	}

	/**
	 * String representation of leave type.
	 */
	toString(): string {
		return this.displayName;
	}
}
