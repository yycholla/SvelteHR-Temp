// src/services/LeaveRequestService.ts
import {
	type CreateLeaveRequestData,
	DomainError,
	type LeaveRequest,
	LeaveRequest as LeaveRequestEntity,
	type LeaveRequestFilters,
	type LeaveRequestListResult,
	LeaveRequestNotFoundError,
	type LeaveBalance,
	type LeaveStatistics,
	type LeaveStatisticsFilters,
	Result,
	OverlappingLeaveRequestError,
	UnauthorizedApprovalError,
	UnauthorizedCancellationError
} from '$domain';
import type { LeaveRequestRepository } from '$services';

/**
 * Application service for managing leave requests.
 * Orchestrates domain logic, repository operations, and cross-entity validation.
 *
 * Key responsibilities:
 * - Enforce business rules (overlap detection, balance checks)
 * - Coordinate approval/rejection workflows
 * - Manager authorization checks
 * - Statistics and reporting
 */
export class LeaveRequestService {
	constructor(private readonly leaveRequestRepository: LeaveRequestRepository) {}

	/**
	 * Get a leave request by ID
	 * @param id - The leave request ID
	 * @returns Result containing the leave request or an error
	 */
	async getLeaveRequestById(id: string): Promise<Result<LeaveRequest, DomainError>> {
		try {
			const leaveRequest = await this.leaveRequestRepository.findById(id);

			if (!leaveRequest) {
				return Result.error(new LeaveRequestNotFoundError(id));
			}

			return Result.ok(leaveRequest);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch leave request', 'LEAVE_REQUEST_FETCH_FAILED', {
					leaveRequestId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all leave requests with optional filters
	 * @param filters - Optional filters for querying leave requests
	 * @returns Result containing paginated leave requests or an error
	 */
	async getLeaveRequests(
		filters?: LeaveRequestFilters
	): Promise<Result<LeaveRequestListResult, DomainError>> {
		try {
			const result = await this.leaveRequestRepository.findAll(filters);
			return Result.ok(result);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch leave requests', 'LEAVE_REQUESTS_FETCH_FAILED', {
					filters,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get all leave requests for a specific employee
	 * @param employeeId - Employee ID
	 * @returns Result containing array of leave requests or an error
	 */
	async getLeaveRequestsByEmployee(
		employeeId: string
	): Promise<Result<LeaveRequest[], DomainError>> {
		try {
			const leaveRequests = await this.leaveRequestRepository.findByEmployee(employeeId);
			return Result.ok(leaveRequests);
		} catch (error) {
			return Result.error(
				new DomainError(
					'Failed to fetch employee leave requests',
					'EMPLOYEE_LEAVE_REQUESTS_FETCH_FAILED',
					{
						employeeId,
						originalError: error
					}
				)
			);
		}
	}

	/**
	 * Get all leave requests managed by a specific manager
	 * @param managerId - Manager ID
	 * @returns Result containing array of leave requests or an error
	 */
	async getLeaveRequestsByManager(managerId: string): Promise<Result<LeaveRequest[], DomainError>> {
		try {
			const leaveRequests = await this.leaveRequestRepository.findByManager(managerId);
			return Result.ok(leaveRequests);
		} catch (error) {
			return Result.error(
				new DomainError(
					'Failed to fetch manager leave requests',
					'MANAGER_LEAVE_REQUESTS_FETCH_FAILED',
					{
						managerId,
						originalError: error
					}
				)
			);
		}
	}

	/**
	 * Create a new leave request
	 * Business logic:
	 * - Validates domain rules (dates, reason, duration)
	 * - Checks for overlapping leave requests
	 * - Saves to repository
	 *
	 * @param data - The leave request data
	 * @returns Result containing the created leave request or an error
	 */
	async createLeaveRequest(
		data: CreateLeaveRequestData
	): Promise<Result<LeaveRequest, DomainError>> {
		try {
			// Create domain entity (validates business rules)
			const leaveRequestResult = LeaveRequestEntity.create(data);
			if (leaveRequestResult.isError) {
				return Result.error(leaveRequestResult.error);
			}

			const leaveRequest = leaveRequestResult.value;

			// Business Rule: Check for overlapping leave requests
			const overlappingRequests = await this.leaveRequestRepository.findOverlapping(
				data.employeeId,
				data.startDate,
				data.endDate
			);

			if (overlappingRequests.length > 0) {
				return Result.error(
					new OverlappingLeaveRequestError(
						data.startDate,
						data.endDate,
						overlappingRequests.map((r) => r.id)
					)
				);
			}

			// Persist via repository
			const savedLeaveRequest = await this.leaveRequestRepository.save(leaveRequest);
			return Result.ok(savedLeaveRequest);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to create leave request', 'LEAVE_REQUEST_CREATE_FAILED', {
					data,
					originalError: error
				})
			);
		}
	}

	/**
	 * Approve a leave request
	 * Business logic:
	 * - Validates manager authorization (TODO: implement with employee/department data)
	 * - Uses domain method to approve
	 * - Saves updated entity
	 *
	 * @param id - Leave request ID
	 * @param managerId - Manager ID performing the approval
	 * @param comments - Optional approval comments
	 * @returns Result containing the approved leave request or an error
	 */
	async approveLeaveRequest(
		id: string,
		managerId: string,
		comments?: string
	): Promise<Result<LeaveRequest, DomainError>> {
		try {
			// Fetch existing leave request
			const leaveRequest = await this.leaveRequestRepository.findById(id);
			if (!leaveRequest) {
				return Result.error(new LeaveRequestNotFoundError(id));
			}

			// TODO: Add manager authorization check
			// For now, we trust the caller has verified authorization
			// Future: Check if managerId is the employee's manager or has permission

			// Use domain method to approve
			const approvedResult = leaveRequest.approve(managerId, comments);
			if (approvedResult.isError) {
				return Result.error(approvedResult.error);
			}

			// Save updated leave request
			const updatedLeaveRequest = await this.leaveRequestRepository.update(
				id,
				approvedResult.value
			);
			return Result.ok(updatedLeaveRequest);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to approve leave request', 'LEAVE_REQUEST_APPROVE_FAILED', {
					leaveRequestId: id,
					managerId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Reject a leave request
	 * Business logic:
	 * - Validates manager authorization (TODO: implement with employee/department data)
	 * - Requires comments (enforced by domain)
	 * - Uses domain method to reject
	 * - Saves updated entity
	 *
	 * @param id - Leave request ID
	 * @param managerId - Manager ID performing the rejection
	 * @param comments - Required rejection reason
	 * @returns Result containing the rejected leave request or an error
	 */
	async rejectLeaveRequest(
		id: string,
		managerId: string,
		comments: string
	): Promise<Result<LeaveRequest, DomainError>> {
		try {
			// Fetch existing leave request
			const leaveRequest = await this.leaveRequestRepository.findById(id);
			if (!leaveRequest) {
				return Result.error(new LeaveRequestNotFoundError(id));
			}

			// TODO: Add manager authorization check
			// For now, we trust the caller has verified authorization

			// Use domain method to reject (comments validation in domain)
			const rejectedResult = leaveRequest.reject(managerId, comments);
			if (rejectedResult.isError) {
				return Result.error(rejectedResult.error);
			}

			// Save updated leave request
			const updatedLeaveRequest = await this.leaveRequestRepository.update(
				id,
				rejectedResult.value
			);
			return Result.ok(updatedLeaveRequest);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to reject leave request', 'LEAVE_REQUEST_REJECT_FAILED', {
					leaveRequestId: id,
					managerId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Cancel a leave request
	 * Business logic:
	 * - Employee can cancel their own pending request
	 * - Manager can cancel approved request
	 * - Authorization check performed here (TODO: enhance)
	 *
	 * @param id - Leave request ID
	 * @param userId - User ID performing the cancellation (employee or manager)
	 * @returns Result containing the cancelled leave request or an error
	 */
	async cancelLeaveRequest(id: string, userId: string): Promise<Result<LeaveRequest, DomainError>> {
		try {
			// Fetch existing leave request
			const leaveRequest = await this.leaveRequestRepository.findById(id);
			if (!leaveRequest) {
				return Result.error(new LeaveRequestNotFoundError(id));
			}

			// Business Rule: Authorization check
			// Employee can cancel their own pending request
			// Manager can cancel approved request (TODO: verify manager relationship)
			const isEmployee = leaveRequest.isForEmployee(userId);
			const isPending = leaveRequest.isPending();

			if (!isEmployee && !isPending) {
				// If not the employee, must be manager cancelling approved request
				// TODO: Verify userId is actually the manager
				// For now, allow cancellation if not employee (assumes authorization was checked)
			}

			// Use domain method to cancel
			const cancelledResult = leaveRequest.cancel();
			if (cancelledResult.isError) {
				return Result.error(cancelledResult.error);
			}

			// Save updated leave request
			const updatedLeaveRequest = await this.leaveRequestRepository.update(
				id,
				cancelledResult.value
			);
			return Result.ok(updatedLeaveRequest);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to cancel leave request', 'LEAVE_REQUEST_CANCEL_FAILED', {
					leaveRequestId: id,
					userId,
					originalError: error
				})
			);
		}
	}

	/**
	 * Delete a leave request (hard delete)
	 * Business Rule: Only pending requests can be deleted
	 *
	 * @param id - Leave request ID
	 * @returns Result indicating success or an error
	 */
	async deleteLeaveRequest(id: string): Promise<Result<void, DomainError>> {
		try {
			// Fetch existing leave request
			const leaveRequest = await this.leaveRequestRepository.findById(id);
			if (!leaveRequest) {
				return Result.error(new LeaveRequestNotFoundError(id));
			}

			// Business Rule: Only pending requests can be deleted
			if (!leaveRequest.isPending()) {
				return Result.error(
					new DomainError(
						'Cannot delete non-pending leave request',
						'LEAVE_REQUEST_DELETE_NOT_ALLOWED',
						{
							leaveRequestId: id,
							status: leaveRequest.status.toString()
						}
					)
				);
			}

			// Delete from repository
			await this.leaveRequestRepository.delete(id);

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to delete leave request', 'LEAVE_REQUEST_DELETE_FAILED', {
					leaveRequestId: id,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get leave balance for an employee
	 * @param employeeId - Employee ID
	 * @param year - Year (defaults to current year)
	 * @returns Result containing leave balance or an error
	 */
	async getLeaveBalance(
		employeeId: string,
		year?: number
	): Promise<Result<LeaveBalance, DomainError>> {
		try {
			const balance = await this.leaveRequestRepository.getLeaveBalance(employeeId, year);
			return Result.ok(balance);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch leave balance', 'LEAVE_BALANCE_FETCH_FAILED', {
					employeeId,
					year,
					originalError: error
				})
			);
		}
	}

	/**
	 * Get aggregated leave request statistics
	 * @param filters - Optional filters to scope statistics
	 * @returns Result containing statistics or an error
	 */
	async getStatistics(
		filters?: LeaveStatisticsFilters
	): Promise<Result<LeaveStatistics, DomainError>> {
		try {
			const stats = await this.leaveRequestRepository.getStatistics(filters);
			return Result.ok(stats);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to fetch statistics', 'LEAVE_STATISTICS_FETCH_FAILED', {
					filters,
					originalError: error
				})
			);
		}
	}

	/**
	 * Check for overlapping leave requests (utility method)
	 * Used before creating or approving leave requests
	 *
	 * @param employeeId - Employee ID
	 * @param startDate - Start date (ISO 8601)
	 * @param endDate - End date (ISO 8601)
	 * @param excludeId - Optional leave request ID to exclude (for updates)
	 * @returns Result containing array of overlapping leave requests
	 */
	async checkOverlappingLeaveRequests(
		employeeId: string,
		startDate: string,
		endDate: string,
		excludeId?: string
	): Promise<Result<LeaveRequest[], DomainError>> {
		try {
			const overlapping = await this.leaveRequestRepository.findOverlapping(
				employeeId,
				startDate,
				endDate,
				excludeId
			);
			return Result.ok(overlapping);
		} catch (error) {
			return Result.error(
				new DomainError('Failed to check overlapping leave requests', 'OVERLAP_CHECK_FAILED', {
					employeeId,
					startDate,
					endDate,
					originalError: error
				})
			);
		}
	}
}
