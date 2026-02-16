// src/adapters/graphql/GraphQLAttendanceAdapter.ts
import { gql } from '@urql/core';
import { Result } from '$domain/Result';
import {
	AttendanceRecord,
	ClockInTime,
	ClockOutTime,
	ShiftType,
	AttendanceStatus,
	LateReason,
	WorkHours,
	OvertimeHours
} from '$domain/Attendance';
import { AttendanceNotFoundError, DomainError } from '$domain/errors';
import type { AttendanceRepository } from '$services/AttendanceRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for attendance
 */
interface GraphQLAttendance {
	id: string;
	employeeId: string;
	date: string;
	clockInTime: string;
	clockOutTime: string | null;
	shiftType: string;
	status: string;
	lateReason: string | null;
	workHours: number | null;
	overtimeHours: number | null;
}

/**
 * GraphQLAttendanceAdapter implements AttendanceRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLAttendanceAdapter(graphqlPort);
 * const result = await adapter.findById('attendance-123');
 * if (result.isOk && result.value) {
 *   console.log(result.value.clockInTime);
 * }
 * ```
 */
export class GraphQLAttendanceAdapter implements AttendanceRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<AttendanceRecord | null, DomainError>> {
		const query = gql`
			query GetAttendance($id: UUID!) {
				attendance(id: $id) {
					id
					employeeId
					date
					clockInTime
					clockOutTime
					shiftType
					status
					lateReason
					workHours
					overtimeHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ attendance: GraphQLAttendance | null }>(query, {
				id
			});

			if (!result?.attendance) {
				return Result.ok(null);
			}

			const attendance = this.mapToAttendanceRecord(result.attendance);
			return Result.ok(attendance);
		} catch (error) {
			return Result.ok(null);
		}
	}

	async findByEmployeeId(employeeId: string): Promise<Result<AttendanceRecord[], DomainError>> {
		const query = gql`
			query GetAttendancesByEmployee($employeeId: UUID!) {
				attendancesByEmployee(employeeId: $employeeId) {
					id
					employeeId
					date
					clockInTime
					clockOutTime
					shiftType
					status
					lateReason
					workHours
					overtimeHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ attendancesByEmployee: GraphQLAttendance[] }>(
				query,
				{ employeeId }
			);

			const attendances = (result?.attendancesByEmployee ?? [])
				.map((a) => this.mapToAttendanceRecord(a))
				.filter((a): a is AttendanceRecord => a !== null);

			return Result.ok(attendances);
		} catch (error) {
			return Result.error(
				new DomainError(
					`Failed to fetch attendances: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'FETCH_FAILED'
				)
			);
		}
	}

	async findByEmployeeAndDateRange(
		employeeId: string,
		startDate: Date,
		endDate: Date
	): Promise<Result<AttendanceRecord[], DomainError>> {
		const query = gql`
			query GetAttendancesByDateRange(
				$employeeId: UUID!
				$startDate: DateTime!
				$endDate: DateTime!
			) {
				attendancesByDateRange(employeeId: $employeeId, startDate: $startDate, endDate: $endDate) {
					id
					employeeId
					date
					clockInTime
					clockOutTime
					shiftType
					status
					lateReason
					workHours
					overtimeHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ attendancesByDateRange: GraphQLAttendance[] }>(
				query,
				{
					employeeId,
					startDate: startDate.toISOString(),
					endDate: endDate.toISOString()
				}
			);

			const attendances = (result?.attendancesByDateRange ?? [])
				.map((a) => this.mapToAttendanceRecord(a))
				.filter((a): a is AttendanceRecord => a !== null);

			return Result.ok(attendances);
		} catch (error) {
			return Result.error(
				new DomainError(
					`Failed to fetch attendances by date range: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'FETCH_FAILED'
				)
			);
		}
	}

	async findByEmployeeAndDate(
		employeeId: string,
		date: Date
	): Promise<Result<AttendanceRecord | null, DomainError>> {
		const query = gql`
			query GetAttendanceByDate($employeeId: UUID!, $date: DateTime!) {
				attendanceByDate(employeeId: $employeeId, date: $date) {
					id
					employeeId
					date
					clockInTime
					clockOutTime
					shiftType
					status
					lateReason
					workHours
					overtimeHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ attendanceByDate: GraphQLAttendance | null }>(
				query,
				{
					employeeId,
					date: date.toISOString()
				}
			);

			if (!result?.attendanceByDate) {
				return Result.ok(null);
			}

			const attendance = this.mapToAttendanceRecord(result.attendanceByDate);
			return Result.ok(attendance);
		} catch (error) {
			return Result.ok(null);
		}
	}

	async findAll(): Promise<Result<AttendanceRecord[], DomainError>> {
		const query = gql`
			query GetAllAttendances {
				allAttendances {
					id
					employeeId
					date
					clockInTime
					clockOutTime
					shiftType
					status
					lateReason
					workHours
					overtimeHours
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ allAttendances: GraphQLAttendance[] }>(query);

			const attendances = (result?.allAttendances ?? [])
				.map((a) => this.mapToAttendanceRecord(a))
				.filter((a): a is AttendanceRecord => a !== null);

			return Result.ok(attendances);
		} catch (error) {
			return Result.error(
				new DomainError(
					`Failed to fetch all attendances: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'FETCH_FAILED'
				)
			);
		}
	}

	async save(record: AttendanceRecord): Promise<Result<AttendanceRecord, DomainError>> {
		const mutation = gql`
			mutation SaveAttendance($input: AttendanceInput!) {
				saveAttendance(input: $input) {
					id
					employeeId
					date
					clockInTime
					clockOutTime
					shiftType
					status
					lateReason
					workHours
					overtimeHours
				}
			}
		`;

		try {
			const input = {
				id: record.id,
				employeeId: record.employeeId,
				date: record.date.toISOString(),
				clockInTime: record.clockInTime.value.toISOString(),
				clockOutTime: record.clockOutTime?.value.toISOString() ?? null,
				shiftType: record.shiftType.value,
				status: record.status.value,
				lateReason: record.lateReason?.value ?? null,
				workHours: record.workHours?.value ?? null,
				overtimeHours: record.overtimeHours?.value ?? null
			};

			const result = await this.graphql.mutation<{ saveAttendance: GraphQLAttendance }>(mutation, {
				input
			});

			if (!result?.saveAttendance) {
				return Result.error(new DomainError('Failed to save attendance record', 'SAVE_FAILED'));
			}

			const savedRecord = this.mapToAttendanceRecord(result.saveAttendance);
			if (!savedRecord) {
				return Result.error(
					new DomainError('Invalid attendance data returned from save', 'INVALID_DATA')
				);
			}

			return Result.ok(savedRecord);
		} catch (error) {
			return Result.error(
				new DomainError(
					`Failed to save attendance: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'SAVE_FAILED'
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, DomainError>> {
		const mutation = gql`
			mutation DeleteAttendance($id: UUID!) {
				deleteAttendance(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteAttendance: boolean }>(mutation, { id });

			if (!result?.deleteAttendance) {
				return Result.error(new AttendanceNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new AttendanceNotFoundError(id));
		}
	}

	async saveBulk(records: AttendanceRecord[]): Promise<Result<AttendanceRecord[], DomainError>> {
		const mutation = gql`
			mutation SaveBulkAttendances($inputs: [AttendanceInput!]!) {
				saveBulkAttendances(inputs: $inputs) {
					id
					employeeId
					date
					clockInTime
					clockOutTime
					shiftType
					status
					lateReason
					workHours
					overtimeHours
				}
			}
		`;

		try {
			const inputs = records.map((record) => ({
				id: record.id,
				employeeId: record.employeeId,
				date: record.date.toISOString(),
				clockInTime: record.clockInTime.value.toISOString(),
				clockOutTime: record.clockOutTime?.value.toISOString() ?? null,
				shiftType: record.shiftType.value,
				status: record.status.value,
				lateReason: record.lateReason?.value ?? null,
				workHours: record.workHours?.value ?? null,
				overtimeHours: record.overtimeHours?.value ?? null
			}));

			const result = await this.graphql.mutation<{ saveBulkAttendances: GraphQLAttendance[] }>(
				mutation,
				{ inputs }
			);

			const savedRecords = (result?.saveBulkAttendances ?? [])
				.map((a) => this.mapToAttendanceRecord(a))
				.filter((a): a is AttendanceRecord => a !== null);

			return Result.ok(savedRecords);
		} catch (error) {
			return Result.error(
				new DomainError(
					`Failed to bulk save attendances: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'BULK_SAVE_FAILED'
				)
			);
		}
	}

	async countByEmployeeId(employeeId: string): Promise<Result<number, DomainError>> {
		const query = gql`
			query CountAttendancesByEmployee($employeeId: UUID!) {
				countAttendancesByEmployee(employeeId: $employeeId)
			}
		`;

		try {
			const result = await this.graphql.query<{ countAttendancesByEmployee: number }>(query, {
				employeeId
			});

			return Result.ok(result?.countAttendancesByEmployee ?? 0);
		} catch (error) {
			return Result.error(
				new DomainError(
					`Failed to count attendances: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'COUNT_FAILED'
				)
			);
		}
	}

	async existsByEmployeeAndDate(
		employeeId: string,
		date: Date
	): Promise<Result<boolean, DomainError>> {
		const query = gql`
			query AttendanceExistsByDate($employeeId: UUID!, $date: DateTime!) {
				attendanceExistsByDate(employeeId: $employeeId, date: $date)
			}
		`;

		try {
			const result = await this.graphql.query<{ attendanceExistsByDate: boolean }>(query, {
				employeeId,
				date: date.toISOString()
			});

			return Result.ok(result?.attendanceExistsByDate ?? false);
		} catch (error) {
			return Result.error(
				new DomainError(
					`Failed to check attendance existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
					'EXISTS_CHECK_FAILED'
				)
			);
		}
	}

	/**
	 * Map GraphQL attendance data to domain AttendanceRecord entity
	 * @private
	 * @returns AttendanceRecord entity or null if data is invalid (resilient error handling)
	 */
	private mapToAttendanceRecord(data: GraphQLAttendance): AttendanceRecord | null {
		try {
			// Create clock in time
			const clockInResult = ClockInTime.create(new Date(data.clockInTime));
			if (clockInResult.isError) return null;

			// Create clock out time (optional)
			let clockOutTime: ClockOutTime | null = null;
			if (data.clockOutTime) {
				const clockOutResult = ClockOutTime.create(
					new Date(data.clockOutTime),
					clockInResult.value
				);
				if (clockOutResult.isError) return null;
				clockOutTime = clockOutResult.value;
			}

			// Create shift type
			const shiftTypeResult = ShiftType.create(data.shiftType);
			if (shiftTypeResult.isError) return null;

			// Create status
			const statusResult = AttendanceStatus.create(data.status);
			if (statusResult.isError) return null;

			// Create late reason (optional)
			let lateReason: LateReason | null = null;
			if (data.lateReason) {
				const lateReasonResult = LateReason.create(data.lateReason);
				if (lateReasonResult.isError) return null;
				lateReason = lateReasonResult.value;
			}

			// Create work hours (optional)
			let workHours: WorkHours | null = null;
			if (data.workHours !== null && data.workHours !== undefined) {
				const workHoursResult = WorkHours.create(data.workHours);
				if (workHoursResult.isError) return null;
				workHours = workHoursResult.value;
			}

			// Create overtime hours (optional)
			let overtimeHours: OvertimeHours | null = null;
			if (data.overtimeHours !== null && data.overtimeHours !== undefined) {
				const overtimeHoursResult = OvertimeHours.create(data.overtimeHours);
				if (overtimeHoursResult.isError) return null;
				overtimeHours = overtimeHoursResult.value;
			}

			// Create entity
			const recordResult = AttendanceRecord.create({
				id: data.id,
				employeeId: data.employeeId,
				date: new Date(data.date),
				clockInTime: clockInResult.value,
				clockOutTime,
				shiftType: shiftTypeResult.value,
				status: statusResult.value,
				lateReason,
				workHours,
				overtimeHours
			});

			if (recordResult.isError) return null;

			return recordResult.value;
		} catch (error) {
			return null; // Resilient - return null for invalid data
		}
	}
}
