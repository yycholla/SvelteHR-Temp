// src/domain/EmergencyContact/value-objects/ContactPhone.test.ts
import { describe, it, expect } from 'vitest';
import { ContactPhone } from './ContactPhone';
import { InvalidEmergencyContactError } from '../errors/EmergencyContactErrors';

describe('ContactPhone', () => {
	describe('create', () => {
		it('should create a valid phone number', () => {
			const result = ContactPhone.create('+1 555-0100');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('+1 555-0100');
		});

		it('should create a phone with only digits', () => {
			const result = ContactPhone.create('5550100');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('5550100');
		});

		it('should allow phone with parentheses', () => {
			const result = ContactPhone.create('(555) 010-0100');
			expect(result.isOk).toBe(true);
		});

		it('should allow phone with dashes', () => {
			const result = ContactPhone.create('555-010-0100');
			expect(result.isOk).toBe(true);
		});

		it('should allow phone with spaces', () => {
			const result = ContactPhone.create('+44 20 7946 0958');
			expect(result.isOk).toBe(true);
		});

		it('should allow phone at minimum length (7 characters)', () => {
			const result = ContactPhone.create('5550100');
			expect(result.isOk).toBe(true);
		});

		it('should allow phone at maximum length (20 characters)', () => {
			const result = ContactPhone.create('+1 (555) 010-01000');
			expect(result.isOk).toBe(true);
			expect(result.value.value.length).toBeLessThanOrEqual(20);
		});

		it('should trim whitespace', () => {
			const result = ContactPhone.create('  555-0100  ');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('555-0100');
		});

		it('should reject empty string', () => {
			const result = ContactPhone.create('');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject phone shorter than 7 characters', () => {
			const result = ContactPhone.create('12345');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(result.error.message).toContain('7');
		});

		it('should reject phone longer than 20 characters', () => {
			const result = ContactPhone.create('123456789012345678901');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
			expect(result.error.message).toContain('20');
		});

		it('should reject phone with letters', () => {
			const result = ContactPhone.create('555-CALL-US');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject phone with @ symbol', () => {
			const result = ContactPhone.create('555@0100');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should reject whitespace-only string', () => {
			const result = ContactPhone.create('       ');
			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidEmergencyContactError);
		});

		it('should have correct error code on failure', () => {
			const result = ContactPhone.create('');
			expect(result.isError).toBe(true);
			expect(result.error.code).toBe('INVALID_EMERGENCY_CONTACT');
		});

		it('should allow international format with plus sign', () => {
			const result = ContactPhone.create('+44 20 7946 0958');
			expect(result.isOk).toBe(true);
		});
	});

	describe('value', () => {
		it('should return the phone number value', () => {
			const result = ContactPhone.create('+1 555-0100');
			expect(result.value.value).toBe('+1 555-0100');
		});
	});

	describe('equals', () => {
		it('should return true for equal phone numbers', () => {
			const phone1 = ContactPhone.create('+1 555-0100').value;
			const phone2 = ContactPhone.create('+1 555-0100').value;
			expect(phone1.equals(phone2)).toBe(true);
		});

		it('should return false for different phone numbers', () => {
			const phone1 = ContactPhone.create('+1 555-0100').value;
			const phone2 = ContactPhone.create('+1 555-0200').value;
			expect(phone1.equals(phone2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the phone number as string', () => {
			const phone = ContactPhone.create('+1 555-0100').value;
			expect(phone.toString()).toBe('+1 555-0100');
		});
	});
});
