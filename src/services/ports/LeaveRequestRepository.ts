// src/services/ports/LeaveRequestRepository.ts
import type {
	LeaveRequest,
	Result,
	DomainError,
	LeaveRequestFilters,
	LeaveRequestListResult,
	LeaveBalance,
	LeaveStatistics,
	LeaveStatisticsFilters
} from '$domain';

/**
 * Repository Port for LeaveRequest
 *
 * Defines the contract for persisting and retrieving leave requests.
 * Adapters implement this interface to provide concrete data access implementations.
 *
 * Following hexagonal architecture: this is the port that adapters implement.
 */
export interface LeaveRequestRepository {
	/**
	 * Find a leave request by ID
	 * @returns LeaveRequest or null if not found
	 */
	findById(id: string): Promise<LeaveRequest | null>;

	/**
	 * Find all leave requests matching the given filters
	 * @param filters - Optional filters for querying leave requests
	 * @returns Paginated list of leave requests
	 */
	findAll(filters?: LeaveRequestFilters): Promise<LeaveRequestListResult>;

	/**
	 * Find all leave requests for a specific employee
	 * @param employeeId - Employee ID
	 * @returns Array of leave requests for the employee
	 */
	findByEmployee(employeeId: string): Promise<LeaveRequest[]>;

	/**
	 * Find all leave requests managed by a specific manager
	 * @param managerId - Manager ID
	 * @returns Array of leave requests managed by this manager
	 */
	findByManager(managerId: string): Promise<LeaveRequest[]>;

	/**
	 * Find overlapping leave requests for an employee in a date range
	 * Used to prevent double-booking
	 *
	 * @param employeeId - Employee ID
	 * @param startDate - Start date (ISO 8601)
	 * @param endDate - End date (ISO 8601)
	 * @param excludeId - Optional leave request ID to exclude (for updates)
	 * @returns Array of overlapping leave requests
	 */
	findOverlapping(
		employeeId: string,
		startDate: string,
		endDate: string,
		excludeId?: string
	): Promise<LeaveRequest[]>;

	/**
	 * Save a new leave request
	 * @param leaveRequest - The leave request entity to persist
	 * @returns The persisted leave request
	 */
	save(leaveRequest: LeaveRequest): Promise<LeaveRequest>;

	/**
	 * Update an existing leave request
	 * @param id - Leave request ID
	 * @param leaveRequest - Updated leave request entity
	 * @returns The updated leave request
	 */
	update(id: string, leaveRequest: LeaveRequest): Promise<LeaveRequest>;

	/**
	 * Delete a leave request
	 * @param id - Leave request ID
	 */
	delete(id: string): Promise<void>;

	/**
	 * Check if a leave request exists
	 * @param id - Leave request ID
	 * @returns true if exists, false otherwise
	 */
	exists(id: string): Promise<boolean>;

	/**
	 * Get leave balance for an employee for a specific year
	 * @param employeeId - Employee ID
	 * @param year - Year (defaults to current year)
	 * @returns Leave balance information
	 */
	getLeaveBalance(employeeId: string, year?: number): Promise<LeaveBalance>;

	/**
	 * Get aggregated statistics for leave requests
	 * @param filters - Optional filters to scope statistics
	 * @returns Aggregated leave request statistics
	 */
	getStatistics(filters?: LeaveStatisticsFilters): Promise<LeaveStatistics>;

	/**
	 * Count leave requests by status
	 * @param status - Leave status to count
	 * @param filters - Optional filters to scope the count
	 * @returns Number of leave requests matching the status
	 */
	countByStatus(status: string, filters?: LeaveStatisticsFilters): Promise<number>;

	/**
	 * Get total days of approved leave for an employee in a date range
	 * @param employeeId - Employee ID
	 * @param startDate - Start date (ISO 8601)
	 * @param endDate - End date (ISO 8601)
	 * @returns Total business days of approved leave
	 */
	getTotalDaysByEmployee(employeeId: string, startDate: string, endDate: string): Promise<number>;
}
