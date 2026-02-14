import { describe, expect, it } from 'vitest';
import { ShiftType } from './ShiftType';
import { InvalidShiftTypeError } from '$domain/errors';

describe('ShiftType', () => {
	describe('create', () => {
		it('returns Ok with morning shift', () => {
			const result = ShiftType.create('morning');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('morning');
		});

		it('returns Ok with afternoon shift', () => {
			const result = ShiftType.create('afternoon');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('afternoon');
		});

		it('returns Ok with night shift', () => {
			const result = ShiftType.create('night');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('night');
		});

		it('returns Ok with split shift', () => {
			const result = ShiftType.create('split');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('split');
		});

		it('returns InvalidShiftTypeError with invalid value', () => {
			const result = ShiftType.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidShiftTypeError);
			expect(result.error.message).toContain('invalid');
		});

		it('returns InvalidShiftTypeError with empty string', () => {
			const result = ShiftType.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidShiftTypeError);
		});

		it('is case-sensitive', () => {
			const result = ShiftType.create('MORNING');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidShiftTypeError);
		});
	});

	describe('equals', () => {
		it('returns true for same shift type', () => {
			const shift1 = ShiftType.create('morning').value;
			const shift2 = ShiftType.create('morning').value;

			expect(shift1.equals(shift2)).toBe(true);
		});

		it('returns false for different shift types', () => {
			const shift1 = ShiftType.create('morning').value;
			const shift2 = ShiftType.create('afternoon').value;

			expect(shift1.equals(shift2)).toBe(false);
		});
	});

	describe('isMorning', () => {
		it('returns true for morning shift', () => {
			const shift = ShiftType.create('morning').value;
			expect(shift.isMorning).toBe(true);
		});

		it('returns false for other shifts', () => {
			expect(ShiftType.create('afternoon').value.isMorning).toBe(false);
			expect(ShiftType.create('night').value.isMorning).toBe(false);
			expect(ShiftType.create('split').value.isMorning).toBe(false);
		});
	});

	describe('isNight', () => {
		it('returns true for night shift', () => {
			const shift = ShiftType.create('night').value;
			expect(shift.isNight).toBe(true);
		});

		it('returns false for other shifts', () => {
			expect(ShiftType.create('morning').value.isNight).toBe(false);
			expect(ShiftType.create('afternoon').value.isNight).toBe(false);
			expect(ShiftType.create('split').value.isNight).toBe(false);
		});
	});
});
