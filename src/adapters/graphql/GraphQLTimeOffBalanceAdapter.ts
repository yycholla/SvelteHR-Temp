// src/adapters/graphql/GraphQLTimeOffBalanceAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	TimeOffBalanceRecord,
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
} from '$services/ports/TimeOffBalanceRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import type { AccrualPeriod } from '$domain/TimeOffBalance/value-objects/AccrualRate';

/**
 * GraphQL schema response shape for time off balance records
 */
interface GraphQLTimeOffBalance {
	id: string;
	employeeId: string;
	leaveType: string;
	year: number;
	totalHours: number;
	usedHours: number;
	accrualRate: number;
	accrualPeriod: string;
	carryoverHours: number;
}

/**
 * GraphQLTimeOffBalanceAdapter implements TimeOffBalanceRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLTimeOffBalanceAdapter(graphqlPort);
 * const result = await adapter.findById('balance-123');
 * if (result.isOk) {
 *   console.log(result.value.availableHours.value);
 * }
 * ```
 */
export class GraphQLTimeOffBalanceAdapter implements TimeOffBalanceRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError>> {
		const query = gql`
			query GetTimeOffBalance($id: UUID!) {
				timeOffBalance(id: $id) {
					id
					employeeId
					leaveType
					year
					totalHours
					usedHours
					accrualRate
					accrualPeriod
					carryoverHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ timeOffBalance: GraphQLTimeOffBalance | null }>(
				query,
				{ id }
			);

			if (!result?.timeOffBalance) {
				return Result.error(new TimeOffBalanceNotFoundError(id));
			}

			const balance = this.mapToTimeOffBalanceRecord(result.timeOffBalance);
			if (!balance) {
				return Result.error(new TimeOffBalanceNotFoundError(id));
			}

			return Result.ok(balance);
		} catch (error) {
			return Result.error(new TimeOffBalanceNotFoundError(id));
		}
	}

	async findByEmployeeId(
		employeeId: string
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError>> {
		const query = gql`
			query GetTimeOffBalancesByEmployee($employeeId: UUID!) {
				timeOffBalancesByEmployee(employeeId: $employeeId) {
					id
					employeeId
					leaveType
					year
					totalHours
					usedHours
					accrualRate
					accrualPeriod
					carryoverHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				timeOffBalancesByEmployee: GraphQLTimeOffBalance[];
			}>(query, { employeeId });

			const balances = (result?.timeOffBalancesByEmployee ?? [])
				.map((b) => this.mapToTimeOffBalanceRecord(b))
				.filter((b): b is TimeOffBalanceRecord => b !== null);

			return Result.ok(balances);
		} catch (error) {
			return Result.error(
				new InvalidAccrualCalculationError(
					`Failed to fetch balances for employee: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findByEmployeeIdAndType(
		employeeId: string,
		leaveType: string
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError>> {
		const query = gql`
			query GetTimeOffBalancesByType($employeeId: UUID!, $leaveType: String!) {
				timeOffBalancesByType(employeeId: $employeeId, leaveType: $leaveType) {
					id
					employeeId
					leaveType
					year
					totalHours
					usedHours
					accrualRate
					accrualPeriod
					carryoverHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				timeOffBalancesByType: GraphQLTimeOffBalance[];
			}>(query, { employeeId, leaveType });

			const balances = (result?.timeOffBalancesByType ?? [])
				.map((b) => this.mapToTimeOffBalanceRecord(b))
				.filter((b): b is TimeOffBalanceRecord => b !== null);

			return Result.ok(balances);
		} catch (error) {
			return Result.error(
				new InvalidAccrualCalculationError(
					`Failed to fetch balances by type: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findByPeriod(
		year: number
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError>> {
		const query = gql`
			query GetTimeOffBalancesByPeriod($year: Int!) {
				timeOffBalancesByPeriod(year: $year) {
					id
					employeeId
					leaveType
					year
					totalHours
					usedHours
					accrualRate
					accrualPeriod
					carryoverHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				timeOffBalancesByPeriod: GraphQLTimeOffBalance[];
			}>(query, { year });

			const balances = (result?.timeOffBalancesByPeriod ?? [])
				.map((b) => this.mapToTimeOffBalanceRecord(b))
				.filter((b): b is TimeOffBalanceRecord => b !== null);

			return Result.ok(balances);
		} catch (error) {
			return Result.error(
				new InvalidAccrualCalculationError(
					`Failed to fetch balances by period: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findAll(
		filter?: BalanceFilter
	): Promise<Result<TimeOffBalanceRecord[], InvalidAccrualCalculationError>> {
		const query = gql`
			query GetTimeOffBalances(
				$employeeId: UUID
				$leaveType: String
				$year: Int
				$hasAvailableHours: Boolean
				$limit: Int
				$offset: Int
			) {
				timeOffBalances(
					employeeId: $employeeId
					leaveType: $leaveType
					year: $year
					hasAvailableHours: $hasAvailableHours
					limit: $limit
					offset: $offset
				) {
					id
					employeeId
					leaveType
					year
					totalHours
					usedHours
					accrualRate
					accrualPeriod
					carryoverHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ timeOffBalances: GraphQLTimeOffBalance[] }>(
				query,
				filter ?? {}
			);

			const balances = (result?.timeOffBalances ?? [])
				.map((b) => this.mapToTimeOffBalanceRecord(b))
				.filter((b): b is TimeOffBalanceRecord => b !== null);

			return Result.ok(balances);
		} catch (error) {
			return Result.error(
				new InvalidAccrualCalculationError(
					`Failed to fetch balances: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(
		data: CreateBalanceData
	): Promise<Result<TimeOffBalanceRecord, TimeOffBalanceValidationError>> {
		const mutation = gql`
			mutation CreateTimeOffBalance($input: CreateTimeOffBalanceInput!) {
				createTimeOffBalance(input: $input) {
					id
					employeeId
					leaveType
					year
					totalHours
					usedHours
					accrualRate
					accrualPeriod
					carryoverHours
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				createTimeOffBalance: GraphQLTimeOffBalance;
			}>(mutation, { input: data });

			if (!result?.createTimeOffBalance) {
				return Result.error(
					new TimeOffBalanceValidationError('Failed to create time off balance record')
				);
			}

			const balance = this.mapToTimeOffBalanceRecord(result.createTimeOffBalance);
			if (!balance) {
				return Result.error(
					new TimeOffBalanceValidationError('Invalid time off balance data returned')
				);
			}

			return Result.ok(balance);
		} catch (error) {
			return Result.error(
				new TimeOffBalanceValidationError(
					`Failed to create balance: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(
		id: string,
		data: UpdateBalanceData
	): Promise<
		Result<TimeOffBalanceRecord, TimeOffBalanceNotFoundError | TimeOffBalanceValidationError>
	> {
		const mutation = gql`
			mutation UpdateTimeOffBalance($id: UUID!, $input: UpdateTimeOffBalanceInput!) {
				updateTimeOffBalance(id: $id, input: $input) {
					id
					employeeId
					leaveType
					year
					totalHours
					usedHours
					accrualRate
					accrualPeriod
					carryoverHours
				}
			}
		`;

		try {
			const result = await this.graphql.mutation<{
				updateTimeOffBalance: GraphQLTimeOffBalance;
			}>(mutation, { id, input: data });

			if (!result?.updateTimeOffBalance) {
				return Result.error(new TimeOffBalanceNotFoundError(id));
			}

			const balance = this.mapToTimeOffBalanceRecord(result.updateTimeOffBalance);
			if (!balance) {
				return Result.error(
					new TimeOffBalanceValidationError('Invalid time off balance data returned')
				);
			}

			return Result.ok(balance);
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : 'Unknown error';
			if (errorMsg.toLowerCase().includes('not found')) {
				return Result.error(new TimeOffBalanceNotFoundError(id));
			}
			return Result.error(
				new TimeOffBalanceValidationError(`Failed to update balance: ${errorMsg}`)
			);
		}
	}

	async delete(id: string): Promise<Result<void, TimeOffBalanceNotFoundError>> {
		const mutation = gql`
			mutation DeleteTimeOffBalance($id: UUID!) {
				deleteTimeOffBalance(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteTimeOffBalance: boolean }>(mutation, {
				id
			});

			if (!result?.deleteTimeOffBalance) {
				return Result.error(new TimeOffBalanceNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new TimeOffBalanceNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL balance data to domain TimeOffBalanceRecord entity
	 * @private
	 * @returns TimeOffBalanceRecord entity or null if data is invalid (resilient error handling)
	 */
	private mapToTimeOffBalanceRecord(data: GraphQLTimeOffBalance): TimeOffBalanceRecord | null {
		try {
			// Create value objects with validation
			const leaveTypeResult = LeaveType.create(data.leaveType);
			if (leaveTypeResult.isError) return null;

			const periodResult = BalancePeriod.create(data.year);
			if (periodResult.isError) return null;

			const totalHoursResult = BalanceHours.create(data.totalHours);
			if (totalHoursResult.isError) return null;

			const usedHoursResult = BalanceHours.create(data.usedHours);
			if (usedHoursResult.isError) return null;

			const accrualRateResult = AccrualRate.create(
				data.accrualRate,
				data.accrualPeriod as AccrualPeriod
			);
			if (accrualRateResult.isError) return null;

			const carryoverResult = CarryoverHours.create(data.carryoverHours);
			if (carryoverResult.isError) return null;

			// Create entity
			const balanceResult = TimeOffBalanceRecord.create({
				id: data.id,
				employeeId: data.employeeId,
				leaveType: leaveTypeResult.value,
				period: periodResult.value,
				totalHours: totalHoursResult.value,
				usedHours: usedHoursResult.value,
				accrualRate: accrualRateResult.value,
				carryoverHours: carryoverResult.value
			});

			if (balanceResult.isError) return null;

			return balanceResult.value;
		} catch (error) {
			return null; // Resilient - return null for invalid data
		}
	}
}
