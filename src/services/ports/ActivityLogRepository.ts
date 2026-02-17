// src/services/ports/ActivityLogRepository.ts
import type { Result } from '$domain/Result';
import type { ActivityLog, ActivityLogError } from '$domain/ActivityLog';
import type { ResourceType } from '$domain/ActivityLog';

/**
 * Port interface for ActivityLog data access.
 *
 * Defines the contract that any ActivityLog repository adapter must implement.
 * This port enables the service layer to remain independent of the storage mechanism.
 */
export interface ActivityLogRepository {
	/**
	 * Find an activity log entry by ID.
	 * @param id - UUID of the activity log entry
	 * @returns Result containing the log or ActivityLogError
	 */
	findById(id: string): Promise<Result<ActivityLog | null, ActivityLogError>>;

	/**
	 * Find all activity log entries for a given employee.
	 * @param employeeId - UUID of the employee
	 * @param limit - Maximum number of entries to return
	 * @returns Result containing array of logs or ActivityLogError
	 */
	findByEmployeeId(employeeId: string, limit?: number): Promise<Result<ActivityLog[], ActivityLogError>>;

	/**
	 * Find all activity log entries for a given resource type.
	 * @param resourceType - The resource type to filter by
	 * @param limit - Maximum number of entries to return
	 * @returns Result containing array of logs or ActivityLogError
	 */
	findByResourceType(resourceType: ResourceType, limit?: number): Promise<Result<ActivityLog[], ActivityLogError>>;

	/**
	 * Find activity log entries within a date range.
	 * @param from - Start date (inclusive)
	 * @param to - End date (inclusive)
	 * @param limit - Maximum number of entries to return
	 * @returns Result containing array of logs or ActivityLogError
	 */
	findByDateRange(from: Date, to: Date, limit?: number): Promise<Result<ActivityLog[], ActivityLogError>>;

	/**
	 * Find all activity log entries.
	 * @param limit - Maximum number of entries to return
	 * @returns Result containing array of logs or ActivityLogError
	 */
	findAll(limit?: number): Promise<Result<ActivityLog[], ActivityLogError>>;

	/**
	 * Create a new activity log entry.
	 * @param log - The ActivityLog entity to persist
	 * @returns Result containing the created log or ActivityLogError
	 */
	create(log: ActivityLog): Promise<Result<ActivityLog, ActivityLogError>>;

	/**
	 * Delete all activity log entries older than the given date.
	 * Used for data retention management.
	 * @param date - Delete entries created before this date
	 * @returns Result containing the number of deleted entries or ActivityLogError
	 */
	deleteOlderThan(date: Date): Promise<Result<number, ActivityLogError>>;
}
