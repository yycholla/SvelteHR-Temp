// src/services/ports/TimeOffBalanceRepository.ts
import { Result } from '$domain/Result';
import {
	TimeOffBalanceRecord,
	TimeOffBalanceNotFoundError,
	InvalidAccrualCalculationError,
	TimeOffBalanceValidationError
} from '$domain/TimeOffBalance';
import type { DomainError } from '$domain/errors';

/**
 * Filter options for querying time off balance records
 */
export interface BalanceFilter {
	employeeId?: string;
	leaveType?: string;
	year?: number;
	hasAvailableHours?: boolean;
	limit?: number;
	offset?: number;
}

/**
 * Data required to create a new time off balance record
 */
export interface CreateBalanceData {
	employeeId: string;
	leaveType: string;
	year: number;
	totalHours: number;
	usedHours?: number;
	accrualRate: number;
	accrualPeriod: 'biweek' | 'month' | 'year';
	carryoverHours?: number;
}

/**
 * Data for updating an existing time off balance record
 */
export interface UpdateBalanceData {
	totalHours?: number;
	usedHours?: number;
	accrualRate?: number;
	accrualPeriod?: 'biweek' | 'month' | 'year';
	carryoverHours?: number;
}

/**
 * Repository port interface for time off balance operations
 *
 * Defines the contract that adapters must implement to provide
 * time off balance data access. Domain-driven design separates this
 * interface from its implementation to maintain layer independence.
 */
export interface TimeOffBalanceRepository {
	/**
	 * Find a time off balance record by ID
	 * @param id - The balance record ID
	 * @returns Result containing the balance record or NotFoundError
	 */
	findById(id: string): Promise<Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError>>;

	/**
	 * Find all balance records for a specific employee
	 * @param employeeId - The employee's ID
	 * @returns Result containing array of balance records
	 */
	findByEmployeeId(
		employeeId: string
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>>;

	/**
	 * Find balance records for a specific employee and leave type
	 * @param employeeId - The employee's ID
	 * @param leaveType - The leave type (vacation, sick, personal, etc.)
	 * @returns Result containing array of balance records
	 */
	findByEmployeeIdAndType(
		employeeId: string,
		leaveType: string
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>>;

	/**
	 * Find all balance records for a specific period (year)
	 * @param year - The period year (e.g., 2026)
	 * @returns Result containing array of balance records
	 */
	findByPeriod(
		year: number
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>>;

	/**
	 * Find all balance records with optional filtering
	 * @param filter - Optional filter criteria
	 * @returns Result containing array of balance records
	 */
	findAll(
		filter?: BalanceFilter
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>>;

	/**
	 * Create a new time off balance record
	 * @param data - The balance data
	 * @returns Result containing the created balance record
	 */
	create(
		data: CreateBalanceData
	): Promise<Result<TimeOffBalanceRecord, TimeOffBalanceValidationError | DomainError>>;

	/**
	 * Update an existing time off balance record
	 * @param id - The balance record ID
	 * @param data - The fields to update
	 * @returns Result containing the updated balance record
	 */
	update(
		id: string,
		data: UpdateBalanceData
	): Promise<
		Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError | TimeOffBalanceValidationError>
	>;

	/**
	 * Delete a time off balance record
	 * @param id - The balance record ID
	 * @returns Result indicating success or NotFoundError
	 */
	delete(id: string): Promise<Result<void, TimeOffBalanceNotFoundError | DomainError>>;
}
