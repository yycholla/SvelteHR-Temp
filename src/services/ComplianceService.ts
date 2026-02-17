// src/services/ComplianceService.ts
import { Result } from '$domain/Result';
import {
	ComplianceArea,
	ComplianceError,
	ComplianceStatus,
	InvalidComplianceError,
	ComplianceAreaNotFoundError
} from '$domain/Compliance';
import type { ComplianceRepository } from './ports/ComplianceRepository';

/**
 * ComplianceService orchestrates all compliance area business operations.
 *
 * Depends on ComplianceRepository port (not a specific adapter),
 * keeping the service layer decoupled from infrastructure concerns.
 *
 * All methods use try-catch and return Result<T, ComplianceError> for
 * type-safe error handling without throwing exceptions.
 *
 * @example
 * ```typescript
 * const service = new ComplianceService(repository);
 * const result = await service.getAll();
 * if (result.isOk) {
 *   const areas = result.value;
 * }
 * ```
 */
export class ComplianceService {
	constructor(private readonly repository: ComplianceRepository) {}

	/**
	 * Get a compliance area by its unique identifier.
	 * @param id - UUID of the compliance area
	 * @returns Result with the found ComplianceArea or ComplianceAreaNotFoundError
	 */
	async getById(id: string): Promise<Result<ComplianceArea, ComplianceError>> {
		try {
			const result = await this.repository.findById(id);

			if (result.isError) {
				return Result.error(result.error);
			}

			if (!result.value) {
				return Result.error(new ComplianceAreaNotFoundError(id));
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to retrieve compliance area: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all compliance areas.
	 * @returns Result with array of ComplianceArea or ComplianceError
	 */
	async getAll(): Promise<Result<ComplianceArea[], ComplianceError>> {
		try {
			return await this.repository.findAll();
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to retrieve compliance areas: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all compliance areas due for review.
	 * @returns Result with array of ComplianceArea that are past their review date
	 */
	async getDueForReview(): Promise<Result<ComplianceArea[], ComplianceError>> {
		try {
			return await this.repository.findDueForReview();
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to retrieve compliance areas due for review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all compliance areas with the specified status.
	 * @param statusValue - Status string ('compliant' | 'warning' | 'failed' | 'pending')
	 * @returns Result with filtered array of ComplianceArea
	 */
	async getByStatus(statusValue: string): Promise<Result<ComplianceArea[], ComplianceError>> {
		try {
			const statusResult = ComplianceStatus.create(statusValue);
			if (statusResult.isError) {
				return Result.error(statusResult.error);
			}

			return await this.repository.findByStatus(statusResult.value);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to retrieve compliance areas by status: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new compliance area.
	 * @param area - ComplianceArea entity to persist
	 * @returns Result with the created ComplianceArea
	 */
	async create(area: ComplianceArea): Promise<Result<ComplianceArea, ComplianceError>> {
		try {
			return await this.repository.create(area);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to create compliance area: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update an existing compliance area.
	 * @param area - ComplianceArea entity with updated values
	 * @returns Result with the updated ComplianceArea
	 */
	async update(area: ComplianceArea): Promise<Result<ComplianceArea, ComplianceError>> {
		try {
			return await this.repository.update(area);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to update compliance area: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete a compliance area by its unique identifier.
	 * @param id - UUID of the compliance area to delete
	 * @returns Result with void on success or ComplianceError on failure
	 */
	async delete(id: string): Promise<Result<void, ComplianceError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to delete compliance area: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Calculate the overall compliance score as an average across all areas.
	 * Returns 0 if there are no compliance areas.
	 *
	 * @returns Result with the overall score (0-100) or ComplianceError
	 */
	async getOverallScore(): Promise<Result<number, ComplianceError>> {
		try {
			const allResult = await this.repository.findAll();

			if (allResult.isError) {
				return Result.error(allResult.error);
			}

			const areas = allResult.value;

			if (areas.length === 0) {
				return Result.ok(0);
			}

			const total = areas.reduce((sum, area) => sum + area.score.value, 0);
			const average = Math.round(total / areas.length);

			return Result.ok(average);
		} catch (error) {
			return Result.error(
				new InvalidComplianceError(
					`Failed to calculate overall compliance score: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
