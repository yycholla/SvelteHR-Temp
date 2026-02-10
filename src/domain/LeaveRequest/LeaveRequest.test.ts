import { describe, it, expect } from 'vitest';
import { LeaveRequest } from './LeaveRequest';
import { LeaveStatus } from './LeaveStatus';
import { LeaveType } from './LeaveType';

describe('LeaveRequest', () => {
	// Helper: Create valid test data
	const createValidData = () => {
		const start = new Date();
		start.setDate(start.getDate() + 10);
		const end = new Date(start);
		end.setDate(end.getDate() + 4);

		return {
			employeeId: 'emp-123',
			leaveType: 'vacation',
			startDate: start.toISOString().split('T')[0],
			endDate: end.toISOString().split('T')[0],
			reason: 'Family vacation'
		};
	};

	describe('create', () => {
		it('should create valid leave request', () => {
			const data = createValidData();
			const result = LeaveRequest.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value?.employeeId).toBe('emp-123');
			expect(result.value?.status).toEqual(LeaveStatus.PENDING);
			expect(result.value?.managerId).toBeNull();
			expect(result.value?.managerComments).toBeNull();
		});

		it('should generate unique ID', () => {
			const data = createValidData();
			const request1 = LeaveRequest.create(data).value!;
			const request2 = LeaveRequest.create(data).value!;

			expect(request1.id).not.toBe(request2.id);
		});

		it('should set timestamps', () => {
			const data = createValidData();
			const result = LeaveRequest.create(data);

			expect(result.value?.createdAt).toBeInstanceOf(Date);
			expect(result.value?.updatedAt).toBeInstanceOf(Date);
		});

		it('should require reason for > 5 days', () => {
			const start = new Date();
			start.setDate(start.getDate() + 10);
			const end = new Date(start);
			end.setDate(end.getDate() + 10); // 11 days total

			const result = LeaveRequest.create({
				employeeId: 'emp-123',
				leaveType: 'vacation',
				startDate: start.toISOString().split('T')[0],
				endDate: end.toISOString().split('T')[0],
				reason: '' // Empty!
			});

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('REASON_REQUIRED');
		});

		it('should allow empty reason for <= 5 days', () => {
			const data = createValidData();
			const result = LeaveRequest.create({
				...data,
				reason: ''
			});

			expect(result.isOk).toBe(true);
		});

		it('should reject invalid leave type', () => {
			const data = createValidData();
			const result = LeaveRequest.create({
				...data,
				leaveType: 'invalid-type'
			});

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_LEAVE_TYPE');
		});

		it('should reject invalid date range', () => {
			const result = LeaveRequest.create({
				employeeId: 'emp-123',
				leaveType: 'vacation',
				startDate: '2026-03-10',
				endDate: '2026-03-05', // End before start
				reason: 'test'
			});

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_DATE_RANGE');
		});
	});

	describe('approve', () => {
		it('should approve pending request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			const result = request.approve('mgr-456', 'Approved - enjoy your vacation');

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.APPROVED);
			expect(result.value?.managerId).toBe('mgr-456');
			expect(result.value?.managerComments).toBe('Approved - enjoy your vacation');
		});

		it('should allow approval without comments', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			const result = request.approve('mgr-456');

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.APPROVED);
			expect(result.value?.managerComments).toBeNull();
		});

		it('should update timestamp on approval', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const originalTime = request.updatedAt.getTime();

			// Small delay to ensure timestamp changes
			const result = request.approve('mgr-456');

			expect(result.value?.updatedAt.getTime()).toBeGreaterThanOrEqual(originalTime);
		});

		it('should not approve already approved request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const approved = request.approve('mgr-456').value!;

			const result = approved.approve('mgr-789');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});

		it('should not approve rejected request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const rejected = request.reject('mgr-456', 'Not approved').value!;

			const result = rejected.approve('mgr-789');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});

		it('should not approve cancelled request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const cancelled = request.cancel().value!;

			const result = cancelled.approve('mgr-456');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});

		it('should return immutable new instance', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const approved = request.approve('mgr-456').value!;

			expect(request.status).toEqual(LeaveStatus.PENDING);
			expect(approved.status).toEqual(LeaveStatus.APPROVED);
			expect(request.id).toBe(approved.id); // Same ID
		});
	});

	describe('reject', () => {
		it('should reject pending request with comments', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			const result = request.reject('mgr-456', 'Insufficient coverage during this period');

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.REJECTED);
			expect(result.value?.managerId).toBe('mgr-456');
			expect(result.value?.managerComments).toBe('Insufficient coverage during this period');
		});

		it('should require comments for rejection', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			const result = request.reject('mgr-456', '');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('REJECTION_COMMENTS_REQUIRED');
		});

		it('should require non-whitespace comments', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			const result = request.reject('mgr-456', '   ');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('REJECTION_COMMENTS_REQUIRED');
		});

		it('should not reject already approved request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const approved = request.approve('mgr-456').value!;

			const result = approved.reject('mgr-789', 'Changed my mind');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});

		it('should not reject already rejected request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const rejected = request.reject('mgr-456', 'No').value!;

			const result = rejected.reject('mgr-789', 'Still no');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});
	});

	describe('cancel', () => {
		it('should cancel pending request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			const result = request.cancel();

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.CANCELLED);
		});

		it('should cancel approved request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const approved = request.approve('mgr-456').value!;

			const result = approved.cancel();

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.CANCELLED);
		});

		it('should not cancel rejected request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const rejected = request.reject('mgr-456', 'No').value!;

			const result = rejected.cancel();

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});

		it('should not cancel already cancelled request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const cancelled = request.cancel().value!;

			const result = cancelled.cancel();

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});

		it('should preserve manager info when cancelling approved request', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const approved = request.approve('mgr-456', 'Approved').value!;
			const cancelled = approved.cancel().value!;

			expect(cancelled.managerId).toBe('mgr-456');
			expect(cancelled.managerComments).toBe('Approved');
		});
	});

	describe('overlapsWith', () => {
		it('should detect overlapping leave requests', () => {
			const data1 = createValidData();
			const data2 = {
				...createValidData(),
				employeeId: 'emp-123' // Same employee
			};

			const request1 = LeaveRequest.create(data1).value!;
			const request2 = LeaveRequest.create(data2).value!;

			// Both pending - should overlap
			expect(request1.overlapsWith(request2)).toBe(true);
		});

		it('should not consider rejected requests as overlaps', () => {
			const data1 = createValidData();
			const data2 = createValidData();

			const request1 = LeaveRequest.create(data1).value!;
			const request2 = LeaveRequest.create(data2).value!;
			const rejected = request2.reject('mgr-456', 'No').value!;

			expect(request1.overlapsWith(rejected)).toBe(false);
		});

		it('should not consider cancelled requests as overlaps', () => {
			const data1 = createValidData();
			const data2 = createValidData();

			const request1 = LeaveRequest.create(data1).value!;
			const request2 = LeaveRequest.create(data2).value!;
			const cancelled = request2.cancel().value!;

			expect(request1.overlapsWith(cancelled)).toBe(false);
		});
	});

	describe('helper methods', () => {
		it('should identify if request is for employee', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			expect(request.isForEmployee('emp-123')).toBe(true);
			expect(request.isForEmployee('emp-999')).toBe(false);
		});

		it('should identify pending status', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			expect(request.isPending()).toBe(true);
			expect(request.isApproved()).toBe(false);
			expect(request.isRejected()).toBe(false);
			expect(request.isCancelled()).toBe(false);
		});

		it('should identify approved status', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const approved = request.approve('mgr-456').value!;

			expect(approved.isPending()).toBe(false);
			expect(approved.isApproved()).toBe(true);
			expect(approved.isRejected()).toBe(false);
			expect(approved.isCancelled()).toBe(false);
		});

		it('should get business days', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;

			expect(request.getBusinessDays()).toBeGreaterThan(0);
			expect(request.getBusinessDays()).toBe(request.dateRange.businessDays);
		});
	});

	describe('toDTO', () => {
		it('should serialize to plain object', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const dto = request.toDTO();

			expect(dto.id).toBe(request.id);
			expect(dto.employeeId).toBe('emp-123');
			expect(dto.leaveType).toBe('Vacation');
			expect(dto.status).toBe('pending');
			expect(dto.managerId).toBeNull();
			expect(dto.managerComments).toBeNull();
			expect(typeof dto.startDate).toBe('string');
			expect(typeof dto.endDate).toBe('string');
			expect(typeof dto.createdAt).toBe('string');
			expect(typeof dto.updatedAt).toBe('string');
		});

		it('should serialize approved request with manager info', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const approved = request.approve('mgr-456', 'Approved').value!;
			const dto = approved.toDTO();

			expect(dto.status).toBe('approved');
			expect(dto.managerId).toBe('mgr-456');
			expect(dto.managerComments).toBe('Approved');
		});
	});

	describe('toString', () => {
		it('should provide readable string representation', () => {
			const data = createValidData();
			const request = LeaveRequest.create(data).value!;
			const str = request.toString();

			expect(str).toContain('LeaveRequest');
			expect(str).toContain(request.id);
			expect(str).toContain('emp-123');
			expect(str).toContain('pending');
		});
	});
});
