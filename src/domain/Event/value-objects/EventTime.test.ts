import { describe, it, expect } from 'vitest';
import { EventTime } from './EventTime';
import { EventTimeValidationError } from '../errors/EventErrors';

describe('EventTime', () => {
	describe('create()', () => {
		describe('valid times', () => {
			it('should create with start time before end time', () => {
				const start = new Date('2026-03-15T10:00:00Z');
				const end = new Date('2026-03-15T11:00:00Z');
				const result = EventTime.create(start, end);
				expect(result.isOk).toBe(true);
				expect(result.value?.startTime.getTime()).toBe(start.getTime());
				expect(result.value?.endTime.getTime()).toBe(end.getTime());
			});

			it('should create with equal start and end times (instant event)', () => {
				const instant = new Date('2026-03-15T10:00:00Z');
				const result = EventTime.create(instant, instant);
				expect(result.isOk).toBe(true);
				expect(result.value?.startTime.getTime()).toBe(instant.getTime());
				expect(result.value?.endTime.getTime()).toBe(instant.getTime());
			});

			it('should create with multi-day event', () => {
				const start = new Date('2026-03-15T09:00:00Z');
				const end = new Date('2026-03-17T17:00:00Z');
				const result = EventTime.create(start, end);
				expect(result.isOk).toBe(true);
				expect(result.value?.startTime.getTime()).toBe(start.getTime());
				expect(result.value?.endTime.getTime()).toBe(end.getTime());
			});
		});

		describe('validation', () => {
			it('should reject when end time is before start time', () => {
				const start = new Date('2026-03-15T11:00:00Z');
				const end = new Date('2026-03-15T10:00:00Z');
				const result = EventTime.create(start, end);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTimeValidationError);
				expect(result.error?.message).toContain('End time must be after or equal to start time');
			});

			it('should reject when end time is one millisecond before start time', () => {
				const start = new Date('2026-03-15T10:00:00.000Z');
				const end = new Date('2026-03-15T09:59:59.999Z');
				const result = EventTime.create(start, end);
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventTimeValidationError);
			});
		});

		describe('defensive copies on input', () => {
			it('should not be affected by mutation of input start date', () => {
				const start = new Date('2026-03-15T10:00:00Z');
				const end = new Date('2026-03-15T11:00:00Z');
				const originalStartTime = start.getTime();

				const eventTime = EventTime.create(start, end).value!;

				// Mutate the input date
				start.setHours(start.getHours() + 5);

				// EventTime should still have the original value
				expect(eventTime.startTime.getTime()).toBe(originalStartTime);
			});

			it('should not be affected by mutation of input end date', () => {
				const start = new Date('2026-03-15T10:00:00Z');
				const end = new Date('2026-03-15T11:00:00Z');
				const originalEndTime = end.getTime();

				const eventTime = EventTime.create(start, end).value!;

				// Mutate the input date
				end.setHours(end.getHours() + 5);

				// EventTime should still have the original value
				expect(eventTime.endTime.getTime()).toBe(originalEndTime);
			});

			it('should not be affected by mutation of both input dates', () => {
				const start = new Date('2026-03-15T10:00:00Z');
				const end = new Date('2026-03-15T11:00:00Z');
				const originalStartTime = start.getTime();
				const originalEndTime = end.getTime();

				const eventTime = EventTime.create(start, end).value!;

				// Mutate both input dates
				start.setFullYear(2027);
				end.setFullYear(2028);

				// EventTime should still have the original values
				expect(eventTime.startTime.getTime()).toBe(originalStartTime);
				expect(eventTime.endTime.getTime()).toBe(originalEndTime);
			});
		});

		describe('defensive copies on output', () => {
			it('should not be affected by mutation of returned start time', () => {
				const start = new Date('2026-03-15T10:00:00Z');
				const end = new Date('2026-03-15T11:00:00Z');
				const eventTime = EventTime.create(start, end).value!;

				const originalStartTime = eventTime.startTime.getTime();

				// Get the start time and mutate it
				const returnedStart = eventTime.startTime;
				returnedStart.setHours(returnedStart.getHours() + 5);

				// EventTime should still have the original value
				expect(eventTime.startTime.getTime()).toBe(originalStartTime);
			});

			it('should not be affected by mutation of returned end time', () => {
				const start = new Date('2026-03-15T10:00:00Z');
				const end = new Date('2026-03-15T11:00:00Z');
				const eventTime = EventTime.create(start, end).value!;

				const originalEndTime = eventTime.endTime.getTime();

				// Get the end time and mutate it
				const returnedEnd = eventTime.endTime;
				returnedEnd.setHours(returnedEnd.getHours() + 5);

				// EventTime should still have the original value
				expect(eventTime.endTime.getTime()).toBe(originalEndTime);
			});

			it('should return different date instances on each getter call', () => {
				const start = new Date('2026-03-15T10:00:00Z');
				const end = new Date('2026-03-15T11:00:00Z');
				const eventTime = EventTime.create(start, end).value!;

				const start1 = eventTime.startTime;
				const start2 = eventTime.startTime;

				// Same value but different instances
				expect(start1.getTime()).toBe(start2.getTime());
				expect(start1).not.toBe(start2);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same time values', () => {
			const start = new Date('2026-03-15T10:00:00Z');
			const end = new Date('2026-03-15T11:00:00Z');
			const time1 = EventTime.create(start, end).value!;
			const time2 = EventTime.create(start, end).value!;
			expect(time1.equals(time2)).toBe(true);
		});

		it('should return false for different start times', () => {
			const start1 = new Date('2026-03-15T10:00:00Z');
			const start2 = new Date('2026-03-15T09:00:00Z');
			const end = new Date('2026-03-15T11:00:00Z');
			const time1 = EventTime.create(start1, end).value!;
			const time2 = EventTime.create(start2, end).value!;
			expect(time1.equals(time2)).toBe(false);
		});

		it('should return false for different end times', () => {
			const start = new Date('2026-03-15T10:00:00Z');
			const end1 = new Date('2026-03-15T11:00:00Z');
			const end2 = new Date('2026-03-15T12:00:00Z');
			const time1 = EventTime.create(start, end1).value!;
			const time2 = EventTime.create(start, end2).value!;
			expect(time1.equals(time2)).toBe(false);
		});

		it('should return true for instant events with same time', () => {
			const instant = new Date('2026-03-15T10:00:00Z');
			const time1 = EventTime.create(instant, instant).value!;
			const time2 = EventTime.create(instant, instant).value!;
			expect(time1.equals(time2)).toBe(true);
		});
	});

	describe('toString()', () => {
		it('should return formatted time range', () => {
			const start = new Date('2026-03-15T10:00:00Z');
			const end = new Date('2026-03-15T11:00:00Z');
			const time = EventTime.create(start, end).value!;
			const str = time.toString();
			expect(str).toContain('2026-03-15');
			expect(str).toContain('10:00');
			expect(str).toContain('11:00');
		});

		it('should return formatted instant event time', () => {
			const instant = new Date('2026-03-15T14:30:00Z');
			const time = EventTime.create(instant, instant).value!;
			const str = time.toString();
			expect(str).toContain('2026-03-15');
			expect(str).toContain('14:30');
		});
	});

	describe('duration calculation helper', () => {
		it('should correctly handle events spanning multiple hours', () => {
			const start = new Date('2026-03-15T09:00:00Z');
			const end = new Date('2026-03-15T17:00:00Z');
			const time = EventTime.create(start, end).value!;
			const duration = time.endTime.getTime() - time.startTime.getTime();
			expect(duration).toBe(8 * 60 * 60 * 1000); // 8 hours in milliseconds
		});

		it('should correctly handle instant events (zero duration)', () => {
			const instant = new Date('2026-03-15T10:00:00Z');
			const time = EventTime.create(instant, instant).value!;
			const duration = time.endTime.getTime() - time.startTime.getTime();
			expect(duration).toBe(0);
		});
	});
});
