import { describe, expect, it } from 'vitest';
import { OvertimeHours } from './OvertimeHours';
import { WorkHours } from './WorkHours';
import { InvalidOvertimeHoursError } from '$domain/errors';

describe('OvertimeHours', () => {
	describe('create', () => {
		it('returns Ok with valid hours from 0 to 12', () => {
			for (let hours = 0; hours <= 12; hours++) {
				const result = OvertimeHours.create(hours);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(hours);
			}
		});

		it('returns InvalidOvertimeHoursError with negative hours', () => {
			const result = OvertimeHours.create(-1);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOvertimeHoursError);
			expect(result.error.message).toContain('cannot be negative');
		});

		it('returns InvalidOvertimeHoursError with hours > 12', () => {
			const result = OvertimeHours.create(13);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOvertimeHoursError);
			expect(result.error.message).toContain('cannot exceed 12');
		});

		it('returns Ok with decimal hours', () => {
			const result = OvertimeHours.create(2.5);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2.5);
		});
	});

	describe('fromWorkHours', () => {
		it('returns 0 hours when work is <= 8 hours', () => {
			const workHours = WorkHours.create(8).value;
			const result = OvertimeHours.fromWorkHours(workHours, 8);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(0);
		});

		it('calculates overtime when work > standard hours', () => {
			const workHours = WorkHours.create(10).value;
			const result = OvertimeHours.fromWorkHours(workHours, 8);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(2);
		});

		it('calculates overtime with different standard hours', () => {
			const workHours = WorkHours.create(12).value;
			const result = OvertimeHours.fromWorkHours(workHours, 9);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(3);
		});

		it('handles decimal overtime', () => {
			const workHours = WorkHours.create(9.5).value;
			const result = OvertimeHours.fromWorkHours(workHours, 8);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(1.5);
		});

		it('returns error when overtime exceeds 12 hours', () => {
			const workHours = WorkHours.create(24).value;
			const result = OvertimeHours.fromWorkHours(workHours, 8);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOvertimeHoursError);
		});
	});

	describe('equals', () => {
		it('returns true for same hours', () => {
			const hours1 = OvertimeHours.create(2).value;
			const hours2 = OvertimeHours.create(2).value;

			expect(hours1.equals(hours2)).toBe(true);
		});

		it('returns false for different hours', () => {
			const hours1 = OvertimeHours.create(2).value;
			const hours2 = OvertimeHours.create(3).value;

			expect(hours1.equals(hours2)).toBe(false);
		});
	});

	describe('hasOvertime', () => {
		it('returns true for hours > 0', () => {
			expect(OvertimeHours.create(0.1).value.hasOvertime).toBe(true);
			expect(OvertimeHours.create(2).value.hasOvertime).toBe(true);
		});

		it('returns false for 0 hours', () => {
			expect(OvertimeHours.create(0).value.hasOvertime).toBe(false);
		});
	});

	describe('add', () => {
		it('adds hours correctly', () => {
			const hours1 = OvertimeHours.create(2).value;
			const hours2 = OvertimeHours.create(3).value;

			const result = hours1.add(hours2);

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe(5);
		});

		it('returns error when sum exceeds 12', () => {
			const hours1 = OvertimeHours.create(8).value;
			const hours2 = OvertimeHours.create(5).value;

			const result = hours1.add(hours2);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOvertimeHoursError);
		});
	});
});
