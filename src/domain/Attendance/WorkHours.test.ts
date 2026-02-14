import { describe, expect, it } from 'vitest';
import { WorkHours } from './WorkHours';
import { ClockInTime } from './ClockInTime';
import { ClockOutTime } from './ClockOutTime';
import { InvalidWorkHoursError } from '$domain/errors';

describe('WorkHours', () => {
	describe('create', () => {
		it('returns Ok with valid hours from 0 to 24', () => {
			for (let hours = 0; hours <= 24; hours++) {
				const result = WorkHours.create(hours);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(hours);
			}
		});

		it('returns InvalidWorkHoursError with negative hours', () => {
			const result = WorkHours.create(-1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidWorkHoursError);
			expect(result.error.message).toContain('cannot be negative');
		});

		it('returns InvalidWorkHoursError with hours > 24', () => {
			const result = WorkHours.create(25);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidWorkHoursError);
			expect(result.error.message).toContain('cannot exceed 24');
		});

		it('returns Ok with decimal hours', () => {
			const result = WorkHours.create(8.5);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(8.5);
		});
	});

	describe('fromClockTimes', () => {
		it('calculates hours correctly for same day', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const clockOut = ClockOutTime.create(new Date('2026-02-13T17:00:00Z'), clockIn).value;

			const result = WorkHours.fromClockTimes(clockIn, clockOut);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(9);
		});

		it('calculates hours with minutes', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const clockOut = ClockOutTime.create(new Date('2026-02-13T17:30:00Z'), clockIn).value;

			const result = WorkHours.fromClockTimes(clockIn, clockOut);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(9.5);
		});

		it('calculates hours across midnight', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T22:00:00Z')).value;
			const clockOut = ClockOutTime.create(new Date('2026-02-14T06:00:00Z'), clockIn).value;

			const result = WorkHours.fromClockTimes(clockIn, clockOut);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(8);
		});
	});

	describe('equals', () => {
		it('returns true for same hours', () => {
			const hours1 = WorkHours.create(8).value;
			const hours2 = WorkHours.create(8).value;

			expect(hours1.equals(hours2)).toBe(true);
		});

		it('returns false for different hours', () => {
			const hours1 = WorkHours.create(8).value;
			const hours2 = WorkHours.create(9).value;

			expect(hours1.equals(hours2)).toBe(false);
		});
	});

	describe('isFullDay', () => {
		it('returns true for 8+ hours', () => {
			expect(WorkHours.create(8).value.isFullDay).toBe(true);
			expect(WorkHours.create(9).value.isFullDay).toBe(true);
			expect(WorkHours.create(12).value.isFullDay).toBe(true);
		});

		it('returns false for < 8 hours', () => {
			expect(WorkHours.create(7.9).value.isFullDay).toBe(false);
			expect(WorkHours.create(4).value.isFullDay).toBe(false);
		});
	});

	describe('isHalfDay', () => {
		it('returns true for 4+ but < 8 hours', () => {
			expect(WorkHours.create(4).value.isHalfDay).toBe(true);
			expect(WorkHours.create(6).value.isHalfDay).toBe(true);
			expect(WorkHours.create(7.9).value.isHalfDay).toBe(true);
		});

		it('returns false for < 4 hours', () => {
			expect(WorkHours.create(3.9).value.isHalfDay).toBe(false);
		});

		it('returns false for >= 8 hours', () => {
			expect(WorkHours.create(8).value.isHalfDay).toBe(false);
			expect(WorkHours.create(9).value.isHalfDay).toBe(false);
		});
	});

	describe('add', () => {
		it('adds hours correctly', () => {
			const hours1 = WorkHours.create(8).value;
			const hours2 = WorkHours.create(2).value;

			const result = hours1.add(hours2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(10);
		});

		it('returns error when sum exceeds 24', () => {
			const hours1 = WorkHours.create(20).value;
			const hours2 = WorkHours.create(5).value;

			const result = hours1.add(hours2);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidWorkHoursError);
		});
	});
});
