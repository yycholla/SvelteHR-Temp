// src/domain/Compensation/CompensationRecord.test.ts
import { describe, expect, it } from 'vitest';
import { CompensationRecord } from './CompensationRecord';
import { Salary } from './value-objects/Salary';
import { SalaryGrade } from './value-objects/SalaryGrade';
import { CompensationType } from './value-objects/CompensationType';
import { PaymentFrequency } from './value-objects/PaymentFrequency';
import { EffectiveDate } from './value-objects/EffectiveDate';
import { InvalidCompensationError } from './errors';

describe('CompensationRecord', () => {
	const createValidProps = () => ({
		id: '550e8400-e29b-41d4-a716-446655440000',
		employeeId: '660e8400-e29b-41d4-a716-446655440000',
		salary: Salary.create(75000, 'USD').value,
		salaryGrade: SalaryGrade.create('senior').value,
		compensationType: CompensationType.create('base_salary').value,
		paymentFrequency: PaymentFrequency.create('monthly').value,
		effectiveDate: EffectiveDate.create(new Date('2026-01-01')).value,
		endDate: null,
		notes: null
	});

	describe('create', () => {
		it('returns Ok with valid data', () => {
			const result = CompensationRecord.create(createValidProps());

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('550e8400-e29b-41d4-a716-446655440000');
			expect(result.value.employeeId).toBe('660e8400-e29b-41d4-a716-446655440000');
		});

		it('returns InvalidCompensationError with invalid id UUID', () => {
			const props = createValidProps();
			const result = CompensationRecord.create({ ...props, id: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
			expect(result.error.message).toContain('CompensationRecord ID must be a valid UUID');
		});

		it('returns InvalidCompensationError with invalid employeeId UUID', () => {
			const props = createValidProps();
			const result = CompensationRecord.create({ ...props, employeeId: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
			expect(result.error.message).toContain('Employee ID must be a valid UUID');
		});

		it('returns InvalidCompensationError when end date is before effective date', () => {
			const props = createValidProps();
			const result = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(new Date('2026-02-01')).value,
				endDate: EffectiveDate.create(new Date('2026-01-01')).value
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
			expect(result.error.message).toContain('End date must be after effective date');
		});

		it('returns InvalidCompensationError when end date equals effective date', () => {
			const props = createValidProps();
			const date = new Date('2026-02-01');
			const result = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(date).value,
				endDate: EffectiveDate.create(date).value
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
		});

		it('accepts end date after effective date', () => {
			const props = createValidProps();
			const result = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(new Date('2026-01-01')).value,
				endDate: EffectiveDate.create(new Date('2026-12-31')).value
			});

			expect(result.isOk).toBe(true);
		});
	});

	describe('isActive', () => {
		it('returns true when effective date is past and no end date', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(new Date('2020-01-01')).value,
				endDate: null
			}).value;

			expect(record.isActive).toBe(true);
		});

		it('returns true when effective date is past and end date is future', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(new Date('2020-01-01')).value,
				endDate: EffectiveDate.create(new Date('2030-12-31')).value
			}).value;

			expect(record.isActive).toBe(true);
		});

		it('returns false when effective date is future', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(new Date('2030-01-01')).value,
				endDate: null
			}).value;

			expect(record.isActive).toBe(false);
		});

		it('returns false when end date is past', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(new Date('2020-01-01')).value,
				endDate: EffectiveDate.create(new Date('2021-12-31')).value
			}).value;

			expect(record.isActive).toBe(false);
		});
	});

	describe('getAnnualSalary', () => {
		it('calculates annual salary for monthly frequency', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				salary: Salary.create(5000, 'USD').value,
				paymentFrequency: PaymentFrequency.create('monthly').value
			}).value;

			expect(record.getAnnualSalary()).toBe(60000);
		});

		it('calculates annual salary for biweekly frequency', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				salary: Salary.create(2000, 'USD').value,
				paymentFrequency: PaymentFrequency.create('biweekly').value
			}).value;

			expect(record.getAnnualSalary()).toBe(52000);
		});

		it('returns same amount for annually frequency', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				salary: Salary.create(75000, 'USD').value,
				paymentFrequency: PaymentFrequency.create('annually').value
			}).value;

			expect(record.getAnnualSalary()).toBe(75000);
		});
	});

	describe('updateSalary', () => {
		it('returns new instance with updated salary', () => {
			const record = CompensationRecord.create(createValidProps()).value;
			const newSalary = Salary.create(85000, 'USD').value;

			const updated = record.updateSalary(newSalary);

			expect(updated).not.toBe(record); // Different instance
			expect(updated.salary.amount).toBe(85000);
			expect(record.salary.amount).toBe(75000); // Original unchanged
		});
	});

	describe('updateGrade', () => {
		it('returns new instance with updated grade', () => {
			const record = CompensationRecord.create(createValidProps()).value;
			const newGrade = SalaryGrade.create('lead').value;

			const updated = record.updateGrade(newGrade);

			expect(updated).not.toBe(record); // Different instance
			expect(updated.salaryGrade.value).toBe('lead');
			expect(record.salaryGrade.value).toBe('senior'); // Original unchanged
		});
	});

	describe('terminate', () => {
		it('returns Ok with valid end date', () => {
			const record = CompensationRecord.create(createValidProps()).value;
			const endDate = EffectiveDate.create(new Date('2026-12-31')).value;

			const result = record.terminate(endDate);

			expect(result.isOk).toBe(true);
			expect(result.value.endDate).toBe(endDate);
		});

		it('returns error when end date is before effective date', () => {
			const props = createValidProps();
			const record = CompensationRecord.create({
				...props,
				effectiveDate: EffectiveDate.create(new Date('2026-06-01')).value
			}).value;

			const endDate = EffectiveDate.create(new Date('2026-01-01')).value;
			const result = record.terminate(endDate);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidCompensationError);
			expect(result.error.message).toContain('End date must be after effective date');
		});

		it('returns new instance (immutability)', () => {
			const record = CompensationRecord.create(createValidProps()).value;
			const endDate = EffectiveDate.create(new Date('2026-12-31')).value;

			const result = record.terminate(endDate);

			expect(result.value).not.toBe(record); // Different instance
			expect(record.endDate).toBe(null); // Original unchanged
		});
	});

	describe('updateNotes', () => {
		it('returns new instance with updated notes', () => {
			const record = CompensationRecord.create(createValidProps()).value;

			const updated = record.updateNotes('Promotion to senior level');

			expect(updated).not.toBe(record); // Different instance
			expect(updated.notes).toBe('Promotion to senior level');
			expect(record.notes).toBe(null); // Original unchanged
		});

		it('trims whitespace from notes', () => {
			const record = CompensationRecord.create(createValidProps()).value;

			const updated = record.updateNotes('  Annual raise  ');

			expect(updated.notes).toBe('Annual raise');
		});

		it('accepts null notes', () => {
			const record = CompensationRecord.create(createValidProps()).value;

			const updated = record.updateNotes(null);

			expect(updated.notes).toBe(null);
		});

		it('converts empty string to null', () => {
			const record = CompensationRecord.create(createValidProps()).value;

			const updated = record.updateNotes('   ');

			expect(updated.notes).toBe(null);
		});
	});

	describe('equals', () => {
		it('returns true for same ID', () => {
			const record1 = CompensationRecord.create(createValidProps()).value;
			const record2 = CompensationRecord.create(createValidProps()).value;

			expect(record1.equals(record2)).toBe(true);
		});

		it('returns false for different IDs', () => {
			const props1 = createValidProps();
			const props2 = { ...createValidProps(), id: '770e8400-e29b-41d4-a716-446655440000' };

			const record1 = CompensationRecord.create(props1).value;
			const record2 = CompensationRecord.create(props2).value;

			expect(record1.equals(record2)).toBe(false);
		});
	});
});
