// src/services/ActivityLogService.ts
import { Result } from '$domain/Result';
import {
	ActivityLog,
	ActivityAction,
	ResourceType,
	IpAddress,
	ActivityLogNotFoundError,
	InvalidActivityLogError
} from '$domain/ActivityLog';
import type { ActivityLogError } from '$domain/ActivityLog';
import type { ActivityLogRepository } from './ports/ActivityLogRepository';

export interface CreateActivityLogInput {
	id: string;
	employeeId: string;
	action: string;
	resourceType: string;
	resourceId?: string | null;
	details?: Record<string, unknown> | null;
	beforeSnapshot?: Record<string, unknown> | null;
	afterSnapshot?: Record<string, unknown> | null;
	isRollback?: boolean;
	rolledBackLogId?: string | null;
	ipAddress?: string | null;
}

/**
 * Service for ActivityLog business operations.
 *
 * Orchestrates activity log CRUD operations and data retention,
 * delegating data access to the ActivityLogRepository port.
 *
 * @example
 * ```typescript
 * const service = createActivityLogService(event);
 * const result = await service.getAll(50);
 * if (result.isOk) {
 *   console.log(result.value); // ActivityLog[]
 * }
 * ```
 */
export class ActivityLogService {
	constructor(private readonly repository: ActivityLogRepository) {}

	/**
	 * Get an activity log entry by ID.
	 * Returns ActivityLogNotFoundError if not found.
	 */
	async getById(id: string): Promise<Result<ActivityLog, ActivityLogError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new ActivityLogNotFoundError(id));
			}

			return Result.ok(findResult.value);
		} catch {
			return Result.error(new ActivityLogNotFoundError(id));
		}
	}

	/**
	 * Get all activity log entries for a given employee.
	 */
	async getByEmployeeId(
		employeeId: string,
		limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		try {
			return await this.repository.findByEmployeeId(employeeId, limit);
		} catch {
			return Result.error(
				new InvalidActivityLogError(`Failed to fetch activity logs for employee: ${employeeId}`)
			);
		}
	}

	/**
	 * Get all activity log entries for a given resource type.
	 */
	async getByResourceType(
		resourceTypeValue: string,
		limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		try {
			const typeResult = ResourceType.create(resourceTypeValue);
			if (typeResult.isError) return Result.error(typeResult.error);

			return await this.repository.findByResourceType(typeResult.value, limit);
		} catch {
			return Result.error(
				new InvalidActivityLogError(
					`Failed to fetch activity logs for resource type: ${resourceTypeValue}`
				)
			);
		}
	}

	/**
	 * Get activity log entries within a date range.
	 */
	async getByDateRange(
		from: Date,
		to: Date,
		limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		try {
			if (isNaN(from.getTime()) || isNaN(to.getTime())) {
				return Result.error(new InvalidActivityLogError('Invalid date range: dates must be valid'));
			}

			if (from > to) {
				return Result.error(
					new InvalidActivityLogError('Invalid date range: from date must be before to date')
				);
			}

			return await this.repository.findByDateRange(from, to, limit);
		} catch {
			return Result.error(new InvalidActivityLogError('Failed to fetch activity logs by date range'));
		}
	}

	/**
	 * Get all activity log entries.
	 */
	async getAll(limit?: number): Promise<Result<ActivityLog[], ActivityLogError>> {
		try {
			return await this.repository.findAll(limit);
		} catch {
			return Result.error(new InvalidActivityLogError('Failed to fetch activity logs'));
		}
	}

	/**
	 * Create a new activity log entry.
	 * Validates all input data and creates domain entity before persisting.
	 */
	async create(input: CreateActivityLogInput): Promise<Result<ActivityLog, ActivityLogError>> {
		try {
			const actionResult = ActivityAction.create(input.action);
			if (actionResult.isError) return Result.error(actionResult.error);

			const resourceTypeResult = ResourceType.create(input.resourceType);
			if (resourceTypeResult.isError) return Result.error(resourceTypeResult.error);

			let ipAddress = null;
			if (input.ipAddress != null) {
				const ipResult = IpAddress.create(input.ipAddress);
				if (ipResult.isError) return Result.error(ipResult.error);
				ipAddress = ipResult.value;
			}

			const logResult = ActivityLog.create({
				id: input.id,
				employeeId: input.employeeId,
				action: actionResult.value,
				resourceType: resourceTypeResult.value,
				resourceId: input.resourceId ?? null,
				details: input.details ?? null,
				beforeSnapshot: input.beforeSnapshot ?? null,
				afterSnapshot: input.afterSnapshot ?? null,
				isRollback: input.isRollback ?? false,
				rolledBackLogId: input.rolledBackLogId ?? null,
				ipAddress,
				createdAt: new Date()
			});

			if (logResult.isError) return Result.error(logResult.error);

			return await this.repository.create(logResult.value);
		} catch {
			return Result.error(new InvalidActivityLogError('Failed to create activity log entry'));
		}
	}

	/**
	 * Delete all activity log entries older than a given date.
	 * Used for data retention management (e.g., purge logs older than 90 days).
	 * @param olderThan - Delete entries created before this date
	 * @returns Result containing the number of deleted entries
	 */
	async purgeOlderThan(olderThan: Date): Promise<Result<number, ActivityLogError>> {
		try {
			if (isNaN(olderThan.getTime())) {
				return Result.error(new InvalidActivityLogError('Invalid date for purge operation'));
			}

			return await this.repository.deleteOlderThan(olderThan);
		} catch {
			return Result.error(new InvalidActivityLogError('Failed to purge activity logs'));
		}
	}
}
