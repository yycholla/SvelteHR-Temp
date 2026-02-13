import { describe, it, expect } from 'vitest';
import { RsvpStatus } from './RsvpStatus';
import { RsvpStatusValidationError } from '../errors/EventErrors';

describe('RsvpStatus', () => {
	describe('create()', () => {
		describe('valid statuses', () => {
			it('should create pending status', () => {
				const result = RsvpStatus.create('pending');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('pending');
			});

			it('should create accepted status', () => {
				const result = RsvpStatus.create('accepted');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('accepted');
			});

			it('should create declined status', () => {
				const result = RsvpStatus.create('declined');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('declined');
			});

			it('should create tentative status', () => {
				const result = RsvpStatus.create('tentative');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('tentative');
			});

			it('should create no_response status', () => {
				const result = RsvpStatus.create('no_response');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('no_response');
			});

			it('should create waitlisted status', () => {
				const result = RsvpStatus.create('waitlisted');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('waitlisted');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase to lowercase', () => {
				const result = RsvpStatus.create('ACCEPTED');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('accepted');
			});

			it('should trim whitespace', () => {
				const result = RsvpStatus.create('  pending  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('pending');
			});

			it('should convert kebab-case to snake_case for no_response', () => {
				const result = RsvpStatus.create('no-response');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('no_response');
			});

			it('should handle mixed case and kebab-case', () => {
				const result = RsvpStatus.create('No-Response');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('no_response');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = RsvpStatus.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(RsvpStatusValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject invalid status', () => {
				const result = RsvpStatus.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(RsvpStatusValidationError);
				expect(result.error?.message).toContain('Invalid status');
			});
		});
	});

	describe('status check methods', () => {
		it('should correctly identify pending status', () => {
			const status = RsvpStatus.create('pending').value!;
			expect(status.isPending()).toBe(true);
			expect(status.isAccepted()).toBe(false);
		});

		it('should correctly identify accepted status', () => {
			const status = RsvpStatus.create('accepted').value!;
			expect(status.isAccepted()).toBe(true);
			expect(status.isPending()).toBe(false);
		});

		it('should correctly identify declined status', () => {
			const status = RsvpStatus.create('declined').value!;
			expect(status.isDeclined()).toBe(true);
			expect(status.isAccepted()).toBe(false);
		});

		it('should correctly identify tentative status', () => {
			const status = RsvpStatus.create('tentative').value!;
			expect(status.isTentative()).toBe(true);
			expect(status.isAccepted()).toBe(false);
		});

		it('should correctly identify no_response status', () => {
			const status = RsvpStatus.create('no_response').value!;
			expect(status.isNoResponse()).toBe(true);
			expect(status.isAccepted()).toBe(false);
		});

		it('should correctly identify waitlisted status', () => {
			const status = RsvpStatus.create('waitlisted').value!;
			expect(status.isWaitlisted()).toBe(true);
			expect(status.isAccepted()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for same status value', () => {
			const status1 = RsvpStatus.create('accepted').value!;
			const status2 = RsvpStatus.create('accepted').value!;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different status values', () => {
			const status1 = RsvpStatus.create('accepted').value!;
			const status2 = RsvpStatus.create('declined').value!;
			expect(status1.equals(status2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the status value as string', () => {
			const status = RsvpStatus.create('accepted').value!;
			expect(status.toString()).toBe('accepted');
		});

		it('should return normalized value', () => {
			const status = RsvpStatus.create('no-response').value!;
			expect(status.toString()).toBe('no_response');
		});
	});
});
