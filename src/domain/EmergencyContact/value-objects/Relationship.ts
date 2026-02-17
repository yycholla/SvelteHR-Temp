// src/domain/EmergencyContact/value-objects/Relationship.ts
import { Result } from '$domain/Result';
import { InvalidEmergencyContactError } from '../errors/EmergencyContactErrors';

type RelationshipValue = 'spouse' | 'parent' | 'child' | 'sibling' | 'friend' | 'other';

const VALID_RELATIONSHIPS: ReadonlySet<string> = new Set([
	'spouse',
	'parent',
	'child',
	'sibling',
	'friend',
	'other'
]);

const IMMEDIATE_FAMILY: ReadonlySet<string> = new Set(['spouse', 'parent', 'child', 'sibling']);

/**
 * Value object representing the relationship of an emergency contact to the employee.
 *
 * Valid values: spouse, parent, child, sibling, friend, other
 *
 * Provides business logic via isImmediate() to identify immediate family members.
 */
export class Relationship {
	private constructor(private readonly _value: RelationshipValue) {}

	/**
	 * Create a Relationship value object.
	 * @param value - Relationship type string
	 * @returns Result containing Relationship or InvalidEmergencyContactError
	 */
	static create(value: string): Result<Relationship, InvalidEmergencyContactError> {
		if (!VALID_RELATIONSHIPS.has(value)) {
			return Result.error(
				new InvalidEmergencyContactError(
					`Invalid relationship: "${value}". Must be one of: ${Array.from(VALID_RELATIONSHIPS).join(', ')}`
				)
			);
		}

		return Result.ok(new Relationship(value as RelationshipValue));
	}

	/** The relationship value */
	get value(): RelationshipValue {
		return this._value;
	}

	/**
	 * Returns true if the relationship is an immediate family member
	 * (spouse, parent, child, or sibling).
	 */
	get isImmediate(): boolean {
		return IMMEDIATE_FAMILY.has(this._value);
	}

	equals(other: Relationship): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
