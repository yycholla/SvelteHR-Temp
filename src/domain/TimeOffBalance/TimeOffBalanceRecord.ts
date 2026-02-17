// src/domain/TimeOffBalance/TimeOffBalanceRecord.ts
import { Result } from '$domain/Result';
import { BalanceHours } from './value-objects/BalanceHours';
import { CarryoverHours } from './value-objects/CarryoverHours';
import { LeaveType } from './value-objects/LeaveType';
import { BalancePeriod } from './value-objects/BalancePeriod';
import { AccrualRate } from './value-objects/AccrualRate';
import {
	TimeOffBalanceValidationError,
	InsufficientBalanceError,
	InvalidAccrualCalculationError
} from './errors/TimeOffBalanceErrors';

interface TimeOffBalanceRecordProps {
	readonly id: string;
	readonly employeeId: string;
	readonly leaveType: LeaveType;
	readonly period: BalancePeriod;
	readonly totalHours: BalanceHours;
	readonly usedHours: BalanceHours;
	readonly accrualRate: AccrualRate;
	readonly carryoverHours: CarryoverHours;
}

/**
 * TimeOffBalanceRecord entity representing a time off balance for an employee for a specific period.
 * Aggregate root combining all value objects and business logic for balance management.
 *
 * @example
 * ```typescript
 * const result = TimeOffBalanceRecord.create({
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   employeeId: '660e8400-e29b-41d4-a716-446655440000',
 *   leaveType: LeaveType.create('vacation').value,
 *   period: BalancePeriod.create(2026).value,
 *   totalHours: BalanceHours.create(160).value,
 *   usedHours: BalanceHours.create(40).value,
 *   accrualRate: AccrualRate.create(5).value,
 *   carryoverHours: CarryoverHours.create(20).value
 * });
 *
 * if (result.isOk) {
 *   const record = result.value;
 *   console.log(record.availableHours.value); // 120
 * }
 * ```
 */
export class TimeOffBalanceRecord {
	private constructor(private readonly props: TimeOffBalanceRecordProps) {}

	/**
	 * Creates a new TimeOffBalanceRecord instance.
	 *
	 * Validates:
	 * - Both IDs are valid UUIDs
	 * - Used hours do not exceed total hours
	 *
	 * @param data - The properties for the time off balance record
	 * @returns Result containing TimeOffBalanceRecord or validation error
	 */
	static create(
		data: TimeOffBalanceRecordProps
	): Result<TimeOffBalanceRecord, TimeOffBalanceValidationError> {
		// Validate UUID format for IDs
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

		if (!uuidRegex.test(data.id)) {
			return Result.error(
				new TimeOffBalanceValidationError('TimeOffBalanceRecord ID must be a valid UUID')
			);
		}

		if (!uuidRegex.test(data.employeeId)) {
			return Result.error(new TimeOffBalanceValidationError('Employee ID must be a valid UUID'));
		}

		// Validate used hours do not exceed total
		if (!data.totalHours.isSufficient(data.usedHours)) {
			return Result.error(
				new TimeOffBalanceValidationError('Used hours cannot exceed total hours')
			);
		}

		return Result.ok(new TimeOffBalanceRecord(data));
	}

	get id(): string {
		return this.props.id;
	}

	get employeeId(): string {
		return this.props.employeeId;
	}

	get leaveType(): LeaveType {
		return this.props.leaveType;
	}

	get period(): BalancePeriod {
		return this.props.period;
	}

	get totalHours(): BalanceHours {
		return this.props.totalHours;
	}

	get usedHours(): BalanceHours {
		return this.props.usedHours;
	}

	get accrualRate(): AccrualRate {
		return this.props.accrualRate;
	}

	get carryoverHours(): CarryoverHours {
		return this.props.carryoverHours;
	}

	/**
	 * Calculates the available (remaining) hours in this balance.
	 * Available = total hours - used hours
	 */
	get availableHours(): BalanceHours {
		return this.props.totalHours.subtract(this.props.usedHours).value;
	}

	/**
	 * Deducts the specified hours from the available balance.
	 * Returns a new immutable instance if successful.
	 *
	 * Validates that the requested hours do not exceed available balance.
	 *
	 * @param hours - Hours to use
	 * @returns Result containing new TimeOffBalanceRecord or error
	 *
	 * @example
	 * ```typescript
	 * const record = TimeOffBalanceRecord.create({...}).value;
	 * const result = record.useHours(BalanceHours.create(8).value);
	 * if (result.isOk) {
	 *   console.log(result.value.availableHours.value);
	 * }
	 * ```
	 */
	useHours(hours: BalanceHours): Result<TimeOffBalanceRecord, InsufficientBalanceError> {
		// Check if sufficient balance exists
		if (!this.availableHours.isSufficient(hours)) {
			return Result.error(new InsufficientBalanceError(hours.value, this.availableHours.value));
		}

		// Add to used hours
		const newUsedResult = this.props.usedHours.add(hours);
		if (newUsedResult.isError) {
			return Result.error(new InsufficientBalanceError(hours.value, this.availableHours.value));
		}

		return Result.ok(
			new TimeOffBalanceRecord({
				...this.props,
				usedHours: newUsedResult.value
			})
		);
	}

	/**
	 * Adds the specified hours to the total balance.
	 * Returns a new immutable instance if successful.
	 *
	 * Can be used for bonuses, accruals, or corrections.
	 *
	 * @param hours - Hours to add
	 * @returns Result containing new TimeOffBalanceRecord or error
	 *
	 * @example
	 * ```typescript
	 * const record = TimeOffBalanceRecord.create({...}).value;
	 * const result = record.addHours(BalanceHours.create(40).value);
	 * if (result.isOk) {
	 *   console.log(result.value.totalHours.value);
	 * }
	 * ```
	 */
	addHours(hours: BalanceHours): Result<TimeOffBalanceRecord, TimeOffBalanceValidationError> {
		// Add to total hours
		const newTotalResult = this.props.totalHours.add(hours);
		if (newTotalResult.isError) {
			return Result.error(
				new TimeOffBalanceValidationError(`Cannot add ${hours.value} hours: would exceed maximum`)
			);
		}

		return Result.ok(
			new TimeOffBalanceRecord({
				...this.props,
				totalHours: newTotalResult.value
			})
		);
	}

	/**
	 * Creates a new balance for the next period with carryover.
	 * Calculates carryover as currently available hours, accrues new hours based on accrual rate,
	 * and resets used hours to zero.
	 *
	 * Formula: newTotal = availableHours + (accrualRate annual conversion)
	 *
	 * @param newPeriod - The new period (typically next year)
	 * @returns Result containing new TimeOffBalanceRecord or error
	 *
	 * @example
	 * ```typescript
	 * const currentRecord = TimeOffBalanceRecord.create({...}).value;
	 * const nextPeriod = BalancePeriod.create(2027).value;
	 * const result = currentRecord.rollover(nextPeriod);
	 * if (result.isOk) {
	 *   console.log(result.value.period.year); // 2027
	 * }
	 * ```
	 */
	rollover(newPeriod: BalancePeriod): Result<TimeOffBalanceRecord, TimeOffBalanceValidationError> {
		// Calculate carryover from available hours
		const carryoverResult = CarryoverHours.create(this.availableHours.value);
		if (carryoverResult.isError) {
			return Result.error(
				new TimeOffBalanceValidationError(
					`Invalid carryover hours: ${carryoverResult.error.message}`
				)
			);
		}
		const carryover = carryoverResult.value;

		// Calculate annual accrual using toAnnual() method
		const annualAccrual = this.props.accrualRate.toAnnual();

		// Calculate new total: carryover + annual accrual
		const newTotalResult = BalanceHours.create(carryover.value + annualAccrual);
		if (newTotalResult.isError) {
			return Result.error(
				new TimeOffBalanceValidationError(
					`New total would exceed maximum: carryover (${carryover.value}) + accrual (${annualAccrual}) exceeds 1000`
				)
			);
		}

		// Create new record with reset used hours and new period
		const result = TimeOffBalanceRecord.create({
			...this.props,
			period: newPeriod,
			totalHours: newTotalResult.value,
			usedHours: BalanceHours.create(0).value,
			carryoverHours: carryover
		});

		return result;
	}

	/**
	 * Checks equality with another TimeOffBalanceRecord.
	 * Equality is based on record ID only.
	 *
	 * @param other - The other TimeOffBalanceRecord to compare
	 * @returns True if IDs are equal
	 */
	equals(other: TimeOffBalanceRecord): boolean {
		return this.props.id === other.props.id;
	}
}
