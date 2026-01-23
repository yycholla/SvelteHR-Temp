import { describe, it, expect } from 'vitest';
import {
	formatDate,
	formatDateTime,
	formatRelativeTime,
	formatDateRange
} from '$lib/utils/formatters/date';

describe('formatDate', () => {
	it('formats Date object to locale date string', () => {
		const date = new Date('2026-01-22T12:00:00Z');
		expect(formatDate(date)).toBe('Jan 22, 2026');
	});

	it('formats ISO string to locale date string', () => {
		expect(formatDate('2026-01-22T12:00:00Z')).toBe('Jan 22, 2026');
	});

	it('returns fallback for null/undefined', () => {
		expect(formatDate(null)).toBe('N/A');
		expect(formatDate(undefined)).toBe('N/A');
	});

	it('handles invalid date strings', () => {
		expect(formatDate('invalid')).toBe('Invalid Date');
	});

	it('respects custom options', () => {
		const date = new Date('2026-01-22T12:00:00Z');
		const result = formatDate(date, { month: 'long', day: 'numeric', year: 'numeric' });
		expect(result).toBe('January 22, 2026');
	});
});

describe('formatDateTime', () => {
	it('includes time in formatted output', () => {
		const date = new Date('2026-01-22T15:30:00Z');
		const result = formatDateTime(date);
		expect(result).toContain('Jan 22, 2026');
		expect(result).toMatch(/\d{1,2}:\d{2}/); // Has time component
	});

	it('respects custom options', () => {
		const date = new Date('2026-01-22T15:30:00Z');
		const result = formatDateTime(date, {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		});
		expect(result).toContain('January 22, 2026');
		expect(result).toMatch(/\d{2}:\d{2}/);
	});
});

describe('formatRelativeTime', () => {
	it('returns "just now" for <1 minute', () => {
		const now = new Date();
		expect(formatRelativeTime(now)).toBe('just now');
	});

	it('returns "X minutes ago" for <60 minutes', () => {
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
		expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
	});

	it('returns "X hours ago" for <24 hours', () => {
		const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
		expect(formatRelativeTime(threeHoursAgo)).toBe('3 hours ago');
	});

	it('returns "X days ago" for >=24 hours', () => {
		const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
		expect(formatRelativeTime(twoDaysAgo)).toBe('2 days ago');
	});

	it('returns "1 day ago" for singular day', () => {
		const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
		expect(formatRelativeTime(oneDayAgo)).toBe('1 day ago');
	});

	it('returns "Invalid Date" for null', () => {
		expect(formatRelativeTime(null as unknown as Date)).toBe('Invalid Date');
	});

	it('returns "Invalid Date" for undefined', () => {
		expect(formatRelativeTime(undefined as unknown as Date)).toBe('Invalid Date');
	});

	it('returns "Invalid Date" for invalid date string', () => {
		expect(formatRelativeTime('invalid')).toBe('Invalid Date');
	});

	it('returns "N/A" for future dates', () => {
		const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future
		expect(formatRelativeTime(futureDate)).toBe('N/A');
	});
});

describe('formatDateRange', () => {
	it('formats date range with same month', () => {
		const start = new Date('2026-01-15T12:00:00Z');
		const end = new Date('2026-01-20T12:00:00Z');
		expect(formatDateRange(start, end)).toBe('Jan 15-20, 2026');
	});

	it('formats date range across months', () => {
		const start = new Date('2026-01-28T12:00:00Z');
		const end = new Date('2026-02-03T12:00:00Z');
		expect(formatDateRange(start, end)).toBe('Jan 28 - Feb 3, 2026');
	});

	it('formats date range across years', () => {
		const start = new Date('2026-12-28T12:00:00Z');
		const end = new Date('2027-01-03T12:00:00Z');
		expect(formatDateRange(start, end)).toBe('Dec 28, 2026 - Jan 3, 2027');
	});

	it('returns "Invalid Date" for null start date', () => {
		const end = new Date('2026-01-20T12:00:00Z');
		expect(formatDateRange(null as unknown as Date, end)).toBe('Invalid Date');
	});

	it('returns "Invalid Date" for undefined start date', () => {
		const end = new Date('2026-01-20T12:00:00Z');
		expect(formatDateRange(undefined as unknown as Date, end)).toBe('Invalid Date');
	});

	it('returns "Invalid Date" for null end date', () => {
		const start = new Date('2026-01-15T12:00:00Z');
		expect(formatDateRange(start, null as unknown as Date)).toBe('Invalid Date');
	});

	it('returns "Invalid Date" for invalid start date string', () => {
		const end = new Date('2026-01-20T12:00:00Z');
		expect(formatDateRange('invalid', end)).toBe('Invalid Date');
	});

	it('returns "Invalid Date" for invalid end date string', () => {
		const start = new Date('2026-01-15T12:00:00Z');
		expect(formatDateRange(start, 'invalid')).toBe('Invalid Date');
	});
});
