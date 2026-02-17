// src/domain/Compliance/value-objects/ComplianceAreaName.test.ts
import { describe, it, expect } from 'vitest';
import { ComplianceAreaName } from './ComplianceAreaName';

describe('ComplianceAreaName', () => {
	describe('create()', () => {
		it('should create a valid compliance area name', () => {
			const result = ComplianceAreaName.create('Data Privacy (GDPR)');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Data Privacy (GDPR)');
		});

		it('should trim leading and trailing whitespace', () => {
			const result = ComplianceAreaName.create('  Employment Law  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Employment Law');
		});

		it('should reject an empty string', () => {
			const result = ComplianceAreaName.create('');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('should reject a whitespace-only string', () => {
			const result = ComplianceAreaName.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('cannot be empty');
		});

		it('should accept a name at exactly 200 characters', () => {
			const name = 'A'.repeat(200);
			const result = ComplianceAreaName.create(name);
			expect(result.isOk).toBe(true);
		});

		it('should reject a name exceeding 200 characters', () => {
			const name = 'A'.repeat(201);
			const result = ComplianceAreaName.create(name);
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('at most 200 characters');
		});

		it('should create valid area names for known compliance areas', () => {
			const areas = [
				'Data Privacy (GDPR)',
				'Employment Law',
				'Health & Safety',
				'Anti-Discrimination'
			];

			for (const area of areas) {
				const result = ComplianceAreaName.create(area);
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe(area);
			}
		});
	});

	describe('equals()', () => {
		it('should return true for equal names', () => {
			const a = ComplianceAreaName.create('GDPR').value;
			const b = ComplianceAreaName.create('GDPR').value;
			expect(a.equals(b)).toBe(true);
		});

		it('should return false for different names', () => {
			const a = ComplianceAreaName.create('GDPR').value;
			const b = ComplianceAreaName.create('Employment Law').value;
			expect(a.equals(b)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the trimmed name string', () => {
			const name = ComplianceAreaName.create('Health & Safety').value;
			expect(name.toString()).toBe('Health & Safety');
		});
	});
});
