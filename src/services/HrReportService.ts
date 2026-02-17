import { Result } from '$domain/Result';
import type { HrReport } from '$domain/HrReport/HrReport';
import { InvalidHrReportError } from '$domain/HrReport/errors/HrReportErrors';
import type { HrReportError } from '$domain/HrReport/errors/HrReportErrors';
import type {
	HrReportRepository,
	CreateHrReportData,
	UpdateHrReportData,
	HrReportFilter
} from './ports/HrReportRepository';

/**
 * Application service for managing HR reports.
 *
 * Orchestrates domain logic and repository operations.
 * All methods wrap repository calls in try-catch for resilient error handling.
 */
export class HrReportService {
	constructor(private readonly repository: HrReportRepository) {}

	/**
	 * Get an HR report by ID
	 * @param id - The report UUID
	 * @returns Result containing the report or a domain error
	 */
	async getById(id: string): Promise<Result<HrReport, HrReportError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to fetch report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all HR reports with optional filtering
	 * @param filter - Optional filters for status, reportType, creatorId, departmentId
	 * @returns Result containing array of reports or a domain error
	 */
	async getAll(filter?: HrReportFilter): Promise<Result<HrReport[], HrReportError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to fetch reports: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all HR reports for a specific department
	 * @param departmentId - The department UUID
	 * @param filter - Optional additional filters
	 * @returns Result containing array of reports or a domain error
	 */
	async getByDepartment(
		departmentId: string,
		filter?: HrReportFilter
	): Promise<Result<HrReport[], HrReportError>> {
		try {
			return await this.repository.findByDepartment(departmentId, filter);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to fetch reports for department: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new HR report
	 * @param data - The report creation data
	 * @returns Result containing the created report or a domain error
	 */
	async create(data: CreateHrReportData): Promise<Result<HrReport, HrReportError>> {
		try {
			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to create report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update an existing HR report
	 * @param id - The report UUID
	 * @param data - The fields to update
	 * @returns Result containing the updated report or a domain error
	 */
	async update(id: string, data: UpdateHrReportData): Promise<Result<HrReport, HrReportError>> {
		try {
			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to update report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete an HR report
	 * @param id - The report UUID
	 * @returns Result indicating success or a domain error
	 */
	async delete(id: string): Promise<Result<void, HrReportError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to delete report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Trigger generation of an HR report
	 * @param id - The report UUID
	 * @returns Result containing the generated report or a domain error
	 */
	async generate(id: string): Promise<Result<HrReport, HrReportError>> {
		try {
			return await this.repository.generate(id);
		} catch (error) {
			return Result.error(
				new InvalidHrReportError(
					`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
