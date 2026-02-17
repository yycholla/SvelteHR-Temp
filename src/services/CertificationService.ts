// src/services/CertificationService.ts
import { Result } from '$domain/Result';
import {
	Certification,
	CertificationName,
	IssuingOrganization,
	CredentialId,
	CertificationNotFoundError,
	InvalidCertificationError
} from '$domain/Certification';
import type { CertificationError } from '$domain/Certification';
import type { CertificationRepository } from './ports/CertificationRepository';

export interface CreateCertificationInput {
	id: string;
	employeeId: string;
	name: string;
	issuingOrganization: string;
	issueDate: Date;
	expirationDate: Date | null;
	credentialId: string | null;
}

export interface UpdateCertificationInput {
	name: string;
	issuingOrganization: string;
	issueDate: Date;
	expirationDate: Date | null;
	credentialId: string | null;
}

/**
 * Service for employee certification business operations.
 *
 * Orchestrates certification CRUD operations and business rules,
 * delegating data access to the CertificationRepository port.
 *
 * @example
 * ```typescript
 * const service = createCertificationService(event);
 * const result = await service.getByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // Certification[]
 * }
 * ```
 */
export class CertificationService {
	constructor(private readonly repository: CertificationRepository) {}

	/**
	 * Get a certification by ID.
	 * Returns CertificationNotFoundError if not found.
	 */
	async getById(id: string): Promise<Result<Certification, CertificationError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new CertificationNotFoundError(id));
			}

			return Result.ok(findResult.value);
		} catch {
			return Result.error(new CertificationNotFoundError(id));
		}
	}

	/**
	 * Get all certifications for an employee.
	 */
	async getByEmployeeId(employeeId: string): Promise<Result<Certification[], CertificationError>> {
		try {
			return await this.repository.findByEmployeeId(employeeId);
		} catch {
			return Result.error(new CertificationNotFoundError(employeeId));
		}
	}

	/**
	 * Get certifications expiring before the given date.
	 * Useful for sending renewal reminders.
	 */
	async getExpiring(beforeDate: Date): Promise<Result<Certification[], CertificationError>> {
		try {
			return await this.repository.findExpiring(beforeDate);
		} catch {
			return Result.error(
				new InvalidCertificationError('Failed to fetch expiring certifications')
			);
		}
	}

	/**
	 * Create a new certification for an employee.
	 * Validates all input data and creates domain entity before persisting.
	 */
	async create(
		input: CreateCertificationInput
	): Promise<Result<Certification, CertificationError>> {
		try {
			const nameResult = CertificationName.create(input.name);
			if (nameResult.isError) return Result.error(nameResult.error);

			const orgResult = IssuingOrganization.create(input.issuingOrganization);
			if (orgResult.isError) return Result.error(orgResult.error);

			const credResult = CredentialId.create(input.credentialId);
			if (credResult.isError) return Result.error(credResult.error);

			const now = new Date();
			const certResult = Certification.create({
				id: input.id,
				employeeId: input.employeeId,
				name: nameResult.value,
				issuingOrganization: orgResult.value,
				issueDate: input.issueDate,
				expirationDate: input.expirationDate,
				credentialId: credResult.value,
				createdAt: now,
				updatedAt: now
			});

			if (certResult.isError) return Result.error(certResult.error);

			return await this.repository.create(certResult.value);
		} catch {
			return Result.error(new InvalidCertificationError('Failed to create certification'));
		}
	}

	/**
	 * Update an existing certification's details.
	 */
	async update(
		id: string,
		input: UpdateCertificationInput
	): Promise<Result<Certification, CertificationError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new CertificationNotFoundError(id));
			}

			const nameResult = CertificationName.create(input.name);
			if (nameResult.isError) return Result.error(nameResult.error);

			const orgResult = IssuingOrganization.create(input.issuingOrganization);
			if (orgResult.isError) return Result.error(orgResult.error);

			const credResult = CredentialId.create(input.credentialId);
			if (credResult.isError) return Result.error(credResult.error);

			const existing = findResult.value;
			const now = new Date();

			const updatedResult = Certification.create({
				id: existing.id,
				employeeId: existing.employeeId,
				name: nameResult.value,
				issuingOrganization: orgResult.value,
				issueDate: input.issueDate,
				expirationDate: input.expirationDate,
				credentialId: credResult.value,
				createdAt: existing.createdAt,
				updatedAt: now
			});

			if (updatedResult.isError) return Result.error(updatedResult.error);

			return await this.repository.update(updatedResult.value);
		} catch {
			return Result.error(new CertificationNotFoundError(id));
		}
	}

	/**
	 * Delete a certification by ID.
	 */
	async delete(id: string): Promise<Result<void, CertificationError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new CertificationNotFoundError(id));
			}

			return await this.repository.delete(id);
		} catch {
			return Result.error(new CertificationNotFoundError(id));
		}
	}
}
