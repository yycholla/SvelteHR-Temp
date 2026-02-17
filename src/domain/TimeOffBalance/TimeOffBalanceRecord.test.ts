import { describe, it, expect } from 'vitest';
import { TimeOffBalanceRecord } from './TimeOffBalanceRecord';
import { BalanceHours } from './value-objects/BalanceHours';
import { CarryoverHours } from './value-objects/CarryoverHours';
import { LeaveType } from './value-objects/LeaveType';
import { BalancePeriod } from './value-objects/BalancePeriod';
import { AccrualRate } from './value-objects/AccrualRate';
import {
	TimeOffBalanceValidationError,
	InvalidAccrualCalculationError,
	InsufficientBalanceError
} from './errors/TimeOffBalanceErrors';

describe('TimeOffBalanceRecord', () => {
	const createValidProps = () => ({
		id: '550e8400-e29b-41d4-a716-446655440000',
		employeeId: '660e8400-e29b-41d4-a716-446655440000',
		leaveType: LeaveType.create('vacation').value,
		period: BalancePeriod.create(2026).value,
		totalHours: BalanceHours.create(160).value,
		usedHours: BalanceHours.create(40).value,
		accrualRate: AccrualRate.create(5, 'month').value,
		carryoverHours: CarryoverHours.create(20).value
	});

	describe('create', () => {
		it('should create TimeOffBalanceRecord with valid data', () => {
			const result = TimeOffBalanceRecord.create(createValidProps());

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.value.employeeId).toBe('660e8400-e29b-41d4-a716-446655440000');
		});

		it('should return error with invalid record UUID', () => {
			const props = createValidProps();
			const result = TimeOffBalanceRecord.create({ ...props, id: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceValidationError);
			expect(result.error.message).toContain('TimeOffBalanceRecord ID must be a valid UUID');
		});

		it('should return error with invalid employee UUID', () => {
			const props = createValidProps();
			const result = TimeOffBalanceRecord.create({ ...props, employeeId: 'invalid-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceValidationError);
			expect(result.error.message).toContain('Employee ID must be a valid UUID');
		});

		it('should return error when used hours exceed total hours', () => {
			const props = createValidProps();
			const result = TimeOffBalanceRecord.create({
				...props,
				totalHours: BalanceHours.create(40).value,
				usedHours: BalanceHours.create(50).value
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TimeOffBalanceValidationError);
			expect(result.error.message).toContain('Used hours cannot exceed total hours');
		});

		it('should accept used hours equal to total hours', () => {
			const props = createValidProps();
			const result = TimeOffBalanceRecord.create({
				...props,
				totalHours: BalanceHours.create(40).value,
				usedHours: BalanceHours.create(40).value
			});

			expect(result.isOk).toBe(true);
		});

		it('should accept zero used hours', () => {
			const props = createValidProps();
			const result = TimeOffBalanceRecord.create({
				...props,
				usedHours: BalanceHours.create(0).value
			});

			expect(result.isOk).toBe(true);
		});
	});

	describe('getters', () => {
		it('should return all properties', () => {
			const props = createValidProps();
			const record = TimeOffBalanceRecord.create(props).value;

			expect(record.id).toBe(props.id);
			expect(record.employeeId).toBe(props.employeeId);
			expect(record.leaveType).toBe(props.leaveType);
			expect(record.period).toBe(props.period);
			expect(record.totalHours).toBe(props.totalHours);
			expect(record.usedHours).toBe(props.usedHours);
			expect(record.accrualRate).toBe(props.accrualRate);
			expect(record.carryoverHours).toBe(props.carryoverHours);
		});
	});

	describe('availableHours', () => {
		it('should calculate available hours as total minus used', () => {
			const props = createValidProps();
			const record = TimeOffBalanceRecord.create({
				...props,
				totalHours: BalanceHours.create(160).value,
				usedHours: BalanceHours.create(40).value
			}).value;

			expect(record.availableHours.value).toBe(120);
		});

		it('should return zero when all hours are used', () => {
			const props = createValidProps();
			const record = TimeOffBalanceRecord.create({
				...props,
				totalHours: BalanceHours.create(40).value,
				usedHours: BalanceHours.create(40).value
			}).value;

			expect(record.availableHours.value).toBe(0);
		});

		it('should return total when no hours are used', () => {
			const props = createValidProps();
			const record = TimeOffBalanceRecord.create({
				...props,
				totalHours: BalanceHours.create(160).value,
				usedHours: BalanceHours.create(0).value
			}).value;

			expect(record.availableHours.value).toBe(160);
		});
	});

	describe('useHours', () => {
		it('should reduce available hours by specified amount', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToUse = BalanceHours.create(20).value;

			const result = record.useHours(hoursToUse);

			expect(result.isOk).toBe(true);
			expect(result.value.usedHours.value).toBe(60); // 40 + 20
			expect(result.value.availableHours.value).toBe(100); // 160 - 60
		});

		it('should return error when using more than available', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToUse = BalanceHours.create(200).value;

			const result = record.useHours(hoursToUse);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InsufficientBalanceError);
		});

		it('should use exactly available hours', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToUse = BalanceHours.create(120).value; // Exactly available

			const result = record.useHours(hoursToUse);

			expect(result.isOk).toBe(true);
			expect(result.value.availableHours.value).toBe(0);
		});

		it('should return new immutable instance', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const originalAvailable = record.availableHours.value;
			const hoursToUse = BalanceHours.create(20).value;

			const result = record.useHours(hoursToUse);

			expect(result.value).not.toBe(record);
			expect(record.availableHours.value).toBe(originalAvailable); // Original unchanged
		});

		it('should use zero hours', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToUse = BalanceHours.create(0).value;

			const result = record.useHours(hoursToUse);

			expect(result.isOk).toBe(true);
			expect(result.value.usedHours.equals(record.usedHours)).toBe(true);
		});

		it('should handle decimal hours', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToUse = BalanceHours.create(5.5).value;

			const result = record.useHours(hoursToUse);

			expect(result.isOk).toBe(true);
			expect(result.value.usedHours.value).toBe(45.5);
		});
	});

	describe('addHours', () => {
		it('should increase total hours by specified amount', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToAdd = BalanceHours.create(40).value;

			const result = record.addHours(hoursToAdd);

			expect(result.isOk).toBe(true);
			expect(result.value.totalHours.value).toBe(200); // 160 + 40
		});

		it('should increase available hours proportionally', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToAdd = BalanceHours.create(40).value;

			const result = record.addHours(hoursToAdd);

			expect(result.isOk).toBe(true);
			expect(result.value.availableHours.value).toBe(160); // (160 + 40) - 40
		});

		it('should return error when adding exceeds maximum', () => {
			const record = TimeOffBalanceRecord.create({
				...createValidProps(),
				totalHours: BalanceHours.create(950).value
			}).value;
			const hoursToAdd = BalanceHours.create(100).value;

			const result = record.addHours(hoursToAdd);

			expect(result.isError).toBe(true);
		});

		it('should return new immutable instance', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const originalTotal = record.totalHours.value;
			const hoursToAdd = BalanceHours.create(40).value;

			const result = record.addHours(hoursToAdd);

			expect(result.value).not.toBe(record);
			expect(record.totalHours.value).toBe(originalTotal); // Original unchanged
		});

		it('should add decimal hours', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToAdd = BalanceHours.create(10.5).value;

			const result = record.addHours(hoursToAdd);

			expect(result.isOk).toBe(true);
			expect(result.value.totalHours.value).toBe(170.5);
		});

		it('should add zero hours', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;
			const hoursToAdd = BalanceHours.create(0).value;

			const result = record.addHours(hoursToAdd);

			expect(result.isOk).toBe(true);
			expect(result.value.totalHours.equals(record.totalHours)).toBe(true);
		});
	});

	describe('rollover', () => {
		it('should create new balance with available hours as carryover', () => {
			const currentPeriod = BalancePeriod.create(2025).value;
			const nextPeriod = BalancePeriod.create(2026).value;
			const record = TimeOffBalanceRecord.create({
				...createValidProps(),
				period: currentPeriod,
				totalHours: BalanceHours.create(160).value,
				usedHours: BalanceHours.create(40).value
			}).value;

			const result = record.rollover(nextPeriod);

			expect(result.isOk).toBe(true);
			expect(result.value.period).toBe(nextPeriod);
			expect(result.value.carryoverHours.value).toBe(120); // 160 - 40
		});

		it('should reset used hours to zero in new period', () => {
			const nextPeriod = BalancePeriod.create(2027).value;
			const record = TimeOffBalanceRecord.create(createValidProps()).value;

			const result = record.rollover(nextPeriod);

			expect(result.isOk).toBe(true);
			expect(result.value.usedHours.value).toBe(0);
		});

		it('should calculate new total as carryover plus accrued', () => {
			const nextPeriod = BalancePeriod.create(2027).value;
			const record = TimeOffBalanceRecord.create({
				...createValidProps(),
				totalHours: BalanceHours.create(160).value,
				usedHours: BalanceHours.create(40).value,
				accrualRate: AccrualRate.create(5, 'month').value // 5 hours per month = 60/year
			}).value;

			const result = record.rollover(nextPeriod);

			expect(result.isOk).toBe(true);
			// Carryover 120 + annual accrual (5 * 12 = 60) = 180
			expect(result.value.totalHours.value).toBe(180);
		});

		it('should return error when total exceeds maximum', () => {
			const nextPeriod = BalancePeriod.create(2027).value;
			const record = TimeOffBalanceRecord.create({
				...createValidProps(),
				totalHours: BalanceHours.create(950).value,
				usedHours: BalanceHours.create(0).value,
				accrualRate: AccrualRate.create(10, 'month').value // Would create 950 + 120 = 1070, exceeds max
			}).value;

			const result = record.rollover(nextPeriod);

			expect(result.isError).toBe(true);
		});

		it('should preserve employee and leave type', () => {
			const nextPeriod = BalancePeriod.create(2027).value;
			const record = TimeOffBalanceRecord.create(createValidProps()).value;

			const result = record.rollover(nextPeriod);

			expect(result.isOk).toBe(true);
			expect(result.value.employeeId).toBe(record.employeeId);
			expect(result.value.leaveType).toBe(record.leaveType);
		});

		it('should return new immutable instance', () => {
			const nextPeriod = BalancePeriod.create(2027).value;
			const record = TimeOffBalanceRecord.create(createValidProps()).value;

			const result = record.rollover(nextPeriod);

			expect(result.value).not.toBe(record);
			expect(record.period).not.toBe(nextPeriod); // Original unchanged
		});

		it('should handle zero carryover', () => {
			const nextPeriod = BalancePeriod.create(2027).value;
			const record = TimeOffBalanceRecord.create({
				...createValidProps(),
				totalHours: BalanceHours.create(160).value,
				usedHours: BalanceHours.create(160).value // All used
			}).value;

			const result = record.rollover(nextPeriod);

			expect(result.isOk).toBe(true);
			expect(result.value.carryoverHours.value).toBe(0);
		});
	});

	describe('equals', () => {
		it('should return true for same ID', () => {
			const record1 = TimeOffBalanceRecord.create(createValidProps()).value;
			const record2 = TimeOffBalanceRecord.create(createValidProps()).value;

			expect(record1.equals(record2)).toBe(true);
		});

		it('should return false for different IDs', () => {
			const props1 = createValidProps();
			const props2 = { ...createValidProps(), id: '770e8400-e29b-41d4-a716-446655440000' };

			const record1 = TimeOffBalanceRecord.create(props1).value;
			const record2 = TimeOffBalanceRecord.create(props2).value;

			expect(record1.equals(record2)).toBe(false);
		});
	});

	describe('integration scenarios', () => {
		it('should handle complete workflow: add hours -> use hours -> rollover', () => {
			const period2025 = BalancePeriod.create(2025).value;
			const period2026 = BalancePeriod.create(2026).value;

			let record = TimeOffBalanceRecord.create({
				...createValidProps(),
				period: period2025,
				totalHours: BalanceHours.create(160).value,
				usedHours: BalanceHours.create(0).value
			}).value;

			// Add bonus hours
			const addResult = record.addHours(BalanceHours.create(40).value);
			expect(addResult.isOk).toBe(true);
			record = addResult.value;

			// Use some hours
			const useResult = record.useHours(BalanceHours.create(60).value);
			expect(useResult.isOk).toBe(true);
			record = useResult.value;

			// Rollover to next year
			const rolloverResult = record.rollover(period2026);
			expect(rolloverResult.isOk).toBe(true);

			const nextYearRecord = rolloverResult.value;
			expect(nextYearRecord.period).toBe(period2026);
			expect(nextYearRecord.carryoverHours.value).toBe(140); // 200 - 60
		});

		it('should reject modifications that violate invariants', () => {
			const record = TimeOffBalanceRecord.create(createValidProps()).value;

			// Try to use more hours than available
			const result = record.useHours(BalanceHours.create(500).value);

			expect(result.isError).toBe(true);
			expect(record.availableHours.value).toBe(120); // Original unchanged
		});
	});
});
