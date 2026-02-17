// src/domain/Compliance/value-objects/ComplianceStatus.test.ts
import { describe, it, expect } from 'vitest';
import { ComplianceStatus } from './ComplianceStatus';

describe('ComplianceStatus', () => {
	describe('create()', () => {
		it('should create a valid compliant status', () => {
			const result = ComplianceStatus.create('compliant');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('compliant');
		});

		it('should create a valid warning status', () => {
			const result = ComplianceStatus.create('warning');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('warning');
		});

		it('should create a valid failed status', () => {
			const result = ComplianceStatus.create('failed');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('failed');
		});

		it('should create a valid pending status', () => {
			const result = ComplianceStatus.create('pending');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('pending');
		});

		it('should reject an invalid status', () => {
			const result = ComplianceStatus.create('unknown');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid compliance status');
			expect(result.error.message).toContain('unknown');
		});

		it('should reject an empty string', () => {
			const result = ComplianceStatus.create('');
			expect(result.isError).toBe(true);
		});

		it('should reject uppercase status values', () => {
			const result = ComplianceStatus.create('COMPLIANT');
			expect(result.isError).toBe(true);
		});

		it('should include valid options in error message', () => {
			const result = ComplianceStatus.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('compliant');
			expect(result.error.message).toContain('warning');
			expect(result.error.message).toContain('failed');
			expect(result.error.message).toContain('pending');
		});
	});

	describe('isCompliant()', () => {
		it('should return true for compliant status', () => {
			const status = ComplianceStatus.create('compliant').value;
			expect(status.isCompliant()).toBe(true);
		});

		it('should return false for warning status', () => {
			const status = ComplianceStatus.create('warning').value;
			expect(status.isCompliant()).toBe(false);
		});

		it('should return false for failed status', () => {
			const status = ComplianceStatus.create('failed').value;
			expect(status.isCompliant()).toBe(false);
		});

		it('should return false for pending status', () => {
			const status = ComplianceStatus.create('pending').value;
			expect(status.isCompliant()).toBe(false);
		});
	});

	describe('requiresAction()', () => {
		it('should return false for compliant status', () => {
			const status = ComplianceStatus.create('compliant').value;
			expect(status.requiresAction()).toBe(false);
		});

		it('should return true for warning status', () => {
			const status = ComplianceStatus.create('warning').value;
			expect(status.requiresAction()).toBe(true);
		});

		it('should return true for failed status', () => {
			const status = ComplianceStatus.create('failed').value;
			expect(status.requiresAction()).toBe(true);
		});

		it('should return false for pending status', () => {
			const status = ComplianceStatus.create('pending').value;
			expect(status.requiresAction()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for two equal statuses', () => {
			const a = ComplianceStatus.create('compliant').value;
			const b = ComplianceStatus.create('compliant').value;
			expect(a.equals(b)).toBe(true);
		});

		it('should return false for different statuses', () => {
			const a = ComplianceStatus.create('compliant').value;
			const b = ComplianceStatus.create('warning').value;
			expect(a.equals(b)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the string value', () => {
			const status = ComplianceStatus.create('pending').value;
			expect(status.toString()).toBe('pending');
		});
	});
});
