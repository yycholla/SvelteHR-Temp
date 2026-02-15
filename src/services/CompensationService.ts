// src/services/CompensationService.ts
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';
import {
	type CompensationRecord,
	Salary,
	SalaryGrade,
	CompensationType,
	PaymentFrequency,
	EffectiveDate,
	CompensationNotFoundError,
	InvalidCompensationError
} from '$domain/Compensation';
import type {
	CompensationRepository,
	CreateCompensationData,
	UpdateCompensationData,
	CompensationFilter
} from './ports/CompensationRepository';

/**
 * Application service for managing compensation records.
 * Orchestrates domain logic and repository operations.
 *
 * @example
 * ```typescript
 * const service = new CompensationService(repository);
 *
 * // Get compensation by ID
 * const result = await service.getById('comp-123');
 * if (result.isOk) {
 *   console.log(result.value.salary.amount);
 * }
 *
 * // Create new compensation
 * const created = await service.createCompensation({
 *   employeeId: 'emp-123',
 *   salary: 75000,
 *   currency: 'USD',
 *   salaryGrade: 'mid',
 *   compensationType: 'salary',
 *   paymentFrequency: 'monthly',
 *   effectiveDate: '2024-01-01'
 * });
 * ```
 */
export class CompensationService {
	constructor(private readonly repository: CompensationRepository) {}

	/**
	 * Get a compensation record by ID
	 * @param id - The compensation record ID
	 * @returns Result containing the compensation record or an error
	 */
	async getById(
		id: string
	): Promise<Result<CompensationRecord, CompensationNotFoundError | DomainError>> {
		try {
			const result = await this.repository.findById(id);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch compensation record', 'COMPENSATION_FETCH_FAILED', {
					compensationId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all compensation records for a specific employee
	 * @param employeeId - The employee's ID
	 * @returns Result containing array of compensation records or an error
	 */
	async getByEmployeeId(
		employeeId: string
	): Promise<Result<CompensationRecord[], InvalidCompensationError | DomainError>> {
		try {
			const result = await this.repository.findByEmployeeId(employeeId);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError(
					'Failed to fetch employee compensation records',
					'EMPLOYEE_COMP_FETCH_FAILED',
					{
						employeeId,
						originalError: error
					}
				)
			);
		}
	}

	/**
	 * Get the active compensation record for a specific employee
	 * @param employeeId - The employee's ID
	 * @returns Result containing the active compensation record, null if none exists, or an error
	 */
	async getActiveByEmployeeId(
		employeeId: string
	): Promise<Result<CompensationRecord | null, InvalidCompensationError | DomainError>> {
		try {
			const result = await this.repository.findActiveByEmployeeId(employeeId);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch active compensation', 'ACTIVE_COMP_FETCH_FAILED', {
					employeeId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all compensation records with optional filtering
	 * @param filter - Optional filter criteria
	 * @returns Result containing array of compensation records or an error
	 */
	async getAllCompensations(
		filter?: CompensationFilter
	): Promise<Result<CompensationRecord[], InvalidCompensationError | DomainError>> {
		try {
			const result = await this.repository.findAll(filter);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch compensation records', 'COMPENSATIONS_FETCH_FAILED', {
					filter,
					originalError: error
				})
			);
		}
	}

	/**
	 * Create a new compensation record
	 * @param data - The compensation data
	 * @returns Result containing the created compensation record or an error
	 */
	async createCompensation(
		data: CreateCompensationData
	): Promise<Result<CompensationRecord, InvalidCompensationError | DomainError>> {
		try {
			// Validate value objects before delegating to repository
			const salaryResult = Salary.create(data.salary, data.currency);
			if (salaryResult.isError) {
				return Result.error(salaryResult.error);
			}

			const gradeResult = SalaryGrade.create(data.salaryGrade);
			if (gradeResult.isError) {
				return Result.error(gradeResult.error);
			}

			const typeResult = CompensationType.create(data.compensationType);
			if (typeResult.isError) {
				return Result.error(typeResult.error);
			}

			const frequencyResult = PaymentFrequency.create(data.paymentFrequency);
			if (frequencyResult.isError) {
				return Result.error(frequencyResult.error);
			}

			const effectiveDateResult = EffectiveDate.create(new Date(data.effectiveDate));
			if (effectiveDateResult.isError) {
				return Result.error(effectiveDateResult.error);
			}

			if (data.endDate) {
				const endDateResult = EffectiveDate.create(new Date(data.endDate));
				if (endDateResult.isError) {
					return Result.error(endDateResult.error);
				}
			}

			// Delegate to repository
			const result = await this.repository.create(data);
			if (result.isError) {
				return result;
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to create compensation record', 'COMPENSATION_CREATE_FAILED', {
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Update an existing compensation record
	 * @param id - The compensation record ID
	 * @param data - The fields to update
	 * @returns Result containing the updated compensation record or an error
	 */
	async updateCompensation(
		id: string,
		data: UpdateCompensationData
	): Promise<Result<CompensationRecord, CompensationNotFoundError | InvalidCompensationError>> {
		try {
			// Validate value objects if provided
			if (data.salary !== undefined && data.currency !== undefined) {
				const salaryResult = Salary.create(data.salary, data.currency);
				if (salaryResult.isError) {
					return Result.error(salaryResult.error);
				}
			}

			if (data.salaryGrade) {
				const gradeResult = SalaryGrade.create(data.salaryGrade);
				if (gradeResult.isError) {
					return Result.error(gradeResult.error);
				}
			}

			if (data.compensationType) {
				const typeResult = CompensationType.create(data.compensationType);
				if (typeResult.isError) {
					return Result.error(typeResult.error);
				}
			}

			if (data.paymentFrequency) {
				const frequencyResult = PaymentFrequency.create(data.paymentFrequency);
				if (frequencyResult.isError) {
					return Result.error(frequencyResult.error);
				}
			}

			if (data.effectiveDate) {
				const effectiveDateResult = EffectiveDate.create(new Date(data.effectiveDate));
				if (effectiveDateResult.isError) {
					return Result.error(effectiveDateResult.error);
				}
			}

			if (data.endDate) {
				const endDateResult = EffectiveDate.create(new Date(data.endDate));
				if (endDateResult.isError) {
					return Result.error(endDateResult.error);
				}
			}

			const result = await this.repository.update(id, data);
			if (result.isError) {
				return result;
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to update compensation record', 'COMPENSATION_UPDATE_FAILED', {
					compensationId: id,
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Terminate a compensation record by setting its end date
	 * @param id - The compensation record ID
	 * @param endDate - The termination date (ISO string)
	 * @returns Result containing the updated compensation record or an error
	 */
	async terminateCompensation(
		id: string,
		endDate: string
	): Promise<Result<CompensationRecord, CompensationNotFoundError | InvalidCompensationError>> {
		try {
			// Validate end date
			const endDateResult = EffectiveDate.create(new Date(endDate));
			if (endDateResult.isError) {
				return Result.error(endDateResult.error);
			}

			const result = await this.repository.terminate(id, endDate);
			if (result.isError) {
				return result;
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError(
					'Failed to terminate compensation record',
					'COMPENSATION_TERMINATE_FAILED',
					{
						compensationId: id,
						endDate,
						originalError: error
					}
				)
			);
		}
	}

	/**
	 * Delete a compensation record
	 * @param id - The compensation record ID
	 * @returns Result indicating success or an error
	 */
	async deleteCompensation(
		id: string
	): Promise<Result<void, CompensationNotFoundError | DomainError>> {
		try {
			const result = await this.repository.delete(id);
			if (result.isError) {
				return result;
			}
			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to delete compensation record', 'COMPENSATION_DELETE_FAILED', {
					compensationId: id,
					originalError: error
				})
			);
		}
	}
}
