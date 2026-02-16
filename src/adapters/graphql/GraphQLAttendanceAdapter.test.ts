// src/adapters/graphql/GraphQLAttendanceAdapter.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GraphQLAttendanceAdapter } from './GraphQLAttendanceAdapter';
import { AttendanceRecord, ClockInTime, ShiftType, AttendanceStatus } from '$domain/Attendance';
import { AttendanceNotFoundError } from '$domain/errors';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * Mock GraphQLPort for testing
 */
class MockGraphQLPort implements GraphQLPort {
	private mockData: Record<string, unknown> = {};
	private shouldThrow = false;

	setMockData(data: Record<string, unknown>) {
		this.mockData = data;
		this.shouldThrow = false;
	}

	setShouldThrow(shouldThrow: boolean) {
		this.shouldThrow = shouldThrow;
	}

	async query<T>(operation: string, variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL query failed');
		}
		return this.mockData as T;
	}

	async mutation<T>(operation: string, variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL mutation failed');
		}
		return this.mockData as T;
	}
}

/**
 * Helper to create valid GraphQL attendance record data
 */
function createGraphQLAttendance(overrides = {}) {
	return {
		id: '123e4567-e89b-12d3-a456-426614174000',
		employeeId: '123e4567-e89b-12d3-a456-426614174001',
		date: '2025-01-15T00:00:00.000Z',
		clockInTime: '2025-01-15T09:00:00.000Z',
		clockOutTime: null,
		shiftType: 'morning',
		status: 'present',
		lateReason: null,
		workHours: null,
		overtimeHours: null,
		...overrides
	};
}

describe('GraphQLAttendanceAdapter', () => {
	let adapter: GraphQLAttendanceAdapter;
	let mockGraphQL: MockGraphQLPort;

	beforeEach(() => {
		mockGraphQL = new MockGraphQLPort();
		adapter = new GraphQLAttendanceAdapter(mockGraphQL);
	});

	describe('findById', () => {
		it('should return attendance record when found', async () => {
			const graphqlData = createGraphQLAttendance();
			mockGraphQL.setMockData({ attendance: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(AttendanceRecord);
			expect(result.value?.id).toBe('123e4567-e89b-12d3-a456-426614174000');
		});

		it('should return null when attendance not found', async () => {
			mockGraphQL.setMockData({ attendance: null });

			const result = await adapter.findById('nonexistent-id');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid attendance data', async () => {
			const invalidData = createGraphQLAttendance({ shiftType: 'invalid-shift' });
			mockGraphQL.setMockData({ attendance: invalidData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle GraphQL query errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('findByEmployeeId', () => {
		it('should return all attendance records for employee', async () => {
			const records = [
				createGraphQLAttendance({ id: '123e4567-e89b-12d3-a456-426614174000' }),
				createGraphQLAttendance({ id: '123e4567-e89b-12d3-a456-426614174002' })
			];
			mockGraphQL.setMockData({ attendancesByEmployee: records });

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no records found', async () => {
			mockGraphQL.setMockData({ attendancesByEmployee: [] });

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid records', async () => {
			const records = [
				createGraphQLAttendance({ id: '123e4567-e89b-12d3-a456-426614174000' }),
				createGraphQLAttendance({
					id: '123e4567-e89b-12d3-a456-426614174002',
					shiftType: 'invalid'
				})
			];
			mockGraphQL.setMockData({ attendancesByEmployee: records });

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should handle GraphQL query errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isError).toBe(true);
		});
	});

	describe('findByEmployeeAndDateRange', () => {
		it('should return attendance records in date range', async () => {
			const records = [
				createGraphQLAttendance({ date: '2025-01-15T00:00:00.000Z' }),
				createGraphQLAttendance({ date: '2025-01-16T00:00:00.000Z' })
			];
			mockGraphQL.setMockData({ attendancesByDateRange: records });

			const result = await adapter.findByEmployeeAndDateRange(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15'),
				new Date('2025-01-20')
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no records in range', async () => {
			mockGraphQL.setMockData({ attendancesByDateRange: [] });

			const result = await adapter.findByEmployeeAndDateRange(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15'),
				new Date('2025-01-20')
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle GraphQL query errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findByEmployeeAndDateRange(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15'),
				new Date('2025-01-20')
			);

			expect(result.isError).toBe(true);
		});
	});

	describe('findByEmployeeAndDate', () => {
		it('should return attendance record for specific date', async () => {
			const graphqlData = createGraphQLAttendance({ date: '2025-01-15T00:00:00.000Z' });
			mockGraphQL.setMockData({ attendanceByDate: graphqlData });

			const result = await adapter.findByEmployeeAndDate(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15')
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(AttendanceRecord);
		});

		it('should return null when no record for date', async () => {
			mockGraphQL.setMockData({ attendanceByDate: null });

			const result = await adapter.findByEmployeeAndDate(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15')
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle GraphQL query errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findByEmployeeAndDate(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15')
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('findAll', () => {
		it('should return all attendance records', async () => {
			const records = [
				createGraphQLAttendance({ id: '123e4567-e89b-12d3-a456-426614174000' }),
				createGraphQLAttendance({ id: '123e4567-e89b-12d3-a456-426614174002' })
			];
			mockGraphQL.setMockData({ allAttendances: records });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should return empty array when no records exist', async () => {
			mockGraphQL.setMockData({ allAttendances: [] });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle GraphQL query errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
		});
	});

	describe('save', () => {
		it('should create new attendance record', async () => {
			// Create valid domain entity
			const clockInResult = ClockInTime.create(new Date('2025-01-15T09:00:00.000Z'));
			const shiftResult = ShiftType.create('morning');
			const statusResult = AttendanceStatus.create('present');

			expect(clockInResult.isOk).toBe(true);
			expect(shiftResult.isOk).toBe(true);
			expect(statusResult.isOk).toBe(true);

			const recordResult = AttendanceRecord.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				date: new Date('2025-01-15'),
				clockInTime: clockInResult.value!,
				clockOutTime: null,
				shiftType: shiftResult.value!,
				status: statusResult.value!,
				lateReason: null,
				workHours: null,
				overtimeHours: null
			});

			expect(recordResult.isOk).toBe(true);

			const graphqlData = createGraphQLAttendance();
			mockGraphQL.setMockData({ saveAttendance: graphqlData });

			const result = await adapter.save(recordResult.value!);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeInstanceOf(AttendanceRecord);
		});

		it('should handle save errors', async () => {
			const clockInResult = ClockInTime.create(new Date('2025-01-15T09:00:00.000Z'));
			const shiftResult = ShiftType.create('morning');
			const statusResult = AttendanceStatus.create('present');

			const recordResult = AttendanceRecord.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				date: new Date('2025-01-15'),
				clockInTime: clockInResult.value!,
				clockOutTime: null,
				shiftType: shiftResult.value!,
				status: statusResult.value!,
				lateReason: null,
				workHours: null,
				overtimeHours: null
			});

			mockGraphQL.setShouldThrow(true);

			const result = await adapter.save(recordResult.value!);

			expect(result.isError).toBe(true);
		});
	});

	describe('delete', () => {
		it('should delete attendance record', async () => {
			mockGraphQL.setMockData({ deleteAttendance: true });

			const result = await adapter.delete('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
		});

		it('should handle deletion errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.delete('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AttendanceNotFoundError);
		});

		it('should handle when record not found for deletion', async () => {
			mockGraphQL.setMockData({ deleteAttendance: false });

			const result = await adapter.delete('nonexistent-id');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AttendanceNotFoundError);
		});
	});

	describe('saveBulk', () => {
		it('should save multiple attendance records', async () => {
			const clockInResult = ClockInTime.create(new Date('2025-01-15T09:00:00.000Z'));
			const shiftResult = ShiftType.create('morning');
			const statusResult = AttendanceStatus.create('present');

			const record1Result = AttendanceRecord.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				date: new Date('2025-01-15'),
				clockInTime: clockInResult.value!,
				clockOutTime: null,
				shiftType: shiftResult.value!,
				status: statusResult.value!,
				lateReason: null,
				workHours: null,
				overtimeHours: null
			});

			const record2Result = AttendanceRecord.create({
				id: '123e4567-e89b-12d3-a456-426614174002',
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				date: new Date('2025-01-16'),
				clockInTime: clockInResult.value!,
				clockOutTime: null,
				shiftType: shiftResult.value!,
				status: statusResult.value!,
				lateReason: null,
				workHours: null,
				overtimeHours: null
			});

			const graphqlRecords = [
				createGraphQLAttendance({ id: '123e4567-e89b-12d3-a456-426614174000' }),
				createGraphQLAttendance({ id: '123e4567-e89b-12d3-a456-426614174002' })
			];
			mockGraphQL.setMockData({ saveBulkAttendances: graphqlRecords });

			const result = await adapter.saveBulk([record1Result.value!, record2Result.value!]);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
		});

		it('should handle bulk save errors', async () => {
			const clockInResult = ClockInTime.create(new Date('2025-01-15T09:00:00.000Z'));
			const shiftResult = ShiftType.create('morning');
			const statusResult = AttendanceStatus.create('present');

			const recordResult = AttendanceRecord.create({
				id: '123e4567-e89b-12d3-a456-426614174000',
				employeeId: '123e4567-e89b-12d3-a456-426614174001',
				date: new Date('2025-01-15'),
				clockInTime: clockInResult.value!,
				clockOutTime: null,
				shiftType: shiftResult.value!,
				status: statusResult.value!,
				lateReason: null,
				workHours: null,
				overtimeHours: null
			});

			mockGraphQL.setShouldThrow(true);

			const result = await adapter.saveBulk([recordResult.value!]);

			expect(result.isError).toBe(true);
		});
	});

	describe('countByEmployeeId', () => {
		it('should return count of employee attendance records', async () => {
			mockGraphQL.setMockData({ countAttendancesByEmployee: 15 });

			const result = await adapter.countByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(15);
		});

		it('should return 0 when no records found', async () => {
			mockGraphQL.setMockData({ countAttendancesByEmployee: 0 });

			const result = await adapter.countByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(0);
		});

		it('should handle GraphQL query errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.countByEmployeeId('123e4567-e89b-12d3-a456-426614174001');

			expect(result.isError).toBe(true);
		});
	});

	describe('existsByEmployeeAndDate', () => {
		it('should return true when record exists', async () => {
			mockGraphQL.setMockData({ attendanceExistsByDate: true });

			const result = await adapter.existsByEmployeeAndDate(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15')
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(true);
		});

		it('should return false when record does not exist', async () => {
			mockGraphQL.setMockData({ attendanceExistsByDate: false });

			const result = await adapter.existsByEmployeeAndDate(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15')
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(false);
		});

		it('should handle GraphQL query errors', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.existsByEmployeeAndDate(
				'123e4567-e89b-12d3-a456-426614174001',
				new Date('2025-01-15')
			);

			expect(result.isError).toBe(true);
		});
	});

	describe('mapToAttendanceRecord', () => {
		it('should map complete record with all fields', async () => {
			const graphqlData = createGraphQLAttendance({
				clockOutTime: '2025-01-15T17:00:00.000Z',
				workHours: 8,
				overtimeHours: 1.5,
				lateReason: 'Traffic jam'
			});
			mockGraphQL.setMockData({ attendance: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value?.isComplete).toBe(true);
		});

		it('should handle partial records (no clock out)', async () => {
			const graphqlData = createGraphQLAttendance({
				clockOutTime: null,
				workHours: null,
				overtimeHours: null
			});
			mockGraphQL.setMockData({ attendance: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value?.isComplete).toBe(false);
		});

		it('should handle invalid UUID', async () => {
			const graphqlData = createGraphQLAttendance({ id: 'invalid-uuid' });
			mockGraphQL.setMockData({ attendance: graphqlData });

			const result = await adapter.findById('invalid-uuid');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle invalid date format', async () => {
			const graphqlData = createGraphQLAttendance({ date: 'invalid-date' });
			mockGraphQL.setMockData({ attendance: graphqlData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should handle mapping exceptions gracefully', async () => {
			// GraphQL data with missing required fields
			const invalidData = {
				id: '123e4567-e89b-12d3-a456-426614174000'
				// Missing all other required fields
			};
			mockGraphQL.setMockData({ attendance: invalidData });

			const result = await adapter.findById('123e4567-e89b-12d3-a456-426614174000');

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});
});
