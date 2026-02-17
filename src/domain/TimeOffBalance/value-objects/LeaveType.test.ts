// src/domain/TimeOffBalance/value-objects/LeaveType.test.ts
import { describe, it, expect } from 'vitest';
import { LeaveType } from './LeaveType';
import { LeaveTypeValidationError } from '../errors/TimeOffBalanceErrors';

describe('LeaveType', () => {
	describe('create', () => {
		it('should create LeaveType with "vacation"', () => {
			const result = LeaveType.create('vacation');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('vacation');
		});

		it('should create LeaveType with "sick"', () => {
			const result = LeaveType.create('sick');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('sick');
		});

		it('should create LeaveType with "personal"', () => {
			const result = LeaveType.create('personal');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('personal');
		});

		it('should create LeaveType with "bereavement"', () => {
			const result = LeaveType.create('bereavement');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('bereavement');
		});

		it('should create LeaveType with "parental"', () => {
			const result = LeaveType.create('parental');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('parental');
		});

		it('should create LeaveType with "unpaid"', () => {
			const result = LeaveType.create('unpaid');

			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('unpaid');
		});

		it('should reject invalid leave type', () => {
			const result = LeaveType.create('invalid-type');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(LeaveTypeValidationError);
			expect(result.error.message).toContain('Invalid leave type');
		});

		it('should reject empty string', () => {
			const result = LeaveType.create('');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(LeaveTypeValidationError);
		});

		it('should reject null', () => {
			const result = LeaveType.create(null as unknown as string);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(LeaveTypeValidationError);
		});
	});

	describe('isPaid', () => {
		it('should return true for vacation', () => {
			const leaveType = LeaveType.create('vacation').value;

			expect(leaveType.isPaid).toBe(true);
		});

		it('should return true for sick', () => {
			const leaveType = LeaveType.create('sick').value;

			expect(leaveType.isPaid).toBe(true);
		});

		it('should return true for personal', () => {
			const leaveType = LeaveType.create('personal').value;

			expect(leaveType.isPaid).toBe(true);
		});

		it('should return true for bereavement', () => {
			const leaveType = LeaveType.create('bereavement').value;

			expect(leaveType.isPaid).toBe(true);
		});

		it('should return true for parental', () => {
			const leaveType = LeaveType.create('parental').value;

			expect(leaveType.isPaid).toBe(true);
		});

		it('should return false for unpaid', () => {
			const leaveType = LeaveType.create('unpaid').value;

			expect(leaveType.isPaid).toBe(false);
		});
	});

	describe('requiresDocumentation', () => {
		it('should require documentation for sick leave', () => {
			const leaveType = LeaveType.create('sick').value;

			expect(leaveType.requiresDocumentation).toBe(true);
		});

		it('should require documentation for bereavement', () => {
			const leaveType = LeaveType.create('bereavement').value;

			expect(leaveType.requiresDocumentation).toBe(true);
		});

		it('should require documentation for parental', () => {
			const leaveType = LeaveType.create('parental').value;

			expect(leaveType.requiresDocumentation).toBe(true);
		});

		it('should not require documentation for vacation', () => {
			const leaveType = LeaveType.create('vacation').value;

			expect(leaveType.requiresDocumentation).toBe(false);
		});

		it('should not require documentation for personal', () => {
			const leaveType = LeaveType.create('personal').value;

			expect(leaveType.requiresDocumentation).toBe(false);
		});

		it('should not require documentation for unpaid', () => {
			const leaveType = LeaveType.create('unpaid').value;

			expect(leaveType.requiresDocumentation).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for same leave type', () => {
			const type1 = LeaveType.create('vacation').value;
			const type2 = LeaveType.create('vacation').value;

			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different leave types', () => {
			const type1 = LeaveType.create('vacation').value;
			const type2 = LeaveType.create('sick').value;

			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('displayName', () => {
		it('should return proper display name for each leave type', () => {
			expect(LeaveType.create('vacation').value.displayName).toBe('Vacation');
			expect(LeaveType.create('sick').value.displayName).toBe('Sick');
			expect(LeaveType.create('personal').value.displayName).toBe('Personal');
			expect(LeaveType.create('bereavement').value.displayName).toBe('Bereavement');
			expect(LeaveType.create('parental').value.displayName).toBe('Parental');
			expect(LeaveType.create('unpaid').value.displayName).toBe('Unpaid');
		});
	});
});
