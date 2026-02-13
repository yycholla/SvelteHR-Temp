import { describe, expect, it } from 'vitest';
import { AttendanceRecord } from './AttendanceRecord';
import { ClockInTime } from './ClockInTime';
import { ClockOutTime } from './ClockOutTime';
import { ShiftType } from './ShiftType';
import { AttendanceStatus } from './AttendanceStatus';
import { LateReason } from './LateReason';
import { WorkHours } from './WorkHours';
import { OvertimeHours } from './OvertimeHours';
import { DomainError } from '$domain/errors';

describe('AttendanceRecord', () => {
	const validData = () => ({
		id: '12345678-1234-1234-1234-123456789012',
		employeeId: '87654321-4321-4321-4321-210987654321',
		date: new Date('2026-02-13T00:00:00Z'), // Use UTC to avoid timezone issues
		clockInTime: ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value,
		clockOutTime: ClockOutTime.create(
			new Date('2026-02-13T17:00:00Z'),
			ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value
		).value,
		shiftType: ShiftType.create('morning').value,
		status: AttendanceStatus.create('present').value,
		lateReason: null,
		workHours: WorkHours.create(9).value,
		overtimeHours: OvertimeHours.create(1).value
	});

	describe('create', () => {
		it('returns Ok with valid data', () => {
			const result = AttendanceRecord.create(validData());

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(validData().id);
			expect(result.value.employeeId).toBe(validData().employeeId);
		});

		it('returns DomainError with invalid UUID for id', () => {
			const data = { ...validData(), id: 'invalid-uuid' };
			const result = AttendanceRecord.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.message).toContain('Invalid attendance record ID');
		});

		it('returns DomainError with invalid UUID for employeeId', () => {
			const data = { ...validData(), employeeId: 'invalid-uuid' };
			const result = AttendanceRecord.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.message).toContain('Invalid employee ID');
		});

		it('returns DomainError with invalid date', () => {
			const data = { ...validData(), date: new Date('invalid') };
			const result = AttendanceRecord.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(DomainError);
			expect(result.error.message).toContain('Invalid date');
		});

		it('creates defensive copy of date', () => {
			const originalDate = new Date('2026-02-13T00:00:00Z');
			const data = { ...validData(), date: originalDate };
			const result = AttendanceRecord.create(data);

			expect(result.isOk).toBe(true);

			// Mutate original (use UTC methods)
			originalDate.setUTCDate(15);

			// Value should not be affected
			expect(result.value.date.getUTCDate()).toBe(13);
		});

		it('allows null clockOutTime for ongoing attendance', () => {
			const data = {
				...validData(),
				clockOutTime: null,
				workHours: null,
				overtimeHours: null
			};
			const result = AttendanceRecord.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.clockOutTime).toBeNull();
		});
	});

	describe('clockOut', () => {
		it('updates clock out time and calculates hours', () => {
			const data = {
				...validData(),
				clockOutTime: null,
				workHours: null,
				overtimeHours: null
			};
			const record = AttendanceRecord.create(data).value;
			const newClockOut = ClockOutTime.create(
				new Date('2026-02-13T18:00:00Z'),
				record.clockInTime
			).value;

			const result = record.clockOut(newClockOut);

			expect(result.isOk).toBe(true);
			expect(result.value.clockOutTime?.value.getTime()).toBe(newClockOut.value.getTime());
			expect(result.value.workHours?.value).toBe(10);
			expect(result.value.overtimeHours?.value).toBe(2);
		});

		it('returns error if already clocked out', () => {
			const record = AttendanceRecord.create(validData()).value;
			const newClockOut = ClockOutTime.create(
				new Date('2026-02-13T18:00:00Z'),
				record.clockInTime
			).value;

			const result = record.clockOut(newClockOut);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('already clocked out');
		});
	});

	describe('markLate', () => {
		it('marks attendance as late with reason', () => {
			const record = AttendanceRecord.create(validData()).value;
			const reason = LateReason.create('Traffic delay').value;

			const result = record.markLate(reason);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('late');
			expect(result.value.lateReason?.value).toBe('Traffic delay');
		});

		it('marks attendance as late without reason', () => {
			const record = AttendanceRecord.create(validData()).value;

			const result = record.markLate(null);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('late');
			expect(result.value.lateReason).toBeNull();
		});
	});

	describe('markAbsent', () => {
		it('marks attendance as absent', () => {
			const record = AttendanceRecord.create(validData()).value;

			const result = record.markAbsent();

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('absent');
		});
	});

	describe('getters', () => {
		it('returns correct date', () => {
			const record = AttendanceRecord.create(validData()).value;
			expect(record.date.getUTCDate()).toBe(13);
		});

		it('returns defensive copy of date', () => {
			const record = AttendanceRecord.create(validData()).value;
			const date1 = record.date;
			const date2 = record.date;

			expect(date1).not.toBe(date2);
			expect(date1.getTime()).toBe(date2.getTime());

			date1.setUTCDate(15);
			expect(date2.getUTCDate()).toBe(13);
		});

		it('isComplete returns true when clocked out', () => {
			const record = AttendanceRecord.create(validData()).value;
			expect(record.isComplete).toBe(true);
		});

		it('isComplete returns false when not clocked out', () => {
			const data = {
				...validData(),
				clockOutTime: null,
				workHours: null,
				overtimeHours: null
			};
			const record = AttendanceRecord.create(data).value;
			expect(record.isComplete).toBe(false);
		});

		it('hasOvertime returns true when overtime exists', () => {
			const record = AttendanceRecord.create(validData()).value;
			expect(record.hasOvertime).toBe(true);
		});

		it('hasOvertime returns false when no overtime', () => {
			const data = { ...validData(), overtimeHours: OvertimeHours.create(0).value };
			const record = AttendanceRecord.create(data).value;
			expect(record.hasOvertime).toBe(false);
		});
	});
});
