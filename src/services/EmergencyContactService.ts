// src/services/EmergencyContactService.ts
import { Result } from '$domain/Result';
import {
	EmergencyContact,
	ContactName,
	ContactPhone,
	Relationship,
	EmergencyContactNotFoundError
} from '$domain/EmergencyContact';
import type { EmergencyContactError } from '$domain/EmergencyContact';
import type { EmergencyContactRepository } from './ports/EmergencyContactRepository';

export interface CreateEmergencyContactInput {
	id: string;
	employeeId: string;
	name: string;
	phone: string;
	relationship: string;
	isPrimary: boolean;
}

export interface UpdateEmergencyContactInput {
	name: string;
	phone: string;
}

/**
 * Service for emergency contact business operations.
 *
 * Orchestrates emergency contact CRUD operations and business rules,
 * delegating data access to the EmergencyContactRepository port.
 *
 * @example
 * ```typescript
 * const service = createEmergencyContactService(event);
 * const result = await service.getByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // EmergencyContact[]
 * }
 * ```
 */
export class EmergencyContactService {
	constructor(private readonly repository: EmergencyContactRepository) {}

	/**
	 * Get an emergency contact by ID.
	 * Returns EmergencyContactNotFoundError if not found.
	 */
	async getById(id: string): Promise<Result<EmergencyContact, EmergencyContactError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new EmergencyContactNotFoundError(id));
			}

			return Result.ok(findResult.value);
		} catch (error) {
			return Result.error(
				new EmergencyContactNotFoundError(id)
			);
		}
	}

	/**
	 * Get all emergency contacts for an employee.
	 */
	async getByEmployeeId(
		employeeId: string
	): Promise<Result<EmergencyContact[], EmergencyContactError>> {
		try {
			return await this.repository.findByEmployeeId(employeeId);
		} catch (error) {
			return Result.error(new EmergencyContactNotFoundError(employeeId));
		}
	}

	/**
	 * Get the primary emergency contact for an employee.
	 * Returns null in the Result if no primary contact exists.
	 */
	async getPrimary(
		employeeId: string
	): Promise<Result<EmergencyContact | null, EmergencyContactError>> {
		try {
			return await this.repository.findPrimaryByEmployeeId(employeeId);
		} catch (error) {
			return Result.error(new EmergencyContactNotFoundError(employeeId));
		}
	}

	/**
	 * Create a new emergency contact.
	 * Validates all input data and creates domain entity before persisting.
	 */
	async create(
		input: CreateEmergencyContactInput
	): Promise<Result<EmergencyContact, EmergencyContactError>> {
		try {
			const nameResult = ContactName.create(input.name);
			if (nameResult.isError) return Result.error(nameResult.error);

			const phoneResult = ContactPhone.create(input.phone);
			if (phoneResult.isError) return Result.error(phoneResult.error);

			const relationshipResult = Relationship.create(input.relationship);
			if (relationshipResult.isError) return Result.error(relationshipResult.error);

			const now = new Date();
			const contactResult = EmergencyContact.create({
				id: input.id,
				employeeId: input.employeeId,
				name: nameResult.value,
				phone: phoneResult.value,
				relationship: relationshipResult.value,
				isPrimary: input.isPrimary,
				createdAt: now,
				updatedAt: now
			});

			if (contactResult.isError) return Result.error(contactResult.error);

			return await this.repository.create(contactResult.value);
		} catch (error) {
			return Result.error(
				new EmergencyContactNotFoundError(input.id)
			);
		}
	}

	/**
	 * Update an existing emergency contact's name and phone.
	 */
	async update(
		id: string,
		input: UpdateEmergencyContactInput
	): Promise<Result<EmergencyContact, EmergencyContactError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new EmergencyContactNotFoundError(id));
			}

			const nameResult = ContactName.create(input.name);
			if (nameResult.isError) return Result.error(nameResult.error);

			const phoneResult = ContactPhone.create(input.phone);
			if (phoneResult.isError) return Result.error(phoneResult.error);

			const updated = findResult.value.updateContact(nameResult.value, phoneResult.value);

			return await this.repository.update(updated);
		} catch (error) {
			return Result.error(new EmergencyContactNotFoundError(id));
		}
	}

	/**
	 * Delete an emergency contact.
	 */
	async delete(id: string): Promise<Result<void, EmergencyContactError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new EmergencyContactNotFoundError(id));
			}

			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(new EmergencyContactNotFoundError(id));
		}
	}

	/**
	 * Set an emergency contact as primary for the employee.
	 * The repository is responsible for unsetting any existing primary contact.
	 */
	async setPrimary(
		id: string,
		employeeId: string
	): Promise<Result<EmergencyContact, EmergencyContactError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new EmergencyContactNotFoundError(id));
			}

			return await this.repository.setPrimary(id, employeeId);
		} catch (error) {
			return Result.error(new EmergencyContactNotFoundError(id));
		}
	}
}
