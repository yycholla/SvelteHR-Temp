/**
 * Unit Test: RRULE Generation
 * Feature: 027-we-need-to
 *
 * Tests for RRULE (RFC 5545) generation from recurrence patterns.
 * MUST FAIL until implementation in src/lib/utils/rrule.ts
 */

import { describe, it, expect } from 'vitest';
import {
	generateRRule,
	parseRecurrencePattern,
	validate5YearLimit,
	formatRRuleString
} from '$lib/utils/rrule';
import type { RecurrencePattern } from '$lib/types/events';

describe('RRULE Generation', () => {
	describe('generateRRule', () => {
		it('should generate daily RRULE', () => {
			const pattern: RecurrencePattern = {
				frequency: 'daily',
				interval: 1,
				daysOfWeek: undefined,
				endDate: new Date('2025-12-31')
			};

			const rrule = generateRRule(pattern, new Date('2025-10-10'));

			expect(rrule).toContain('FREQ=DAILY');
			expect(rrule).toContain('INTERVAL=1');
			expect(rrule).toContain('UNTIL=20251231');
		});

		it('should generate weekly RRULE with specific days', () => {
			const pattern: RecurrencePattern = {
				frequency: 'weekly',
				interval: 1,
				daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
				endDate: new Date('2025-12-31')
			};

			const rrule = generateRRule(pattern, new Date('2025-10-10'));

			expect(rrule).toContain('FREQ=WEEKLY');
			expect(rrule).toContain('BYDAY=MO,WE,FR');
		});

		it('should generate every 2 weeks RRULE', () => {
			const pattern: RecurrencePattern = {
				frequency: 'weekly',
				interval: 2,
				daysOfWeek: [1], // Monday
				endDate: new Date('2025-12-31')
			};

			const rrule = generateRRule(pattern, new Date('2025-10-10'));

			expect(rrule).toContain('FREQ=WEEKLY');
			expect(rrule).toContain('INTERVAL=2');
		});

		it('should generate monthly RRULE', () => {
			const pattern: RecurrencePattern = {
				frequency: 'monthly',
				interval: 1,
				daysOfWeek: undefined,
				endDate: new Date('2025-12-31')
			};

			const rrule = generateRRule(pattern, new Date('2025-10-10'));

			expect(rrule).toContain('FREQ=MONTHLY');
		});

		it('should generate yearly RRULE', () => {
			const pattern: RecurrencePattern = {
				frequency: 'yearly',
				interval: 1,
				daysOfWeek: undefined,
				endDate: new Date('2030-10-10')
			};

			const rrule = generateRRule(pattern, new Date('2025-10-10'));

			expect(rrule).toContain('FREQ=YEARLY');
		});

		it('should format UNTIL date as YYYYMMDD', () => {
			const pattern: RecurrencePattern = {
				frequency: 'daily',
				interval: 1,
				daysOfWeek: undefined,
				endDate: new Date('2025-12-31')
			};

			const rrule = generateRRule(pattern, new Date('2025-10-10'));

			expect(rrule).toContain('UNTIL=20251231');
		});
	});

	describe('parseRecurrencePattern', () => {
		it('should parse daily pattern from form data', () => {
			const formData = {
				frequency: 'daily' as const,
				interval: 1,
				daysOfWeek: undefined,
				endDate: new Date('2025-12-31')
			};

			const pattern = parseRecurrencePattern(formData, new Date('2025-10-10'));

			expect(pattern.frequency).toBe('daily');
			expect(pattern.interval).toBe(1);
			expect(pattern.rruleString).toContain('FREQ=DAILY');
		});

		it('should parse weekly pattern with specific days', () => {
			const formData = {
				frequency: 'weekly' as const,
				interval: 1,
				daysOfWeek: [1, 3, 5],
				endDate: new Date('2025-12-31')
			};

			const pattern = parseRecurrencePattern(formData, new Date('2025-10-10'));

			expect(pattern.frequency).toBe('weekly');
			expect(pattern.daysOfWeek).toEqual([1, 3, 5]);
			expect(pattern.rruleString).toContain('BYDAY=MO,WE,FR');
		});

		it('should convert day numbers to RRULE day codes', () => {
			const formData = {
				frequency: 'weekly' as const,
				interval: 1,
				daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Sunday to Saturday
				endDate: new Date('2025-12-31')
			};

			const pattern = parseRecurrencePattern(formData, new Date('2025-10-10'));

			expect(pattern.rruleString).toContain('BYDAY=SU,MO,TU,WE,TH,FR,SA');
		});
	});

	describe('validate5YearLimit', () => {
		it('should pass validation when end date is within 5 years', () => {
			const startDate = new Date('2025-10-10');
			const endDate = new Date('2030-10-09'); // Just under 5 years

			const isValid = validate5YearLimit(startDate, endDate);

			expect(isValid).toBe(true);
		});

		it('should pass validation when end date is exactly 5 years', () => {
			const startDate = new Date('2025-10-10');
			const endDate = new Date('2030-10-10'); // Exactly 5 years

			const isValid = validate5YearLimit(startDate, endDate);

			expect(isValid).toBe(true);
		});

		it('should fail validation when end date exceeds 5 years', () => {
			const startDate = new Date('2025-10-10');
			const endDate = new Date('2030-10-11'); // 1 day over 5 years

			const isValid = validate5YearLimit(startDate, endDate);

			expect(isValid).toBe(false);
		});

		it('should fail validation when end date is 6 years', () => {
			const startDate = new Date('2025-10-10');
			const endDate = new Date('2031-10-10');

			const isValid = validate5YearLimit(startDate, endDate);

			expect(isValid).toBe(false);
		});
	});

	describe('formatRRuleString', () => {
		it('should format complete RRULE string', () => {
			const parts = {
				freq: 'WEEKLY',
				interval: 2,
				byday: 'MO,WE,FR',
				until: '20251231'
			};

			const rrule = formatRRuleString(parts);

			expect(rrule).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR;UNTIL=20251231');
		});

		it('should omit BYDAY when not provided', () => {
			const parts = {
				freq: 'DAILY',
				interval: 1,
				until: '20251231'
			};

			const rrule = formatRRuleString(parts);

			expect(rrule).toBe('FREQ=DAILY;INTERVAL=1;UNTIL=20251231');
			expect(rrule).not.toContain('BYDAY');
		});

		it('should handle interval > 1', () => {
			const parts = {
				freq: 'MONTHLY',
				interval: 3,
				until: '20251231'
			};

			const rrule = formatRRuleString(parts);

			expect(rrule).toContain('INTERVAL=3');
		});
	});
});
