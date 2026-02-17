// src/domain/EmergencyContact/EmergencyContact.ts
import { Result } from '$domain/Result';
import { ContactName } from './value-objects/ContactName';
import { ContactPhone } from './value-objects/ContactPhone';
import { Relationship } from './value-objects/Relationship';
import {
	EmergencyContactError,
	InvalidEmergencyContactError
} from './errors/EmergencyContactErrors';

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export interface CreateEmergencyContactData {
	id: string;
	employeeId: string;
	name: ContactName;
	phone: ContactPhone;
	relationship: Relationship;
	isPrimary: boolean;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * EmergencyContact aggregate root entity.
 *
 * Represents an emergency contact associated with an employee.
 * Enforces business invariants:
 * - id and employeeId must be valid UUIDs
 * - name, phone, and relationship are value objects with their own validation
 * - dates use defensive copies to prevent mutation
 *
 * @example
 * ```typescript
 * const nameResult = ContactName.create('Jane Doe');
 * const phoneResult = ContactPhone.create('+1 555-0100');
 * const relResult = Relationship.create('spouse');
 *
 * const contactResult = EmergencyContact.create({
 *   id: '123e4567-...',
 *   employeeId: '123e4567-...',
 *   name: nameResult.value,
 *   phone: phoneResult.value,
 *   relationship: relResult.value,
 *   isPrimary: true,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 * ```
 */
export class EmergencyContact {
	private constructor(
		private readonly _id: string,
		private readonly _employeeId: string,
		private readonly _name: ContactName,
		private readonly _phone: ContactPhone,
		private readonly _relationship: Relationship,
		private readonly _isPrimary: boolean,
		private readonly _createdAt: Date,
		private readonly _updatedAt: Date
	) {}

	/**
	 * Create an EmergencyContact entity.
	 * @param data - Contact creation data with validated value objects
	 * @returns Result containing EmergencyContact or EmergencyContactError
	 */
	static create(
		data: CreateEmergencyContactData
	): Result<EmergencyContact, EmergencyContactError> {
		if (!isValidUUID(data.id)) {
			return Result.error(
				new InvalidEmergencyContactError(`Invalid emergency contact ID: "${data.id}"`)
			);
		}

		if (!isValidUUID(data.employeeId)) {
			return Result.error(
				new InvalidEmergencyContactError(`Invalid employee ID: "${data.employeeId}"`)
			);
		}

		if (isNaN(data.createdAt.getTime())) {
			return Result.error(
				new InvalidEmergencyContactError('createdAt must be a valid date')
			);
		}

		if (isNaN(data.updatedAt.getTime())) {
			return Result.error(
				new InvalidEmergencyContactError('updatedAt must be a valid date')
			);
		}

		return Result.ok(
			new EmergencyContact(
				data.id,
				data.employeeId,
				data.name,
				data.phone,
				data.relationship,
				data.isPrimary,
				new Date(data.createdAt), // defensive copy
				new Date(data.updatedAt) // defensive copy
			)
		);
	}

	get id(): string {
		return this._id;
	}

	get employeeId(): string {
		return this._employeeId;
	}

	get name(): ContactName {
		return this._name;
	}

	get phone(): ContactPhone {
		return this._phone;
	}

	get relationship(): Relationship {
		return this._relationship;
	}

	get isPrimary(): boolean {
		return this._isPrimary;
	}

	/** Returns a defensive copy of the creation date */
	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	/** Returns a defensive copy of the last updated date */
	get updatedAt(): Date {
		return new Date(this._updatedAt);
	}

	/**
	 * Mark this contact as primary.
	 * Returns a new EmergencyContact instance with isPrimary=true.
	 */
	markAsPrimary(): EmergencyContact {
		return new EmergencyContact(
			this._id,
			this._employeeId,
			this._name,
			this._phone,
			this._relationship,
			true,
			new Date(this._createdAt),
			new Date()
		);
	}

	/**
	 * Update the contact's name and phone.
	 * Returns a new EmergencyContact instance with the updated values.
	 * @param name - New ContactName value object
	 * @param phone - New ContactPhone value object
	 */
	updateContact(name: ContactName, phone: ContactPhone): EmergencyContact {
		return new EmergencyContact(
			this._id,
			this._employeeId,
			name,
			phone,
			this._relationship,
			this._isPrimary,
			new Date(this._createdAt),
			new Date()
		);
	}
}
