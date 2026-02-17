// src/domain/EmergencyContact/value-objects/Relationship.test.ts
import { describe, it, expect } from 'vitest';
import { Relationship } from './Relationship';
import { InvalidEmergencyContactError } from '../errors/EmergencyContactErrors';

describe('Relationship', () => {
	describe('create', () => {
		it('should create spouse relationship', () => {
			const result = Relationship.create('spouse');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('spouse');
		});

		it('should create parent relationship', () => {
			const result = Relationship.create('parent');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('parent');
		});

		it('should create child relationship', () => {
			const result = Relationship.create('child');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('child');
		});

		it('should create sibling relationship', () => {
			const result = Relationship.create('sibling');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('sibling');
		});

		it('should create friend relationship', () => {
			const result = Relationship.create('friend');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('friend');
		});

		it('should create other relationship', () => {
			const result = Relationship.create('other');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('other');
		});

		it('should reject invalid relationship value', () => {
			const result = Relationship.create('colleague');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject empty string', () => {
			const result = Relationship.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject uppercase value', () => {
			const result = Relationship.create('SPOUSE');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject mixed case value', () => {
			const result = Relationship.create('Parent');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should include valid values in error message', () => {
			const result = Relationship.create('manager');
			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('spouse');
		});

		it('should have correct error code on failure', () => {
			const result = Relationship.create('invalid');
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMERGENCY_CONTACT');
		});
	});

	describe('isImmediate', () => {
		it('should return true for spouse', () => {
			const rel = Relationship.create('spouse').value;
			expect(rel.isImmediate).toBe(true);
		});

		it('should return true for parent', () => {
			const rel = Relationship.create('parent').value;
			expect(rel.isImmediate).toBe(true);
		});

		it('should return true for child', () => {
			const rel = Relationship.create('child').value;
			expect(rel.isImmediate).toBe(true);
		});

		it('should return true for sibling', () => {
			const rel = Relationship.create('sibling').value;
			expect(rel.isImmediate).toBe(true);
		});

		it('should return false for friend', () => {
			const rel = Relationship.create('friend').value;
			expect(rel.isImmediate).toBe(false);
		});

		it('should return false for other', () => {
			const rel = Relationship.create('other').value;
			expect(rel.isImmediate).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for equal relationships', () => {
			const rel1 = Relationship.create('spouse').value;
			const rel2 = Relationship.create('spouse').value;
			expect(rel1.equals(rel2)).toBe(true);
		});

		it('should return false for different relationships', () => {
			const rel1 = Relationship.create('spouse').value;
			const rel2 = Relationship.create('parent').value;
			expect(rel1.equals(rel2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return relationship as string', () => {
			const rel = Relationship.create('spouse').value;
			expect(rel.toString()).toBe('spouse');
		});
	});
});
