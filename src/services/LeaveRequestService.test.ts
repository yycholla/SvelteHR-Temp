// src/services/LeaveRequestService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LeaveRequestService } from './LeaveRequestService';
import type { LeaveRequestRepository } from './ports/LeaveRequestRepository';
import {
	LeaveRequest,
	type CreateLeaveRequestData,
	type LeaveRequestListResult,
	type LeaveBalance,
	type LeaveStatistics,
	LeaveStatus
} from '$domain';

describe('LeaveRequestService', () => {
	let service: LeaveRequestService;
	let mockRepository: LeaveRequestRepository;

	// Helper: Create a mock leave request entity
	const createMockLeaveRequest = (overrides?: Partial<CreateLeaveRequestData>) => {
		const start = new Date();
		start.setDate(start.getDate() + 10);
		const end = new Date(start);
		end.setDate(end.getDate() + 4);

		const data: CreateLeaveRequestData = {
			employeeId: 'emp-123',
			leaveType: 'vacation',
			startDate: start.toISOString().split('T')[0],
			endDate: end.toISOString().split('T')[0],
			reason: 'Family vacation',
			...overrides
		};

		return LeaveRequest.create(data).value!;
	};

	// Mock repository implementation
	beforeEach(() => {
		mockRepository = {
			findById: vi.fn(),
			findAll: vi.fn(),
			findByEmployee: vi.fn(),
			findByManager: vi.fn(),
			findOverlapping: vi.fn(),
			save: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			exists: vi.fn(),
			getLeaveBalance: vi.fn(),
			getStatistics: vi.fn(),
			countByStatus: vi.fn(),
			getTotalDaysByEmployee: vi.fn()
		};

		service = new LeaveRequestService(mockRepository);
	});

	describe('getLeaveRequestById', () => {
		it('should return leave request when found', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);

			const result = await service.getLeaveRequestById('req-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockLeaveRequest);
			expect(mockRepository.findById).toHaveBeenCalledWith('req-123');
		});

		it('should return error when not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(null);

			const result = await service.getLeaveRequestById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_NOT_FOUND');
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('Database error'));

			const result = await service.getLeaveRequestById('req-123');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_FETCH_FAILED');
		});
	});

	describe('getLeaveRequests', () => {
		it('should return paginated leave requests', async () => {
			const mockResult: LeaveRequestListResult = {
				items: [],
				pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
			};
			vi.mocked(mockRepository.findAll).mockResolvedValue(mockResult);

			const result = await service.getLeaveRequests({ page: 1, limit: 20 });

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockResult);
			expect(mockRepository.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('Database error'));

			const result = await service.getLeaveRequests();

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUESTS_FETCH_FAILED');
		});
	});

	describe('getLeaveRequestsByEmployee', () => {
		it('should return leave requests for employee', async () => {
			const mockRequests = [createMockLeaveRequest()];
			vi.mocked(mockRepository.findByEmployee).mockResolvedValue(mockRequests);

			const result = await service.getLeaveRequestsByEmployee('emp-123');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockRequests);
			expect(mockRepository.findByEmployee).toHaveBeenCalledWith('emp-123');
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findByEmployee).mockRejectedValue(new Error('Database error'));

			const result = await service.getLeaveRequestsByEmployee('emp-123');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('EMPLOYEE_LEAVE_REQUESTS_FETCH_FAILED');
		});
	});

	describe('getLeaveRequestsByManager', () => {
		it('should return leave requests for manager', async () => {
			const mockRequests = [createMockLeaveRequest()];
			vi.mocked(mockRepository.findByManager).mockResolvedValue(mockRequests);

			const result = await service.getLeaveRequestsByManager('mgr-456');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockRequests);
			expect(mockRepository.findByManager).toHaveBeenCalledWith('mgr-456');
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findByManager).mockRejectedValue(new Error('Database error'));

			const result = await service.getLeaveRequestsByManager('mgr-456');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('MANAGER_LEAVE_REQUESTS_FETCH_FAILED');
		});
	});

	describe('createLeaveRequest', () => {
		const validData: CreateLeaveRequestData = {
			employeeId: 'emp-123',
			leaveType: 'vacation',
			startDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
			endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
			reason: 'Family vacation'
		};

		it('should create leave request when valid', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findOverlapping).mockResolvedValue([]);
			vi.mocked(mockRepository.save).mockResolvedValue(mockLeaveRequest);

			const result = await service.createLeaveRequest(validData);

			expect(result.isOk).toBe(true);
			expect(mockRepository.findOverlapping).toHaveBeenCalled();
			expect(mockRepository.save).toHaveBeenCalled();
		});

		it('should reject if domain validation fails', async () => {
			const invalidData: CreateLeaveRequestData = {
				...validData,
				leaveType: 'invalid-type'
			};

			const result = await service.createLeaveRequest(invalidData);

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_LEAVE_TYPE');
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should reject if overlapping requests exist', async () => {
			const existingRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findOverlapping).mockResolvedValue([existingRequest]);

			const result = await service.createLeaveRequest(validData);

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_OVERLAP');
			expect(mockRepository.save).not.toHaveBeenCalled();
		});

		it('should handle repository save errors', async () => {
			vi.mocked(mockRepository.findOverlapping).mockResolvedValue([]);
			vi.mocked(mockRepository.save).mockRejectedValue(new Error('Database error'));

			const result = await service.createLeaveRequest(validData);

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_CREATE_FAILED');
		});
	});

	describe('approveLeaveRequest', () => {
		it('should approve pending leave request', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			const approvedRequest = mockLeaveRequest.approve('mgr-456', 'Approved').value!;

			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);
			vi.mocked(mockRepository.update).mockResolvedValue(approvedRequest);

			const result = await service.approveLeaveRequest('req-123', 'mgr-456', 'Approved');

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.APPROVED);
			expect(mockRepository.update).toHaveBeenCalled();
		});

		it('should return error if leave request not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(null);

			const result = await service.approveLeaveRequest('nonexistent', 'mgr-456');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_NOT_FOUND');
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should return error if invalid status transition', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			const rejectedRequest = mockLeaveRequest.reject('mgr-456', 'No').value!;

			vi.mocked(mockRepository.findById).mockResolvedValue(rejectedRequest);

			const result = await service.approveLeaveRequest('req-123', 'mgr-456');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should handle repository update errors', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);
			vi.mocked(mockRepository.update).mockRejectedValue(new Error('Database error'));

			const result = await service.approveLeaveRequest('req-123', 'mgr-456');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_APPROVE_FAILED');
		});
	});

	describe('rejectLeaveRequest', () => {
		it('should reject pending leave request with comments', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			const rejectedRequest = mockLeaveRequest.reject('mgr-456', 'Insufficient coverage').value!;

			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);
			vi.mocked(mockRepository.update).mockResolvedValue(rejectedRequest);

			const result = await service.rejectLeaveRequest(
				'req-123',
				'mgr-456',
				'Insufficient coverage'
			);

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.REJECTED);
			expect(mockRepository.update).toHaveBeenCalled();
		});

		it('should return error if comments are missing', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);

			const result = await service.rejectLeaveRequest('req-123', 'mgr-456', '');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('REJECTION_COMMENTS_REQUIRED');
			expect(mockRepository.update).not.toHaveBeenCalled();
		});

		it('should return error if leave request not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(null);

			const result = await service.rejectLeaveRequest('nonexistent', 'mgr-456', 'No');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_NOT_FOUND');
		});

		it('should handle repository update errors', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);
			vi.mocked(mockRepository.update).mockRejectedValue(new Error('Database error'));

			const result = await service.rejectLeaveRequest('req-123', 'mgr-456', 'No');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_REJECT_FAILED');
		});
	});

	describe('cancelLeaveRequest', () => {
		it('should cancel pending leave request', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			const cancelledRequest = mockLeaveRequest.cancel().value!;

			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);
			vi.mocked(mockRepository.update).mockResolvedValue(cancelledRequest);

			const result = await service.cancelLeaveRequest('req-123', 'emp-123');

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.CANCELLED);
			expect(mockRepository.update).toHaveBeenCalled();
		});

		it('should cancel approved leave request', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			const approvedRequest = mockLeaveRequest.approve('mgr-456').value!;
			const cancelledRequest = approvedRequest.cancel().value!;

			vi.mocked(mockRepository.findById).mockResolvedValue(approvedRequest);
			vi.mocked(mockRepository.update).mockResolvedValue(cancelledRequest);

			const result = await service.cancelLeaveRequest('req-123', 'emp-123');

			expect(result.isOk).toBe(true);
			expect(result.value?.status).toEqual(LeaveStatus.CANCELLED);
		});

		it('should return error if leave request not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(null);

			const result = await service.cancelLeaveRequest('nonexistent', 'emp-123');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_NOT_FOUND');
		});

		it('should return error if invalid status transition', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			const rejectedRequest = mockLeaveRequest.reject('mgr-456', 'No').value!;

			vi.mocked(mockRepository.findById).mockResolvedValue(rejectedRequest);

			const result = await service.cancelLeaveRequest('req-123', 'emp-123');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('INVALID_STATUS_TRANSITION');
		});
	});

	describe('deleteLeaveRequest', () => {
		it('should delete pending leave request', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);
			vi.mocked(mockRepository.delete).mockResolvedValue();

			const result = await service.deleteLeaveRequest('req-123');

			expect(result.isOk).toBe(true);
			expect(mockRepository.delete).toHaveBeenCalledWith('req-123');
		});

		it('should not delete non-pending leave request', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			const approvedRequest = mockLeaveRequest.approve('mgr-456').value!;

			vi.mocked(mockRepository.findById).mockResolvedValue(approvedRequest);

			const result = await service.deleteLeaveRequest('req-123');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_DELETE_NOT_ALLOWED');
			expect(mockRepository.delete).not.toHaveBeenCalled();
		});

		it('should return error if leave request not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(null);

			const result = await service.deleteLeaveRequest('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_NOT_FOUND');
		});

		it('should handle repository delete errors', async () => {
			const mockLeaveRequest = createMockLeaveRequest();
			vi.mocked(mockRepository.findById).mockResolvedValue(mockLeaveRequest);
			vi.mocked(mockRepository.delete).mockRejectedValue(new Error('Database error'));

			const result = await service.deleteLeaveRequest('req-123');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_REQUEST_DELETE_FAILED');
		});
	});

	describe('getLeaveBalance', () => {
		it('should return leave balance for employee', async () => {
			const mockBalance: LeaveBalance = {
				employeeId: 'emp-123',
				year: 2026,
				total: 20,
				used: 5,
				pending: 3,
				remaining: 12
			};
			vi.mocked(mockRepository.getLeaveBalance).mockResolvedValue(mockBalance);

			const result = await service.getLeaveBalance('emp-123', 2026);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockBalance);
			expect(mockRepository.getLeaveBalance).toHaveBeenCalledWith('emp-123', 2026);
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.getLeaveBalance).mockRejectedValue(new Error('Database error'));

			const result = await service.getLeaveBalance('emp-123');

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_BALANCE_FETCH_FAILED');
		});
	});

	describe('getStatistics', () => {
		it('should return aggregated statistics', async () => {
			const mockStats: LeaveStatistics = {
				total: 100,
				pending: 20,
				approved: 60,
				rejected: 10,
				cancelled: 10,
				totalDays: 450,
				approvalRate: 0.75,
				averageDuration: 4.5
			};
			vi.mocked(mockRepository.getStatistics).mockResolvedValue(mockStats);

			const result = await service.getStatistics({ employeeId: 'emp-123' });

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockStats);
			expect(mockRepository.getStatistics).toHaveBeenCalledWith({ employeeId: 'emp-123' });
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.getStatistics).mockRejectedValue(new Error('Database error'));

			const result = await service.getStatistics();

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('LEAVE_STATISTICS_FETCH_FAILED');
		});
	});

	describe('checkOverlappingLeaveRequests', () => {
		it('should return overlapping leave requests', async () => {
			const mockRequests = [createMockLeaveRequest()];
			vi.mocked(mockRepository.findOverlapping).mockResolvedValue(mockRequests);

			const result = await service.checkOverlappingLeaveRequests(
				'emp-123',
				'2026-03-10',
				'2026-03-15'
			);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockRequests);
			expect(mockRepository.findOverlapping).toHaveBeenCalledWith(
				'emp-123',
				'2026-03-10',
				'2026-03-15',
				undefined
			);
		});

		it('should exclude specific leave request when provided', async () => {
			const mockRequests: LeaveRequest[] = [];
			vi.mocked(mockRepository.findOverlapping).mockResolvedValue(mockRequests);

			const result = await service.checkOverlappingLeaveRequests(
				'emp-123',
				'2026-03-10',
				'2026-03-15',
				'req-123'
			);

			expect(result.isOk).toBe(true);
			expect(mockRepository.findOverlapping).toHaveBeenCalledWith(
				'emp-123',
				'2026-03-10',
				'2026-03-15',
				'req-123'
			);
		});

		it('should handle repository errors', async () => {
			vi.mocked(mockRepository.findOverlapping).mockRejectedValue(new Error('Database error'));

			const result = await service.checkOverlappingLeaveRequests(
				'emp-123',
				'2026-03-10',
				'2026-03-15'
			);

			expect(result.isError).toBe(true);
			expect(result.error?.code).toBe('OVERLAP_CHECK_FAILED');
		});
	});
});
