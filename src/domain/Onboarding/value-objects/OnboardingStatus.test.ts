import { describe, it, expect } from 'vitest';
import { OnboardingStatus } from './OnboardingStatus';
import { InvalidAssignmentError } from '../errors/OnboardingErrors';

describe('OnboardingStatus', () => {
	describe('create()', () => {
		describe('valid statuses', () => {
			it('should create pending status', () => {
				const result = OnboardingStatus.create('pending');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('pending');
			});

			it('should create in_progress status', () => {
				const result = OnboardingStatus.create('in_progress');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('in_progress');
			});

			it('should create completed status', () => {
				const result = OnboardingStatus.create('completed');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('completed');
			});

			it('should create overdue status', () => {
				const result = OnboardingStatus.create('overdue');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('overdue');
			});
		});

		describe('validation', () => {
			it('should reject an empty string', () => {
				const result = OnboardingStatus.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Invalid onboarding status');
			});

			it('should reject a whitespace-only string', () => {
				const result = OnboardingStatus.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			});

			it('should reject an unrecognized status', () => {
				const result = OnboardingStatus.create('unknown');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
				expect(result.error.message).toContain('Invalid onboarding status');
			});

			it('should reject Pending with capital letter (case-sensitive)', () => {
				const result = OnboardingStatus.create('Pending');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			});

			it('should reject COMPLETED uppercase', () => {
				const result = OnboardingStatus.create('COMPLETED');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			});

			it('should reject In_Progress with capital letters', () => {
				const result = OnboardingStatus.create('In_Progress');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			});

			it('should include the list of valid statuses in the error message', () => {
				const result = OnboardingStatus.create('bad_status');
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('pending');
			});

			it('should have the correct error code', () => {
				const result = OnboardingStatus.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_ASSIGNMENT');
			});
		});

		describe('whitespace handling', () => {
			it('should trim whitespace before validation', () => {
				const result = OnboardingStatus.create('  pending  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('pending');
			});

			it('should trim and reject whitespace-only string', () => {
				const result = OnboardingStatus.create('  \t  ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(InvalidAssignmentError);
			});
		});
	});

	describe('value getter', () => {
		it('should return the exact status value', () => {
			const result = OnboardingStatus.create('in_progress');
			expect(result.isOk).toBe(true);
			expect(result.value.value).toBe('in_progress');
		});
	});

	describe('isCompleted()', () => {
		it('should return true when status is completed', () => {
			const status = OnboardingStatus.create('completed').value;
			expect(status.isCompleted()).toBe(true);
		});

		it('should return false when status is pending', () => {
			const status = OnboardingStatus.create('pending').value;
			expect(status.isCompleted()).toBe(false);
		});

		it('should return false when status is in_progress', () => {
			const status = OnboardingStatus.create('in_progress').value;
			expect(status.isCompleted()).toBe(false);
		});

		it('should return false when status is overdue', () => {
			const status = OnboardingStatus.create('overdue').value;
			expect(status.isCompleted()).toBe(false);
		});
	});

	describe('isOverdue()', () => {
		it('should return true when status is overdue', () => {
			const status = OnboardingStatus.create('overdue').value;
			expect(status.isOverdue()).toBe(true);
		});

		it('should return false when status is pending', () => {
			const status = OnboardingStatus.create('pending').value;
			expect(status.isOverdue()).toBe(false);
		});

		it('should return false when status is in_progress', () => {
			const status = OnboardingStatus.create('in_progress').value;
			expect(status.isOverdue()).toBe(false);
		});

		it('should return false when status is completed', () => {
			const status = OnboardingStatus.create('completed').value;
			expect(status.isOverdue()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for the same status', () => {
			const status1 = OnboardingStatus.create('pending').value;
			const status2 = OnboardingStatus.create('pending').value;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different statuses', () => {
			const status1 = OnboardingStatus.create('pending').value;
			const status2 = OnboardingStatus.create('completed').value;
			expect(status1.equals(status2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the status string value', () => {
			const status = OnboardingStatus.create('overdue').value;
			expect(status.toString()).toBe('overdue');
		});
	});
});
