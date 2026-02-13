import { describe, expect, it } from 'vitest';
import { ClockOutTime } from './ClockOutTime';
import { ClockInTime } from './ClockInTime';
import { InvalidClockTimeError } from '$domain/errors';

describe('ClockOutTime', () => {
	describe('create', () => {
		it('returns Ok with valid Date object and clock in time', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const clockOutDate = new Date('2026-02-13T17:00:00Z');
			const result = ClockOutTime.create(clockOutDate, clockIn);

			expect(result.isOk).toBe(true);
			expect(result.value.value.getTime()).toBe(clockOutDate.getTime());
		});

		it('returns Ok with valid ISO string', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const timeStr = '2026-02-13T17:00:00.000Z';
			const result = ClockOutTime.create(timeStr, clockIn);

			expect(result.isOk).toBe(true);
			expect(result.value.value.toISOString()).toBe(timeStr);
		});

		it('returns InvalidClockTimeError with invalid Date', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const invalidDate = new Date('invalid');
			const result = ClockOutTime.create(invalidDate, clockIn);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidClockTimeError);
			expect(result.error.message).toContain('Invalid timestamp');
		});

		it('returns InvalidClockTimeError when clock out is before clock in', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const earlier = new Date('2026-02-13T07:00:00Z');
			const result = ClockOutTime.create(earlier, clockIn);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidClockTimeError);
			expect(result.error.message).toContain('Clock out time must be after clock in time');
		});

		it('returns InvalidClockTimeError when clock out equals clock in', () => {
			const time = new Date('2026-02-13T08:00:00Z');
			const clockIn = ClockInTime.create(time).value;
			const result = ClockOutTime.create(time, clockIn);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidClockTimeError);
			expect(result.error.message).toContain('Clock out time must be after clock in time');
		});

		it('creates defensive copy of Date (immutability)', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const originalDate = new Date('2026-02-13T17:00:00Z');
			const result = ClockOutTime.create(originalDate, clockIn);

			expect(result.isOk).toBe(true);

			// Mutate original
			originalDate.setUTCHours(12);

			// Value should not be affected
			expect(result.value.value.getUTCHours()).toBe(17);
		});

		it('value getter returns defensive copy', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const result = ClockOutTime.create(new Date('2026-02-13T17:00:00Z'), clockIn);
			expect(result.isOk).toBe(true);

			const value1 = result.value.value;
			const value2 = result.value.value;

			// Should be different objects
			expect(value1).not.toBe(value2);

			// But same time
			expect(value1.getTime()).toBe(value2.getTime());

			// Mutating one should not affect the other
			value1.setUTCHours(12);
			expect(value2.getUTCHours()).toBe(17);
		});
	});

	describe('equals', () => {
		it('returns true for same timestamp', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const time = new Date('2026-02-13T17:00:00Z');
			const clockOut1 = ClockOutTime.create(time, clockIn).value;
			const clockOut2 = ClockOutTime.create(time, clockIn).value;

			expect(clockOut1.equals(clockOut2)).toBe(true);
		});

		it('returns false for different timestamps', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const time1 = new Date('2026-02-13T17:00:00Z');
			const time2 = new Date('2026-02-13T18:00:00Z');
			const clockOut1 = ClockOutTime.create(time1, clockIn).value;
			const clockOut2 = ClockOutTime.create(time2, clockIn).value;

			expect(clockOut1.equals(clockOut2)).toBe(false);
		});
	});

	describe('isAfter', () => {
		it('returns true when this time is after other', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const earlier = ClockOutTime.create(new Date('2026-02-13T17:00:00Z'), clockIn).value;
			const later = ClockOutTime.create(new Date('2026-02-13T18:00:00Z'), clockIn).value;

			expect(later.isAfter(earlier)).toBe(true);
		});

		it('returns false when this time is before other', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const earlier = ClockOutTime.create(new Date('2026-02-13T17:00:00Z'), clockIn).value;
			const later = ClockOutTime.create(new Date('2026-02-13T18:00:00Z'), clockIn).value;

			expect(earlier.isAfter(later)).toBe(false);
		});

		it('returns false when times are equal', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const time = new Date('2026-02-13T17:00:00Z');
			const clockOut1 = ClockOutTime.create(time, clockIn).value;
			const clockOut2 = ClockOutTime.create(time, clockIn).value;

			expect(clockOut1.isAfter(clockOut2)).toBe(false);
		});
	});

	describe('toISOString', () => {
		it('returns ISO string representation', () => {
			const clockIn = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const timeStr = '2026-02-13T17:00:00.000Z';
			const clockOut = ClockOutTime.create(timeStr, clockIn).value;

			expect(clockOut.toISOString()).toBe(timeStr);
		});
	});
});
