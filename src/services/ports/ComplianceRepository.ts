// src/services/ports/ComplianceRepository.ts
import type { Result } from '$domain/Result';
import type { ComplianceArea, ComplianceError, ComplianceStatus } from '$domain/Compliance';

/**
 * Port interface for compliance area persistence operations.
 *
 * Defines the contract that any compliance repository adapter must fulfill.
 * This port enables hexagonal architecture by decoupling the service layer
 * from the specific persistence technology (GraphQL, REST, in-memory, etc.).
 */
export interface ComplianceRepository {
	/**
	 * Find a compliance area by its unique identifier.
	 * @param id - UUID of the compliance area
	 * @returns Result containing the found ComplianceArea or ComplianceError
	 */
	findById(id: string): Promise<Result<ComplianceArea | null, ComplianceError>>;

	/**
	 * Retrieve all compliance areas.
	 * @returns Result containing an array of ComplianceArea or ComplianceError
	 */
	findAll(): Promise<Result<ComplianceArea[], ComplianceError>>;

	/**
	 * Find all compliance areas that are due for review (nextReviewDate is in the past).
	 * @returns Result containing an array of ComplianceArea or ComplianceError
	 */
	findDueForReview(): Promise<Result<ComplianceArea[], ComplianceError>>;

	/**
	 * Find all compliance areas with the specified status.
	 * @param status - ComplianceStatus value object to filter by
	 * @returns Result containing an array of ComplianceArea or ComplianceError
	 */
	findByStatus(status: ComplianceStatus): Promise<Result<ComplianceArea[], ComplianceError>>;

	/**
	 * Persist a new compliance area.
	 * @param area - ComplianceArea entity to create
	 * @returns Result containing the created ComplianceArea or ComplianceError
	 */
	create(area: ComplianceArea): Promise<Result<ComplianceArea, ComplianceError>>;

	/**
	 * Update an existing compliance area.
	 * @param area - ComplianceArea entity with updated values
	 * @returns Result containing the updated ComplianceArea or ComplianceError
	 */
	update(area: ComplianceArea): Promise<Result<ComplianceArea, ComplianceError>>;

	/**
	 * Delete a compliance area by its unique identifier.
	 * @param id - UUID of the compliance area to delete
	 * @returns Result containing void or ComplianceError
	 */
	delete(id: string): Promise<Result<void, ComplianceError>>;
}
