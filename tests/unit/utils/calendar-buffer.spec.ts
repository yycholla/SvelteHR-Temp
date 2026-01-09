/**
 * Unit Test: Calendar Buffer Calculation
 * Feature: 027-we-need-to
 *
 * Tests for 3-month calendar buffer window calculation and prefetching logic.
 * MUST FAIL until implementation in src/lib/utils/calendar-buffer.ts
 */

import { describe, expect, it } from 'vitest';
import {
	calculate3MonthBuffer,
	getAdjacentMonth,
	normalizeToMonthEnd,
	normalizeToMonthStart,
	shouldPrefetch
} from '$lib/utils/calendar-buffer';

describe('Calendar Buffer Calculation', () => {
	describe('calculate3MonthBuffer', () => {
		it('should calculate buffer as current month ± 1 month', () => {
			const currentDate = new Date('2025-10-15'); // Mid-October

			const { bufferStart, bufferEnd } = calculate3MonthBuffer(currentDate);

			// bufferStart = Sep 1, 2025 00:00:00
			expect(bufferStart.getFullYear()).toBe(2025);
			expect(bufferStart.getMonth()).toBe(8); // September (0-indexed)
			expect(bufferStart.getDate()).toBe(1);
			expect(bufferStart.getHours()).toBe(0);
			expect(bufferStart.getMinutes()).toBe(0);

			// bufferEnd = Nov 30, 2025 23:59:59.999
			expect(bufferEnd.getFullYear()).toBe(2025);
			expect(bufferEnd.getMonth()).toBe(10); // November (0-indexed)
			expect(bufferEnd.getDate()).toBe(30);
			expect(bufferEnd.getHours()).toBe(23);
			expect(bufferEnd.getMinutes()).toBe(59);
		});

		it('should handle year boundary when current month is January', () => {
			const currentDate = new Date('2025-01-15');

			const { bufferStart, bufferEnd } = calculate3MonthBuffer(currentDate);

			// bufferStart = Dec 1, 2024
			expect(bufferStart.getFullYear()).toBe(2024);
			expect(bufferStart.getMonth()).toBe(11); // December

			// bufferEnd = Feb 28, 2025 (or Feb 29 in leap year)
			expect(bufferEnd.getFullYear()).toBe(2025);
			expect(bufferEnd.getMonth()).toBe(1); // February
		});

		it('should handle year boundary when current month is December', () => {
			const currentDate = new Date('2025-12-15');

			const { bufferStart, bufferEnd } = calculate3MonthBuffer(currentDate);

			// bufferStart = Nov 1, 2025
			expect(bufferStart.getFullYear()).toBe(2025);
			expect(bufferStart.getMonth()).toBe(10); // November

			// bufferEnd = Jan 31, 2026
			expect(bufferEnd.getFullYear()).toBe(2026);
			expect(bufferEnd.getMonth()).toBe(0); // January
			expect(bufferEnd.getDate()).toBe(31);
		});

		it('should handle leap year February correctly', () => {
			const currentDate = new Date('2024-02-15'); // 2024 is leap year

			const { bufferStart, bufferEnd } = calculate3MonthBuffer(currentDate);

			// bufferStart = Jan 1, 2024
			expect(bufferStart.getMonth()).toBe(0);

			// bufferEnd = Mar 31, 2024
			expect(bufferEnd.getMonth()).toBe(2); // March
			expect(bufferEnd.getDate()).toBe(31);
		});

		it('should always return exactly 3 months of coverage', () => {
			const testDates = [
				new Date('2025-01-01'),
				new Date('2025-06-15'),
				new Date('2025-12-31'),
				new Date('2024-02-29') // Leap year
			];

			testDates.forEach((date) => {
				const { bufferStart, bufferEnd } = calculate3MonthBuffer(date);

				// Count months between start and end
				const monthsDiff =
					(bufferEnd.getFullYear() - bufferStart.getFullYear()) * 12 +
					(bufferEnd.getMonth() - bufferStart.getMonth());

				// Should span exactly 2 months difference (3 months inclusive: current ± 1)
				expect(monthsDiff).toBe(2);
			});
		});
	});

	describe('getAdjacentMonth', () => {
		it('should return next month when direction is "next"', () => {
			const currentDate = new Date('2025-10-15');

			const nextMonth = getAdjacentMonth(currentDate, 'next');

			expect(nextMonth.getFullYear()).toBe(2025);
			expect(nextMonth.getMonth()).toBe(10); // November
			expect(nextMonth.getDate()).toBe(1); // Normalized to month start
		});

		it('should return previous month when direction is "prev"', () => {
			const currentDate = new Date('2025-10-15');

			const prevMonth = getAdjacentMonth(currentDate, 'prev');

			expect(prevMonth.getFullYear()).toBe(2025);
			expect(prevMonth.getMonth()).toBe(8); // September
			expect(prevMonth.getDate()).toBe(1);
		});

		it('should handle December → January transition', () => {
			const currentDate = new Date('2025-12-15');

			const nextMonth = getAdjacentMonth(currentDate, 'next');

			expect(nextMonth.getFullYear()).toBe(2026);
			expect(nextMonth.getMonth()).toBe(0); // January
		});

		it('should handle January → December transition', () => {
			const currentDate = new Date('2025-01-15');

			const prevMonth = getAdjacentMonth(currentDate, 'prev');

			expect(prevMonth.getFullYear()).toBe(2024);
			expect(prevMonth.getMonth()).toBe(11); // December
		});

		it('should normalize to first day of month', () => {
			const currentDate = new Date('2025-10-31'); // Last day of October

			const nextMonth = getAdjacentMonth(currentDate, 'next');

			expect(nextMonth.getDate()).toBe(1);
			expect(nextMonth.getHours()).toBe(0);
			expect(nextMonth.getMinutes()).toBe(0);
			expect(nextMonth.getSeconds()).toBe(0);
		});
	});

	describe('shouldPrefetch', () => {
		it('should return true when navigating to month outside current buffer', () => {
			const currentBuffer = {
				bufferStart: new Date(Date.UTC(2025, 8, 1, 0, 0, 0, 0)),
				bufferEnd: new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999))
			};

			// Navigating to December (outside buffer)
			const targetDate = new Date(Date.UTC(2025, 11, 15));

			const shouldFetch = shouldPrefetch(targetDate, currentBuffer);

			expect(shouldFetch).toBe(true);
		});

		it('should return false when navigating to month inside current buffer', () => {
			const currentBuffer = {
				bufferStart: new Date(Date.UTC(2025, 8, 1, 0, 0, 0, 0)),
				bufferEnd: new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999))
			};

			// Navigating to October (inside buffer)
			const targetDate = new Date(Date.UTC(2025, 9, 15));

			const shouldFetch = shouldPrefetch(targetDate, currentBuffer);

			expect(shouldFetch).toBe(false);
		});

		it('should return true when target month is exactly at buffer boundary', () => {
			const currentBuffer = {
				bufferStart: new Date(Date.UTC(2025, 8, 1, 0, 0, 0, 0)), // Sep 1 UTC
				bufferEnd: new Date(Date.UTC(2025, 10, 30, 23, 59, 59, 999)) // Nov 30 UTC
			};

			// Navigating to September 1 (start boundary)
			const targetDateStart = new Date(Date.UTC(2025, 8, 1));
			expect(shouldPrefetch(targetDateStart, currentBuffer)).toBe(false);

			// Navigating to August 31 (just before start boundary)
			const targetDateBeforeStart = new Date(Date.UTC(2025, 7, 31));
			expect(shouldPrefetch(targetDateBeforeStart, currentBuffer)).toBe(true);

			// Navigating to December 1 (just after end boundary)
			const targetDateAfterEnd = new Date(Date.UTC(2025, 11, 1));
			expect(shouldPrefetch(targetDateAfterEnd, currentBuffer)).toBe(true);
		});

		it('should handle year boundary crossing', () => {
			const currentBuffer = {
				bufferStart: new Date(Date.UTC(2024, 10, 1, 0, 0, 0, 0)), // Nov 1 2024 UTC
				bufferEnd: new Date(Date.UTC(2025, 0, 31, 23, 59, 59, 999)) // Jan 31 2025 UTC
			};

			// October 2024 - before buffer
			expect(shouldPrefetch(new Date(Date.UTC(2024, 9, 15)), currentBuffer)).toBe(true);

			// December 2024 - inside buffer
			expect(shouldPrefetch(new Date(Date.UTC(2024, 11, 15)), currentBuffer)).toBe(false);

			// February 2025 - after buffer
			expect(shouldPrefetch(new Date(Date.UTC(2025, 1, 15)), currentBuffer)).toBe(true);
		});
	});

	describe('normalizeToMonthStart', () => {
		it('should normalize date to first day of month at 00:00:00', () => {
			const date = new Date('2025-10-15T14:30:45.123');

			const normalized = normalizeToMonthStart(date);

			expect(normalized.getFullYear()).toBe(2025);
			expect(normalized.getMonth()).toBe(9); // October
			expect(normalized.getDate()).toBe(1);
			expect(normalized.getHours()).toBe(0);
			expect(normalized.getMinutes()).toBe(0);
			expect(normalized.getSeconds()).toBe(0);
			expect(normalized.getMilliseconds()).toBe(0);
		});

		it('should not mutate original date object', () => {
			const original = new Date('2025-10-15T14:30:45.123');
			const originalTime = original.getTime();

			normalizeToMonthStart(original);

			expect(original.getTime()).toBe(originalTime);
		});
	});

	describe('normalizeToMonthEnd', () => {
		it('should normalize date to last day of month at 23:59:59.999', () => {
			const date = new Date('2025-10-15T14:30:45.123');

			const normalized = normalizeToMonthEnd(date);

			expect(normalized.getFullYear()).toBe(2025);
			expect(normalized.getMonth()).toBe(9); // October
			expect(normalized.getDate()).toBe(31); // October has 31 days
			expect(normalized.getHours()).toBe(23);
			expect(normalized.getMinutes()).toBe(59);
			expect(normalized.getSeconds()).toBe(59);
			expect(normalized.getMilliseconds()).toBe(999);
		});

		it('should handle February in non-leap year (28 days)', () => {
			const date = new Date('2025-02-15');

			const normalized = normalizeToMonthEnd(date);

			expect(normalized.getDate()).toBe(28);
		});

		it('should handle February in leap year (29 days)', () => {
			const date = new Date('2024-02-15');

			const normalized = normalizeToMonthEnd(date);

			expect(normalized.getDate()).toBe(29);
		});

		it('should handle months with 30 days', () => {
			const april = new Date('2025-04-15');
			expect(normalizeToMonthEnd(april).getDate()).toBe(30);

			const june = new Date('2025-06-15');
			expect(normalizeToMonthEnd(june).getDate()).toBe(30);

			const september = new Date('2025-09-15');
			expect(normalizeToMonthEnd(september).getDate()).toBe(30);

			const november = new Date('2025-11-15');
			expect(normalizeToMonthEnd(november).getDate()).toBe(30);
		});

		it('should not mutate original date object', () => {
			const original = new Date('2025-10-15T14:30:45.123');
			const originalTime = original.getTime();

			normalizeToMonthEnd(original);

			expect(original.getTime()).toBe(originalTime);
		});
	});
});
