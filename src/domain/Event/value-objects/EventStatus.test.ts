import { describe, it, expect } from 'vitest';
import { EventStatus } from './EventStatus';
import { EventStatusValidationError } from '../errors/EventErrors';

describe('EventStatus', () => {
	describe('create()', () => {
		describe('valid statuses', () => {
			it('should create scheduled status', () => {
				const result = EventStatus.create('scheduled');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('scheduled');
			});

			it('should create ongoing status', () => {
				const result = EventStatus.create('ongoing');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('ongoing');
			});

			it('should create completed status', () => {
				const result = EventStatus.create('completed');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('completed');
			});

			it('should create cancelled status', () => {
				const result = EventStatus.create('cancelled');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('cancelled');
			});

			it('should create postponed status', () => {
				const result = EventStatus.create('postponed');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('postponed');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase status', () => {
				const result = EventStatus.create('SCHEDULED');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('scheduled');
			});

			it('should normalize mixed case status', () => {
				const result = EventStatus.create('OnGoInG');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('ongoing');
			});

			it('should trim whitespace', () => {
				const result = EventStatus.create('  completed  ');
				expect(result.isOk).toBe(true);
				expect(result.value?.value).toBe('completed');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = EventStatus.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventStatusValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});

			it('should reject invalid status', () => {
				const result = EventStatus.create('invalid');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventStatusValidationError);
				expect(result.error?.message).toContain('Invalid status');
			});

			it('should reject whitespace-only string', () => {
				const result = EventStatus.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(EventStatusValidationError);
				expect(result.error?.message).toContain('cannot be empty');
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same status value', () => {
			const status1 = EventStatus.create('scheduled').value!;
			const status2 = EventStatus.create('scheduled').value!;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different status values', () => {
			const status1 = EventStatus.create('scheduled').value!;
			const status2 = EventStatus.create('ongoing').value!;
			expect(status1.equals(status2)).toBe(false);
		});
	});

	describe('status check methods', () => {
		it('should correctly identify scheduled status', () => {
			const status = EventStatus.create('scheduled').value!;
			expect(status.isScheduled()).toBe(true);
			expect(status.isOngoing()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
			expect(status.isPostponed()).toBe(false);
		});

		it('should correctly identify ongoing status', () => {
			const status = EventStatus.create('ongoing').value!;
			expect(status.isScheduled()).toBe(false);
			expect(status.isOngoing()).toBe(true);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
			expect(status.isPostponed()).toBe(false);
		});

		it('should correctly identify completed status', () => {
			const status = EventStatus.create('completed').value!;
			expect(status.isScheduled()).toBe(false);
			expect(status.isOngoing()).toBe(false);
			expect(status.isCompleted()).toBe(true);
			expect(status.isCancelled()).toBe(false);
			expect(status.isPostponed()).toBe(false);
		});

		it('should correctly identify cancelled status', () => {
			const status = EventStatus.create('cancelled').value!;
			expect(status.isScheduled()).toBe(false);
			expect(status.isOngoing()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(true);
			expect(status.isPostponed()).toBe(false);
		});

		it('should correctly identify postponed status', () => {
			const status = EventStatus.create('postponed').value!;
			expect(status.isScheduled()).toBe(false);
			expect(status.isOngoing()).toBe(false);
			expect(status.isCompleted()).toBe(false);
			expect(status.isCancelled()).toBe(false);
			expect(status.isPostponed()).toBe(true);
		});
	});

	describe('isTerminal()', () => {
		it('should return true for completed status', () => {
			const status = EventStatus.create('completed').value!;
			expect(status.isTerminal()).toBe(true);
		});

		it('should return true for cancelled status', () => {
			const status = EventStatus.create('cancelled').value!;
			expect(status.isTerminal()).toBe(true);
		});

		it('should return false for scheduled status', () => {
			const status = EventStatus.create('scheduled').value!;
			expect(status.isTerminal()).toBe(false);
		});

		it('should return false for ongoing status', () => {
			const status = EventStatus.create('ongoing').value!;
			expect(status.isTerminal()).toBe(false);
		});

		it('should return false for postponed status', () => {
			const status = EventStatus.create('postponed').value!;
			expect(status.isTerminal()).toBe(false);
		});
	});

	describe('canTransitionTo()', () => {
		describe('from scheduled', () => {
			const status = EventStatus.create('scheduled').value!;

			it('should allow transition to ongoing', () => {
				expect(status.canTransitionTo('ongoing')).toBe(true);
			});

			it('should allow transition to cancelled', () => {
				expect(status.canTransitionTo('cancelled')).toBe(true);
			});

			it('should allow transition to postponed', () => {
				expect(status.canTransitionTo('postponed')).toBe(true);
			});

			it('should disallow transition to completed', () => {
				expect(status.canTransitionTo('completed')).toBe(false);
			});

			it('should allow transition to same status (idempotent)', () => {
				expect(status.canTransitionTo('scheduled')).toBe(true);
			});
		});

		describe('from ongoing', () => {
			const status = EventStatus.create('ongoing').value!;

			it('should allow transition to completed', () => {
				expect(status.canTransitionTo('completed')).toBe(true);
			});

			it('should allow transition to cancelled', () => {
				expect(status.canTransitionTo('cancelled')).toBe(true);
			});

			it('should disallow transition to scheduled', () => {
				expect(status.canTransitionTo('scheduled')).toBe(false);
			});

			it('should disallow transition to postponed', () => {
				expect(status.canTransitionTo('postponed')).toBe(false);
			});

			it('should allow transition to same status (idempotent)', () => {
				expect(status.canTransitionTo('ongoing')).toBe(true);
			});
		});

		describe('from completed (terminal)', () => {
			const status = EventStatus.create('completed').value!;

			it('should disallow transition to scheduled', () => {
				expect(status.canTransitionTo('scheduled')).toBe(false);
			});

			it('should disallow transition to ongoing', () => {
				expect(status.canTransitionTo('ongoing')).toBe(false);
			});

			it('should disallow transition to cancelled', () => {
				expect(status.canTransitionTo('cancelled')).toBe(false);
			});

			it('should disallow transition to postponed', () => {
				expect(status.canTransitionTo('postponed')).toBe(false);
			});

			it('should allow transition to same status (idempotent)', () => {
				expect(status.canTransitionTo('completed')).toBe(true);
			});
		});

		describe('from cancelled (terminal)', () => {
			const status = EventStatus.create('cancelled').value!;

			it('should disallow transition to scheduled', () => {
				expect(status.canTransitionTo('scheduled')).toBe(false);
			});

			it('should disallow transition to ongoing', () => {
				expect(status.canTransitionTo('ongoing')).toBe(false);
			});

			it('should disallow transition to completed', () => {
				expect(status.canTransitionTo('completed')).toBe(false);
			});

			it('should disallow transition to postponed', () => {
				expect(status.canTransitionTo('postponed')).toBe(false);
			});

			it('should allow transition to same status (idempotent)', () => {
				expect(status.canTransitionTo('cancelled')).toBe(true);
			});
		});

		describe('from postponed', () => {
			const status = EventStatus.create('postponed').value!;

			it('should allow transition to scheduled', () => {
				expect(status.canTransitionTo('scheduled')).toBe(true);
			});

			it('should allow transition to cancelled', () => {
				expect(status.canTransitionTo('cancelled')).toBe(true);
			});

			it('should disallow transition to ongoing', () => {
				expect(status.canTransitionTo('ongoing')).toBe(false);
			});

			it('should disallow transition to completed', () => {
				expect(status.canTransitionTo('completed')).toBe(false);
			});

			it('should allow transition to same status (idempotent)', () => {
				expect(status.canTransitionTo('postponed')).toBe(true);
			});
		});
	});

	describe('toString()', () => {
		it('should return the status value as string', () => {
			const status = EventStatus.create('scheduled').value!;
			expect(status.toString()).toBe('scheduled');
		});
	});
});
