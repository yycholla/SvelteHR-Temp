import { describe, expect, it } from 'vitest';
import { ClockInTime } from './ClockInTime';
import { InvalidClockTimeError } from '$domain/errors';

describe('ClockInTime', () => {
	describe('create', () => {
		it('returns Ok with valid Date object', () => {
			const now = new Date('2026-02-13T08:00:00Z');
			const result = ClockInTime.create(now);

			expect(result.isOk).toBe(true);
			expect(result.value.value.getTime()).toBe(now.getTime());
		});

		it('returns Ok with valid ISO string', () => {
			const timeStr = '2026-02-13T08:00:00Z';
			const result = ClockInTime.create(timeStr);

			expect(result.isOk).toBe(true);
			expect(result.value.value.toISOString()).toBe(timeStr);
		});

		it('returns InvalidClockTimeError with invalid Date', () => {
			const invalidDate = new Date('invalid');
			const result = ClockInTime.create(invalidDate);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidClockTimeError);
			expect(result.error.message).toContain('Invalid timestamp');
		});

		it('returns InvalidClockTimeError with invalid string', () => {
			const result = ClockInTime.create('not-a-date');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidClockTimeError);
			expect(result.error.message).toContain('Invalid timestamp');
		});

		it('returns InvalidClockTimeError with empty string', () => {
			const result = ClockInTime.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidClockTimeError);
		});

		it('creates defensive copy of Date (immutability)', () => {
			const originalDate = new Date('2026-02-13T08:00:00Z');
			const result = ClockInTime.create(originalDate);

			expect(result.isOk).toBe(true);

			// Mutate original
			originalDate.setHours(12);

			// Value should not be affected
			expect(result.value.value.getHours()).toBe(8);
		});

		it('value getter returns defensive copy', () => {
			const result = ClockInTime.create(new Date('2026-02-13T08:00:00Z'));
			expect(result.isOk).toBe(true);

			const value1 = result.value.value;
			const value2 = result.value.value;

			// Should be different objects
			expect(value1).not.toBe(value2);

			// But same time
			expect(value1.getTime()).toBe(value2.getTime());

			// Mutating one should not affect the other
			value1.setHours(12);
			expect(value2.getHours()).toBe(8);
		});
	});

	describe('equals', () => {
		it('returns true for same timestamp', () => {
			const time = new Date('2026-02-13T08:00:00Z');
			const clockIn1 = ClockInTime.create(time).value;
			const clockIn2 = ClockInTime.create(time).value;

			expect(clockIn1.equals(clockIn2)).toBe(true);
		});

		it('returns false for different timestamps', () => {
			const time1 = new Date('2026-02-13T08:00:00Z');
			const time2 = new Date('2026-02-13T09:00:00Z');
			const clockIn1 = ClockInTime.create(time1).value;
			const clockIn2 = ClockInTime.create(time2).value;

			expect(clockIn1.equals(clockIn2)).toBe(false);
		});
	});

	describe('isBefore', () => {
		it('returns true when this time is before other', () => {
			const earlier = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const later = ClockInTime.create(new Date('2026-02-13T09:00:00Z')).value;

			expect(earlier.isBefore(later)).toBe(true);
		});

		it('returns false when this time is after other', () => {
			const earlier = ClockInTime.create(new Date('2026-02-13T08:00:00Z')).value;
			const later = ClockInTime.create(new Date('2026-02-13T09:00:00Z')).value;

			expect(later.isBefore(earlier)).toBe(false);
		});

		it('returns false when times are equal', () => {
			const time = new Date('2026-02-13T08:00:00Z');
			const clockIn1 = ClockInTime.create(time).value;
			const clockIn2 = ClockInTime.create(time).value;

			expect(clockIn1.isBefore(clockIn2)).toBe(false);
		});
	});

	describe('toISOString', () => {
		it('returns ISO string representation', () => {
			const timeStr = '2026-02-13T08:00:00.000Z';
			const clockIn = ClockInTime.create(timeStr).value;

			expect(clockIn.toISOString()).toBe(timeStr);
		});
	});
});
