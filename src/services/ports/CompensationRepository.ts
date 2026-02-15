// src/services/ports/CompensationRepository.ts
import { Result } from '$domain/Result';
import {
	CompensationRecord,
	CompensationNotFoundError,
	InvalidCompensationError
} from '$domain/Compensation';
import type { DomainError } from '$domain/errors';

/**
 * Filter options for querying compensation records
 */
export interface CompensationFilter {
	employeeId?: string;
	salaryGrade?: string;
	compensationType?: string;
	paymentFrequency?: string;
	isActive?: boolean;
	effectiveDateFrom?: Date;
	effectiveDateTo?: Date;
	limit?: number;
	offset?: number;
}

/**
 * Data required to create a new compensation record
 */
export interface CreateCompensationData {
	employeeId: string;
	salary: number;
	currency: string;
	salaryGrade: string;
	compensationType: string;
	paymentFrequency: string;
	effectiveDate: string; // ISO date string
	endDate?: string | null; // ISO date string
	notes?: string | null;
}

/**
 * Data for updating an existing compensation record
 */
export interface UpdateCompensationData {
	salary?: number;
	currency?: string;
	salaryGrade?: string;
	compensationType?: string;
	paymentFrequency?: string;
	effectiveDate?: string; // ISO date string
	endDate?: string | null; // ISO date string
	notes?: string | null;
}

/**
 * Repository port interface for compensation operations
 *
 * Defines the contract that adapters must implement to provide
 * compensation data access. Domain-driven design separates this
 * interface from its implementation to maintain layer independence.
 */
export interface CompensationRepository {
	/**
	 * Find a compensation record by ID
	 * @param id - The compensation record ID
	 * @returns Result containing the compensation record or NotFoundError
	 */
	findById(id: string): Promise<Result<CompensationRecord, CompensationNotFoundError>>;

	/**
	 * Find all compensation records for a specific employee
	 * @param employeeId - The employee's ID
	 * @returns Result containing array of compensation records
	 */
	findByEmployeeId(
		employeeId: string
	): Promise<Result<CompensationRecord[], InvalidCompensationError | DomainError>>;

	/**
	 * Find the active compensation record for a specific employee
	 * @param employeeId - The employee's ID
	 * @returns Result containing the active compensation record or null if none exists
	 */
	findActiveByEmployeeId(
		employeeId: string
	): Promise<Result<CompensationRecord | null, InvalidCompensationError | DomainError>>;

	/**
	 * Find all compensation records with optional filtering
	 * @param filter - Optional filter criteria
	 * @returns Result containing array of compensation records
	 */
	findAll(
		filter?: CompensationFilter
	): Promise<Result<CompensationRecord[], InvalidCompensationError | DomainError>>;

	/**
	 * Create a new compensation record
	 * @param data - The compensation data
	 * @returns Result containing the created compensation record
	 */
	create(
		data: CreateCompensationData
	): Promise<Result<CompensationRecord, InvalidCompensationError | DomainError>>;

	/**
	 * Update an existing compensation record
	 * @param id - The compensation record ID
	 * @param data - The fields to update
	 * @returns Result containing the updated compensation record
	 */
	update(
		id: string,
		data: UpdateCompensationData
	): Promise<Result<CompensationRecord, CompensationNotFoundError | InvalidCompensationError>>;

	/**
	 * Terminate a compensation record by setting its end date
	 * @param id - The compensation record ID
	 * @param endDate - The termination date (ISO string)
	 * @returns Result containing the updated compensation record
	 */
	terminate(
		id: string,
		endDate: string
	): Promise<Result<CompensationRecord, CompensationNotFoundError | InvalidCompensationError>>;

	/**
	 * Delete a compensation record
	 * @param id - The compensation record ID
	 * @returns Result indicating success or NotFoundError
	 */
	delete(id: string): Promise<Result<void, CompensationNotFoundError | DomainError>>;
}
