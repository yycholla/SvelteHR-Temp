// src/domain/EmergencyContact/value-objects/ContactName.test.ts
import { describe, it, expect } from 'vitest';
import { ContactName } from './ContactName';
import { InvalidEmergencyContactError } from '../errors/EmergencyContactErrors';

describe('ContactName', () => {
	describe('create', () => {
		it('should create a valid contact name', () => {
			const result = ContactName.create('Jane Doe');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Jane Doe');
		});

		it('should trim whitespace from name', () => {
			const result = ContactName.create('  John Smith  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('John Smith');
		});

		it('should allow names with hyphens', () => {
			const result = ContactName.create('Mary-Jane Watson');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Mary-Jane Watson');
		});

		it('should allow names with apostrophes', () => {
			const result = ContactName.create("O'Brien Connor");
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe("O'Brien Connor");
		});

		it('should allow names with periods', () => {
			const result = ContactName.create('Dr. Smith');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('Dr. Smith');
		});

		it('should allow names at exactly 100 characters', () => {
			const name = 'A'.repeat(100);
			const result = ContactName.create(name);
			expect(result.isOk).toBe(true);
		});

		it('should allow single character name', () => {
			const result = ContactName.create('A');
			expect(result.isOk).toBe(true);
		});

		it('should reject empty string', () => {
			const result = ContactName.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject whitespace-only string', () => {
			const result = ContactName.create('   ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject name longer than 100 characters', () => {
			const name = 'A'.repeat(101);
			const result = ContactName.create(name);
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(result.error.message).toContain('100');
		});

		it('should reject name with digits', () => {
			const result = ContactName.create('John123');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject name with special characters like @', () => {
			const result = ContactName.create('john@doe');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject name with ampersand', () => {
			const result = ContactName.create('John & Jane');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should allow accented characters', () => {
			const result = ContactName.create('José García');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('José García');
		});

		it('should have correct error code on failure', () => {
			const result = ContactName.create('');
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMERGENCY_CONTACT');
		});
	});

	describe('value', () => {
		it('should return the trimmed name', () => {
			const result = ContactName.create('  Alice  ');
			expect(result.value.value).toBe('Alice');
		});
	});

	describe('equals', () => {
		it('should return true for equal names', () => {
			const name1 = ContactName.create('Jane Doe').value;
			const name2 = ContactName.create('Jane Doe').value;
			expect(name1.equals(name2)).toBe(true);
		});

		it('should return false for different names', () => {
			const name1 = ContactName.create('Jane Doe').value;
			const name2 = ContactName.create('John Smith').value;
			expect(name1.equals(name2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the name as a string', () => {
			const name = ContactName.create('Jane Doe').value;
			expect(name.toString()).toBe('Jane Doe');
		});
	});
});
