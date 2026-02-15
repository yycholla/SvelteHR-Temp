// src/services/TimeOffBalanceService.ts
import { Result } from '$domain/Result';
import { DomainError } from '$domain/errors';
import {
	type TimeOffBalanceRecord,
	BalanceHours,
	LeaveType,
	BalancePeriod,
	AccrualRate,
	CarryoverHours,
	TimeOffBalanceNotFoundError,
	InvalidAccrualCalculationError,
	TimeOffBalanceValidationError
} from '$domain/TimeOffBalance';
import type {
	TimeOffBalanceRepository,
	CreateBalanceData,
	UpdateBalanceData,
	BalanceFilter
} from './ports/TimeOffBalanceRepository';

/**
 * Application service for managing time off balance records.
 * Orchestrates domain logic and repository operations.
 *
 * @example
 * ```typescript
 * const service = new TimeOffBalanceService(repository);
 *
 * // Get balance by ID
 * const result = await service.getById('balance-123');
 * if (result.isOk) {
 *   console.log(result.value.availableHours.value);
 * }
 *
 * // Create new balance
 * const created = await service.createBalance({
 *   employeeId: 'emp-123',
 *   leaveType: 'vacation',
 *   year: 2026,
 *   totalHours: 160,
 *   accrualRate: 5
 * });
 * ```
 */
export class TimeOffBalanceService {
	constructor(private readonly repository: TimeOffBalanceRepository) {}

	/**
	 * Get a time off balance record by ID
	 * @param id - The balance record ID
	 * @returns Result containing the balance record or an error
	 */
	async getById(
		id: string
	): Promise<Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError | DomainError>> {
		try {
			const result = await this.repository.findById(id);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch time off balance record', 'BALANCE_FETCH_FAILED', {
					balanceId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all balance records for a specific employee
	 * @param employeeId - The employee's ID
	 * @returns Result containing array of balance records or an error
	 */
	async getByEmployeeId(
		employeeId: string
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>> {
		try {
			const result = await this.repository.findByEmployeeId(employeeId);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError(
					'Failed to fetch employee balance records',
					'EMPLOYEE_BALANCE_FETCH_FAILED',
					{
						employeeId,
						originalError: error
					}
				)
			);
		}
	}

	/**
	 * Get balance records for a specific employee and leave type
	 * @param employeeId - The employee's ID
	 * @param leaveType - The leave type (vacation, sick, personal, etc.)
	 * @returns Result containing array of balance records or an error
	 */
	async getByEmployeeIdAndType(
		employeeId: string,
		leaveType: string
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>> {
		try {
			const result = await this.repository.findByEmployeeIdAndType(employeeId, leaveType);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch balance records by type', 'BALANCE_TYPE_FETCH_FAILED', {
					employeeId,
					leaveType,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all balance records for a specific period (year)
	 * @param year - The period year (e.g., 2026)
	 * @returns Result containing array of balance records or an error
	 */
	async getByPeriod(
		year: number
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>> {
		try {
			const result = await this.repository.findByPeriod(year);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError(
					'Failed to fetch balance records by period',
					'BALANCE_PERIOD_FETCH_FAILED',
					{
						year,
						originalError: error
					}
				)
			);
		}
	}

	/**
	 * Get all balance records with optional filtering
	 * @param filter - Optional filter criteria
	 * @returns Result containing array of balance records or an error
	 */
	async getAllBalances(
		filter?: BalanceFilter
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError | DomainError>> {
		try {
			const result = await this.repository.findAll(filter);
			if (result.isError) {
				return result;
			}
			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch balance records', 'BALANCES_FETCH_FAILED', {
					filter,
					originalError: error
				})
			);
		}
	}

	/**
	 * Create a new time off balance record
	 * @param data - The balance data
	 * @returns Result containing the created balance record or an error
	 */
	async createBalance(
		data: CreateBalanceData
	): Promise<Result<TimeOffBalanceRecord, TimeOffBalanceValidationError | DomainError>> {
		try {
			// Validate value objects before delegating to repository
			const leaveTypeResult = LeaveType.create(data.leaveType);
			if (leaveTypeResult.isError) {
				return Result.error(leaveTypeResult.error);
			}

			const periodResult = BalancePeriod.create(data.year);
			if (periodResult.isError) {
				return Result.error(periodResult.error);
			}

			const totalHoursResult = BalanceHours.create(data.totalHours);
			if (totalHoursResult.isError) {
				return Result.error(totalHoursResult.error);
			}

			if (data.usedHours !== undefined) {
				const usedHoursResult = BalanceHours.create(data.usedHours);
				if (usedHoursResult.isError) {
					return Result.error(usedHoursResult.error);
				}
			}

			const accrualRateResult = AccrualRate.create(data.accrualRate, data.accrualPeriod);
			if (accrualRateResult.isError) {
				return Result.error(accrualRateResult.error);
			}

			if (data.carryoverHours !== undefined) {
				const carryoverResult = CarryoverHours.create(data.carryoverHours);
				if (carryoverResult.isError) {
					return Result.error(carryoverResult.error);
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
				new DomainError('Failed to create balance record', 'BALANCE_CREATE_FAILED', {
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Update an existing time off balance record
	 * @param id - The balance record ID
	 * @param data - The fields to update
	 * @returns Result containing the updated balance record or an error
	 */
	async updateBalance(
		id: string,
		data: UpdateBalanceData
	): Promise<
		Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError | TimeOffBalanceValidationError>
	> {
		try {
			// Validate value objects if provided
			if (data.totalHours !== undefined) {
				const totalHoursResult = BalanceHours.create(data.totalHours);
				if (totalHoursResult.isError) {
					return Result.error(totalHoursResult.error);
				}
			}

			if (data.usedHours !== undefined) {
				const usedHoursResult = BalanceHours.create(data.usedHours);
				if (usedHoursResult.isError) {
					return Result.error(usedHoursResult.error);
				}
			}

			if (data.accrualRate !== undefined && data.accrualPeriod !== undefined) {
				const accrualRateResult = AccrualRate.create(data.accrualRate, data.accrualPeriod);
				if (accrualRateResult.isError) {
					return Result.error(accrualRateResult.error);
				}
			}

			if (data.carryoverHours !== undefined) {
				const carryoverResult = CarryoverHours.create(data.carryoverHours);
				if (carryoverResult.isError) {
					return Result.error(carryoverResult.error);
				}
			}

			const result = await this.repository.update(id, data);
			if (result.isError) {
				return result;
			}

			return Result.ok(result.value);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to update balance record', 'BALANCE_UPDATE_FAILED', {
					balanceId: id,
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Deduct hours from a balance record
	 * Delegates to the entity's useHours method
	 * @param id - The balance record ID
	 * @param hours - The hours to deduct
	 * @returns Result containing the updated balance record or an error
	 */
	async useBalance(
		id: string,
		hours: number
	): Promise<
		Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError | TimeOffBalanceValidationError>
	> {
		try {
			// Validate hours
			const hoursResult = BalanceHours.create(hours);
			if (hoursResult.isError) {
				return Result.error(hoursResult.error);
			}

			// Fetch current balance
			const balanceResult = await this.repository.findById(id);
			if (balanceResult.isError) {
				return balanceResult;
			}

			// Use entity method to deduct hours
			const useResult = balanceResult.value.useHours(hoursResult.value);
			if (useResult.isError) {
				return Result.error(useResult.error);
			}

			// Update repository
			const updateResult = await this.repository.update(id, {
				usedHours: useResult.value.usedHours.value
			});

			return updateResult;
		} catch (error) {
			return Result.error(
				new DomainError('Failed to use balance hours', 'BALANCE_USE_FAILED', {
					balanceId: id,
					hours,
					originalError: error
				})
			);
		}
	}

	/**
	 * Add hours to a balance record
	 * Delegates to the entity's addHours method
	 * @param id - The balance record ID
	 * @param hours - The hours to add
	 * @returns Result containing the updated balance record or an error
	 */
	async addBalance(
		id: string,
		hours: number
	): Promise<
		Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError | TimeOffBalanceValidationError>
	> {
		try {
			// Validate hours
			const hoursResult = BalanceHours.create(hours);
			if (hoursResult.isError) {
				return Result.error(hoursResult.error);
			}

			// Fetch current balance
			const balanceResult = await this.repository.findById(id);
			if (balanceResult.isError) {
				return balanceResult;
			}

			// Use entity method to add hours
			const addResult = balanceResult.value.addHours(hoursResult.value);
			if (addResult.isError) {
				return Result.error(addResult.error);
			}

			// Update repository
			const updateResult = await this.repository.update(id, {
				totalHours: addResult.value.totalHours.value
			});

			return updateResult;
		} catch (error) {
			return Result.error(
				new DomainError('Failed to add balance hours', 'BALANCE_ADD_FAILED', {
					balanceId: id,
					hours,
					originalError: error
				})
			);
		}
	}

	/**
	 * Rollover a balance to a new period
	 * Delegates to the entity's rollover method
	 * @param id - The balance record ID
	 * @param newYear - The new period year
	 * @returns Result containing the new balance record or an error
	 */
	async rolloverBalance(
		id: string,
		newYear: number
	): Promise<Result<TimeOffBalanceRecord, TimeOffBalanceValidationError | DomainError>> {
		try {
			// Validate year
			const periodResult = BalancePeriod.create(newYear);
			if (periodResult.isError) {
				return Result.error(periodResult.error);
			}

			// Fetch current balance
			const balanceResult = await this.repository.findById(id);
			if (balanceResult.isError) {
				return Result.error(
					new DomainError('Balance not found for rollover', 'BALANCE_ROLLOVER_NOT_FOUND', {
						balanceId: id
					})
				);
			}

			// Use entity method to create rolled over balance
			const rolloverResult = balanceResult.value.rollover(periodResult.value);
			if (rolloverResult.isError) {
				return Result.error(rolloverResult.error);
			}

			// Create new balance record in repository
			const createResult = await this.repository.create({
				employeeId: rolloverResult.value.employeeId,
				leaveType: rolloverResult.value.leaveType.value,
				year: rolloverResult.value.period.year,
				totalHours: rolloverResult.value.totalHours.value,
				usedHours: rolloverResult.value.usedHours.value,
				accrualRate: rolloverResult.value.accrualRate.value,
				accrualPeriod: rolloverResult.value.accrualRate.period,
				carryoverHours: rolloverResult.value.carryoverHours.value
			});

			return createResult;
		} catch (error) {
			return Result.error(
				new DomainError('Failed to rollover balance', 'BALANCE_ROLLOVER_FAILED', {
					balanceId: id,
					newYear,
					originalError: error
				})
			);
		}
	}

	/**
	 * Delete a time off balance record
	 * @param id - The balance record ID
	 * @returns Result indicating success or an error
	 */
	async deleteBalance(
		id: string
	): Promise<Result<void, TimeOffBalanceNotFoundError | DomainError>> {
		try {
			const result = await this.repository.delete(id);
			if (result.isError) {
				return result;
			}
			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to delete balance record', 'BALANCE_DELETE_FAILED', {
					balanceId: id,
					originalError: error
				})
			);
		}
	}
}
