// src/services/ports/EmergencyContactRepository.ts
import type { Result } from '$domain/Result';
import type { EmergencyContact } from '$domain/EmergencyContact';
import type { EmergencyContactError } from '$domain/EmergencyContact';

/**
 * Port interface for emergency contact data access.
 * Implementations should be in the adapters layer.
 */
export interface EmergencyContactRepository {
	/**
	 * Find emergency contact by ID
	 */
	findById(id: string): Promise<Result<EmergencyContact | null, EmergencyContactError>>;

	/**
	 * Find all emergency contacts for an employee
	 */
	findByEmployeeId(
		employeeId: string
	): Promise<Result<EmergencyContact[], EmergencyContactError>>;

	/**
	 * Find the primary emergency contact for an employee (or null if none)
	 */
	findPrimaryByEmployeeId(
		employeeId: string
	): Promise<Result<EmergencyContact | null, EmergencyContactError>>;

	/**
	 * Create a new emergency contact
	 */
	create(contact: EmergencyContact): Promise<Result<EmergencyContact, EmergencyContactError>>;

	/**
	 * Update an existing emergency contact
	 */
	update(contact: EmergencyContact): Promise<Result<EmergencyContact, EmergencyContactError>>;

	/**
	 * Delete an emergency contact by ID
	 */
	delete(id: string): Promise<Result<void, EmergencyContactError>>;

	/**
	 * Set an emergency contact as primary for an employee
	 * (should unset any currently primary contact for that employee)
	 */
	setPrimary(
		id: string,
		employeeId: string
	): Promise<Result<EmergencyContact, EmergencyContactError>>;
}
