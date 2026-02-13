import { describe, it, expect } from 'vitest';
import { NotificationType } from './NotificationType';
import { NotificationTypeValidationError } from '../errors/NotificationErrors';

describe('NotificationType', () => {
	describe('create()', () => {
		describe('valid types', () => {
			it('should create Info type', () => {
				const result = NotificationType.create('info');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('info');
			});

			it('should create Warning type', () => {
				const result = NotificationType.create('warning');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('warning');
			});

			it('should create Success type', () => {
				const result = NotificationType.create('success');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('success');
			});

			it('should create Error type', () => {
				const result = NotificationType.create('error');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('error');
			});

			it('should create TaskAssigned type', () => {
				const result = NotificationType.create('task_assigned');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task_assigned');
			});

			it('should create TaskCompleted type', () => {
				const result = NotificationType.create('task_completed');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task_completed');
			});

			it('should create LeaveApproved type', () => {
				const result = NotificationType.create('leave_approved');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('leave_approved');
			});

			it('should create LeaveRejected type', () => {
				const result = NotificationType.create('leave_rejected');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('leave_rejected');
			});

			it('should create ReviewScheduled type', () => {
				const result = NotificationType.create('review_scheduled');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('review_scheduled');
			});

			it('should create EventReminder type', () => {
				const result = NotificationType.create('event_reminder');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('event_reminder');
			});
		});

		describe('normalization', () => {
			it('should normalize uppercase to lowercase', () => {
				const result = NotificationType.create('INFO');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('info');
			});

			it('should normalize mixed case to lowercase', () => {
				const result = NotificationType.create('Task_Assigned');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('task_assigned');
			});

			it('should trim whitespace', () => {
				const result = NotificationType.create('  warning  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('warning');
			});
		});

		describe('validation', () => {
			it('should reject empty string', () => {
				const result = NotificationType.create('');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
				expect(result.error.message).toContain('Invalid notification type');
			});

			it('should reject invalid type', () => {
				const result = NotificationType.create('invalid_type');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
			});

			it('should reject whitespace-only string', () => {
				const result = NotificationType.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error).toBeInstanceOf(NotificationTypeValidationError);
			});
		});
	});

	describe('equals()', () => {
		it('should return true for same type', () => {
			const type1 = NotificationType.create('info').value;
			const type2 = NotificationType.create('info').value;
			expect(type1.equals(type2)).toBe(true);
		});

		it('should return false for different types', () => {
			const type1 = NotificationType.create('info').value;
			const type2 = NotificationType.create('warning').value;
			expect(type1.equals(type2)).toBe(false);
		});
	});

	describe('isSystemType()', () => {
		it('should return true for system types', () => {
			const info = NotificationType.create('info').value;
			const warning = NotificationType.create('warning').value;
			const success = NotificationType.create('success').value;
			const error = NotificationType.create('error').value;

			expect(info.isSystemType()).toBe(true);
			expect(warning.isSystemType()).toBe(true);
			expect(success.isSystemType()).toBe(true);
			expect(error.isSystemType()).toBe(true);
		});

		it('should return false for non-system types', () => {
			const taskAssigned = NotificationType.create('task_assigned').value;
			const leaveApproved = NotificationType.create('leave_approved').value;

			expect(taskAssigned.isSystemType()).toBe(false);
			expect(leaveApproved.isSystemType()).toBe(false);
		});
	});
});
