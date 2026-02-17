// src/adapters/graphql/GraphQLActivityLogAdapter.ts
import { gql } from '@urql/core';
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
import type { ActivityLogRepository } from '$services/ports/ActivityLogRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for activity log
 */
interface GraphQLActivityLog {
	id: string;
	employeeId: string;
	action: string;
	resourceType: string;
	resourceId?: string | null;
	details?: Record<string, unknown> | null;
	beforeSnapshot?: Record<string, unknown> | null;
	afterSnapshot?: Record<string, unknown> | null;
	isRollback?: boolean | null;
	rolledBackLogId?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	createdAt: string;
}

/**
 * GraphQLActivityLogAdapter implements ActivityLogRepository port for GraphQL backend.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLActivityLogAdapter(graphqlPort);
 * const result = await adapter.findAll(50);
 * if (result.isOk) {
 *   console.log(result.value); // ActivityLog[]
 * }
 * ```
 */
export class GraphQLActivityLogAdapter implements ActivityLogRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<ActivityLog | null, ActivityLogError>> {
		const query = gql`
			query GetActivityLog($id: UUID!) {
				activityLog(id: $id) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					ipAddress
					userAgent
					createdAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				activityLog: GraphQLActivityLog | null;
			}>(query, { id });

			if (!result?.activityLog) {
				return Result.ok(null);
			}

			const log = this.mapToEntity(result.activityLog);
			return Result.ok(log);
		} catch {
			return Result.ok(null);
		}
	}

	async findByEmployeeId(
		employeeId: string,
		limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		const query = gql`
			query GetActivityLogsByEmployee($employeeId: UUID!, $limit: Int) {
				activityLogsByEmployee(employeeId: $employeeId, limit: $limit) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					ipAddress
					userAgent
					createdAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				activityLogsByEmployee: GraphQLActivityLog[];
			}>(query, { employeeId, limit });

			const logs = (result?.activityLogsByEmployee ?? [])
				.map((l) => this.mapToEntity(l))
				.filter((l): l is ActivityLog => l !== null);

			return Result.ok(logs);
		} catch (error) {
			return Result.error(
				new InvalidActivityLogError(
					`Failed to fetch activity logs for employee: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findByResourceType(
		resourceType: ResourceType,
		limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		const query = gql`
			query GetActivityLogsByResourceType($resourceType: String!, $limit: Int) {
				activityLogsByResourceType(resourceType: $resourceType, limit: $limit) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					ipAddress
					userAgent
					createdAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				activityLogsByResourceType: GraphQLActivityLog[];
			}>(query, { resourceType: resourceType.value, limit });

			const logs = (result?.activityLogsByResourceType ?? [])
				.map((l) => this.mapToEntity(l))
				.filter((l): l is ActivityLog => l !== null);

			return Result.ok(logs);
		} catch (error) {
			return Result.error(
				new InvalidActivityLogError(
					`Failed to fetch activity logs by resource type: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findByDateRange(
		from: Date,
		to: Date,
		limit?: number
	): Promise<Result<ActivityLog[], ActivityLogError>> {
		const query = gql`
			query GetActivityLogsByDateRange($from: DateTime!, $to: DateTime!, $limit: Int) {
				activityLogsByDateRange(from: $from, to: $to, limit: $limit) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					ipAddress
					userAgent
					createdAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				activityLogsByDateRange: GraphQLActivityLog[];
			}>(query, { from: from.toISOString(), to: to.toISOString(), limit });

			const logs = (result?.activityLogsByDateRange ?? [])
				.map((l) => this.mapToEntity(l))
				.filter((l): l is ActivityLog => l !== null);

			return Result.ok(logs);
		} catch (error) {
			return Result.error(
				new InvalidActivityLogError(
					`Failed to fetch activity logs by date range: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findAll(limit?: number): Promise<Result<ActivityLog[], ActivityLogError>> {
		const query = gql`
			query GetAllActivityLogs($limit: Int) {
				activityLogs(limit: $limit) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					ipAddress
					userAgent
					createdAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{
				activityLogs: GraphQLActivityLog[];
			}>(query, { limit });

			const logs = (result?.activityLogs ?? [])
				.map((l) => this.mapToEntity(l))
				.filter((l): l is ActivityLog => l !== null);

			return Result.ok(logs);
		} catch (error) {
			return Result.error(
				new InvalidActivityLogError(
					`Failed to fetch activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(log: ActivityLog): Promise<Result<ActivityLog, ActivityLogError>> {
		const mutation = gql`
			mutation CreateActivityLog($input: CreateActivityLogInput!) {
				createActivityLog(input: $input) {
					id
					employeeId
					action
					resourceType
					resourceId
					details
					beforeSnapshot
					afterSnapshot
					isRollback
					rolledBackLogId
					ipAddress
					userAgent
					createdAt
				}
			}
		`;

		try {
			const input = {
				id: log.id,
				employeeId: log.employeeId,
				action: log.action.value,
				resourceType: log.resourceType.value,
				resourceId: log.resourceId,
				details: log.details,
				beforeSnapshot: log.beforeSnapshot,
				afterSnapshot: log.afterSnapshot,
				isRollback: log.isRollback,
				rolledBackLogId: log.rolledBackLogId,
				ipAddress: log.ipAddress?.value ?? null
			};

			const result = await this.graphql.mutation<{
				createActivityLog: GraphQLActivityLog;
			}>(mutation, { input });

			if (!result?.createActivityLog) {
				return Result.error(new InvalidActivityLogError('Failed to create activity log'));
			}

			const created = this.mapToEntity(result.createActivityLog);
			if (!created) {
				return Result.error(
					new InvalidActivityLogError('Invalid activity log data returned from create')
				);
			}

			return Result.ok(created);
		} catch (error) {
			return Result.error(
				new InvalidActivityLogError(
					`Failed to create activity log: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteOlderThan(date: Date): Promise<Result<number, ActivityLogError>> {
		const mutation = gql`
			mutation DeleteActivityLogsOlderThan($date: DateTime!) {
				deleteActivityLogsOlderThan(date: $date)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteActivityLogsOlderThan: number }>(
				mutation,
				{ date: date.toISOString() }
			);

			const count = result?.deleteActivityLogsOlderThan ?? 0;
			return Result.ok(count);
		} catch (error) {
			return Result.error(
				new InvalidActivityLogError(
					`Failed to delete activity logs: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Map GraphQL activity log data to domain ActivityLog entity.
	 * @private
	 * @returns ActivityLog entity or null if data is invalid (resilient error handling)
	 */
	private mapToEntity(data: GraphQLActivityLog): ActivityLog | null {
		try {
			const actionResult = ActivityAction.create(data.action);
			if (actionResult.isError) return null;

			const resourceTypeResult = ResourceType.create(data.resourceType);
			if (resourceTypeResult.isError) return null;

			const createdAt = new Date(data.createdAt);
			if (isNaN(createdAt.getTime())) return null;

			let ipAddress = null;
			if (data.ipAddress != null) {
				const ipResult = IpAddress.create(data.ipAddress);
				if (ipResult.isError) return null;
				ipAddress = ipResult.value;
			}

			const logResult = ActivityLog.create({
				id: data.id,
				employeeId: data.employeeId,
				action: actionResult.value,
				resourceType: resourceTypeResult.value,
				resourceId: data.resourceId ?? null,
				details: data.details ?? null,
				beforeSnapshot: data.beforeSnapshot ?? null,
				afterSnapshot: data.afterSnapshot ?? null,
				isRollback: data.isRollback ?? false,
				rolledBackLogId: data.rolledBackLogId ?? null,
				ipAddress,
				createdAt
			});

			if (logResult.isError) return null;

			return logResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}
}
