// src/services/ports/CertificationRepository.ts
import type { Result } from '$domain/Result';
import type { Certification } from '$domain/Certification';
import type { CertificationError } from '$domain/Certification';

/**
 * Port interface for certification data access.
 * Implementations should be in the adapters layer.
 */
export interface CertificationRepository {
	/**
	 * Find certification by ID
	 */
	findById(id: string): Promise<Result<Certification | null, CertificationError>>;

	/**
	 * Find all certifications for an employee
	 */
	findByEmployeeId(employeeId: string): Promise<Result<Certification[], CertificationError>>;

	/**
	 * Find certifications expiring before the given date
	 */
	findExpiring(beforeDate: Date): Promise<Result<Certification[], CertificationError>>;

	/**
	 * Create a new certification
	 */
	create(cert: Certification): Promise<Result<Certification, CertificationError>>;

	/**
	 * Update an existing certification
	 */
	update(cert: Certification): Promise<Result<Certification, CertificationError>>;

	/**
	 * Delete a certification by ID
	 */
	delete(id: string): Promise<Result<void, CertificationError>>;
}
