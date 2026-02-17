import { describe, it, expect } from 'vitest';
import { ReportStatus } from './ReportStatus';

describe('ReportStatus', () => {
	describe('create()', () => {
		describe('valid statuses', () => {
			it('should create a draft status', () => {
				const result = ReportStatus.create('draft');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('draft');
			});

			it('should create an active status', () => {
				const result = ReportStatus.create('active');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('active');
			});

			it('should create a scheduled status', () => {
				const result = ReportStatus.create('scheduled');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('scheduled');
			});

			it('should create a completed status', () => {
				const result = ReportStatus.create('completed');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('completed');
			});

			it('should create a failed status', () => {
				const result = ReportStatus.create('failed');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('failed');
			});

			it('should trim whitespace before validation', () => {
				const result = ReportStatus.create('  draft  ');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('draft');
			});

			it('should accept uppercase and normalize to lowercase', () => {
				const result = ReportStatus.create('ACTIVE');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('active');
			});

			it('should accept mixed case', () => {
				const result = ReportStatus.create('Completed');
				expect(result.isOk).toBe(true);
				expect(result.value.value).toBe('completed');
			});
		});

		describe('invalid statuses', () => {
			it('should reject empty string', () => {
				const result = ReportStatus.create('');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should reject whitespace-only string', () => {
				const result = ReportStatus.create('   ');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should reject unknown status', () => {
				const result = ReportStatus.create('pending');
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('pending');
			});

			it('should reject invalid status "cancelled"', () => {
				const result = ReportStatus.create('cancelled');
				expect(result.isError).toBe(true);
				expect(result.error.code).toBe('INVALID_REPORT');
			});

			it('should include valid options in error message', () => {
				const result = ReportStatus.create('invalid_status');
				expect(result.isError).toBe(true);
				expect(result.error.message).toContain('draft');
				expect(result.error.message).toContain('active');
			});
		});
	});

	describe('isCompleted()', () => {
		it('should return true for completed status', () => {
			const status = ReportStatus.create('completed').value;
			expect(status.isCompleted()).toBe(true);
		});

		it('should return false for non-completed statuses', () => {
			expect(ReportStatus.create('draft').value.isCompleted()).toBe(false);
			expect(ReportStatus.create('active').value.isCompleted()).toBe(false);
			expect(ReportStatus.create('scheduled').value.isCompleted()).toBe(false);
			expect(ReportStatus.create('failed').value.isCompleted()).toBe(false);
		});
	});

	describe('isFailed()', () => {
		it('should return true for failed status', () => {
			const status = ReportStatus.create('failed').value;
			expect(status.isFailed()).toBe(true);
		});

		it('should return false for non-failed statuses', () => {
			expect(ReportStatus.create('draft').value.isFailed()).toBe(false);
			expect(ReportStatus.create('active').value.isFailed()).toBe(false);
			expect(ReportStatus.create('scheduled').value.isFailed()).toBe(false);
			expect(ReportStatus.create('completed').value.isFailed()).toBe(false);
		});
	});

	describe('isScheduled()', () => {
		it('should return true for scheduled status', () => {
			const status = ReportStatus.create('scheduled').value;
			expect(status.isScheduled()).toBe(true);
		});

		it('should return false for non-scheduled statuses', () => {
			expect(ReportStatus.create('draft').value.isScheduled()).toBe(false);
			expect(ReportStatus.create('active').value.isScheduled()).toBe(false);
			expect(ReportStatus.create('completed').value.isScheduled()).toBe(false);
			expect(ReportStatus.create('failed').value.isScheduled()).toBe(false);
		});
	});

	describe('equals()', () => {
		it('should return true for same status', () => {
			const status1 = ReportStatus.create('draft').value;
			const status2 = ReportStatus.create('draft').value;
			expect(status1.equals(status2)).toBe(true);
		});

		it('should return false for different statuses', () => {
			const status1 = ReportStatus.create('draft').value;
			const status2 = ReportStatus.create('active').value;
			expect(status1.equals(status2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should return the status value as string', () => {
			const status = ReportStatus.create('draft').value;
			expect(status.toString()).toBe('draft');
		});

		it('should match the value getter', () => {
			const status = ReportStatus.create('completed').value;
			expect(status.toString()).toBe(status.value);
		});
	});
});
