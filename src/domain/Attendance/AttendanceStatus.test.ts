import { describe, expect, it } from 'vitest';
import { AttendanceStatus } from './AttendanceStatus';
import { InvalidAttendanceStatusError } from '$domain/errors';

describe('AttendanceStatus', () => {
	describe('create', () => {
		it('returns Ok with present status', () => {
			const result = AttendanceStatus.create('present');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('present');
		});

		it('returns Ok with absent status', () => {
			const result = AttendanceStatus.create('absent');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('absent');
		});

		it('returns Ok with late status', () => {
			const result = AttendanceStatus.create('late');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('late');
		});

		it('returns Ok with half_day status', () => {
			const result = AttendanceStatus.create('half_day');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('half_day');
		});

		it('returns Ok with on_leave status', () => {
			const result = AttendanceStatus.create('on_leave');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('on_leave');
		});

		it('returns InvalidAttendanceStatusError with invalid value', () => {
			const result = AttendanceStatus.create('invalid');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAttendanceStatusError);
			expect(result.error.message).toContain('invalid');
		});

		it('returns InvalidAttendanceStatusError with empty string', () => {
			const result = AttendanceStatus.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAttendanceStatusError);
		});

		it('is case-sensitive', () => {
			const result = AttendanceStatus.create('PRESENT');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAttendanceStatusError);
		});
	});

	describe('equals', () => {
		it('returns true for same status', () => {
			const status1 = AttendanceStatus.create('present').value;
			const status2 = AttendanceStatus.create('present').value;

			expect(status1.equals(status2)).toBe(true);
		});

		it('returns false for different statuses', () => {
			const status1 = AttendanceStatus.create('present').value;
			const status2 = AttendanceStatus.create('absent').value;

			expect(status1.equals(status2)).toBe(false);
		});
	});

	describe('isPresent', () => {
		it('returns true for present status', () => {
			const status = AttendanceStatus.create('present').value;
			expect(status.isPresent).toBe(true);
		});

		it('returns false for other statuses', () => {
			expect(AttendanceStatus.create('absent').value.isPresent).toBe(false);
			expect(AttendanceStatus.create('late').value.isPresent).toBe(false);
			expect(AttendanceStatus.create('half_day').value.isPresent).toBe(false);
			expect(AttendanceStatus.create('on_leave').value.isPresent).toBe(false);
		});
	});

	describe('isAbsent', () => {
		it('returns true for absent status', () => {
			const status = AttendanceStatus.create('absent').value;
			expect(status.isAbsent).toBe(true);
		});

		it('returns false for other statuses', () => {
			expect(AttendanceStatus.create('present').value.isAbsent).toBe(false);
			expect(AttendanceStatus.create('late').value.isAbsent).toBe(false);
			expect(AttendanceStatus.create('half_day').value.isAbsent).toBe(false);
			expect(AttendanceStatus.create('on_leave').value.isAbsent).toBe(false);
		});
	});

	describe('requiresAction', () => {
		it('returns true for late status', () => {
			expect(AttendanceStatus.create('late').value.requiresAction).toBe(true);
		});

		it('returns true for absent status', () => {
			expect(AttendanceStatus.create('absent').value.requiresAction).toBe(true);
		});

		it('returns false for present status', () => {
			expect(AttendanceStatus.create('present').value.requiresAction).toBe(false);
		});

		it('returns false for half_day status', () => {
			expect(AttendanceStatus.create('half_day').value.requiresAction).toBe(false);
		});

		it('returns false for on_leave status', () => {
			expect(AttendanceStatus.create('on_leave').value.requiresAction).toBe(false);
		});
	});
});
