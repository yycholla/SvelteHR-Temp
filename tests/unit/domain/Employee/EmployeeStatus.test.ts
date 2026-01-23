// tests/unit/domain/Employee/EmployeeStatus.test.ts
import { describe, it, expect } from 'vitest';
import { EmployeeStatus } from '$domain/Employee/EmployeeStatus';

describe('EmployeeStatus', () => {
	describe('Active', () => {
		it('has value "active"', () => {
			expect(EmployeeStatus.Active.value).toBe('active');
		});

		it('isActive returns true', () => {
			expect(EmployeeStatus.Active.isActive).toBe(true);
		});
	});

	describe('Inactive', () => {
		it('has value "inactive"', () => {
			expect(EmployeeStatus.Inactive.value).toBe('inactive');
		});

		it('isActive returns false', () => {
			expect(EmployeeStatus.Inactive.isActive).toBe(false);
		});
	});

	describe('equals', () => {
		it('returns true for same status', () => {
			expect(EmployeeStatus.Active.equals(EmployeeStatus.Active)).toBe(true);
		});

		it('returns false for different status', () => {
			expect(EmployeeStatus.Active.equals(EmployeeStatus.Inactive)).toBe(false);
		});
	});

	describe('toString', () => {
		it('returns value for Active', () => {
			expect(EmployeeStatus.Active.toString()).toBe('active');
		});

		it('returns value for Inactive', () => {
			expect(EmployeeStatus.Inactive.toString()).toBe('inactive');
		});
	});

	describe('fromString', () => {
		it('returns Active for "active"', () => {
			expect(EmployeeStatus.fromString('active')).toBe(EmployeeStatus.Active);
		});

		it('returns Inactive for "inactive"', () => {
			expect(EmployeeStatus.fromString('inactive')).toBe(EmployeeStatus.Inactive);
		});

		it('throws for invalid value', () => {
			expect(() => EmployeeStatus.fromString('invalid')).toThrow(
				'Invalid employee status: invalid'
			);
		});
	});

	describe('toJSON', () => {
		it('serializes Active to "active"', () => {
			expect(EmployeeStatus.Active.toJSON()).toBe('active');
		});

		it('serializes Inactive to "inactive"', () => {
			expect(EmployeeStatus.Inactive.toJSON()).toBe('inactive');
		});

		it('survives JSON round-trip', () => {
			const original = EmployeeStatus.Active;
			const json = JSON.stringify(original);
			expect(json).toBe('"active"');
			const restored = EmployeeStatus.fromString(JSON.parse(json));
			expect(restored).toBe(EmployeeStatus.Active);
		});
	});
});
