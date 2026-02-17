// src/domain/ActivityLog/ActivityLog.ts
import { Result } from '$domain/Result';
import { ActivityAction } from './value-objects/ActivityAction';
import { ResourceType } from './value-objects/ResourceType';
import { IpAddress } from './value-objects/IpAddress';
import { ActivityLogError, InvalidActivityLogError } from './errors/ActivityLogErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CreateActivityLogData {
	id: string;
	employeeId: string;
	action: ActivityAction;
	resourceType: ResourceType;
	resourceId?: string | null;
	details?: Record<string, unknown> | null;
	beforeSnapshot?: Record<string, unknown> | null;
	afterSnapshot?: Record<string, unknown> | null;
	isRollback?: boolean;
	rolledBackLogId?: string | null;
	ipAddress?: IpAddress | null;
	createdAt: Date;
}

interface ActivityLogProps {
	id: string;
	employeeId: string;
	action: ActivityAction;
	resourceType: ResourceType;
	resourceId: string | null;
	details: Record<string, unknown> | null;
	beforeSnapshot: Record<string, unknown> | null;
	afterSnapshot: Record<string, unknown> | null;
	isRollback: boolean;
	rolledBackLogId: string | null;
	ipAddress: IpAddress | null;
	createdAt: Date;
}

/**
 * ActivityLog entity - aggregate root representing an audit trail entry.
 *
 * Records all significant actions performed in the system for auditing,
 * compliance, and debugging purposes.
 *
 * Immutable by design - all state is set at creation time.
 *
 * @example
 * ```typescript
 * const actionResult = ActivityAction.create('create');
 * const typeResult = ResourceType.create('employee');
 *
 * const logResult = ActivityLog.create({
 *   id: 'uuid',
 *   employeeId: 'employee-uuid',
 *   action: actionResult.value,
 *   resourceType: typeResult.value,
 *   createdAt: new Date()
 * });
 *
 * if (logResult.isOk) {
 *   console.log(logResult.value.isWriteAction()); // true
 * }
 * ```
 */
export class ActivityLog {
	private constructor(private readonly props: ActivityLogProps) {}

	/**
	 * Create an ActivityLog entity.
	 * Validates UUID formats and date integrity.
	 * @param data - ActivityLog creation data
	 * @returns Result containing ActivityLog or ActivityLogError
	 */
	static create(data: CreateActivityLogData): Result<ActivityLog, ActivityLogError> {
		// Validate ID format (must be UUID)
		if (!data.id || !UUID_REGEX.test(data.id)) {
			return Result.error(
				new InvalidActivityLogError(
					`Invalid activity log ID: "${data.id}". Must be a valid UUID.`
				)
			);
		}

		// Validate employeeId format (must be UUID)
		if (!data.employeeId || !UUID_REGEX.test(data.employeeId)) {
			return Result.error(
				new InvalidActivityLogError(
					`Invalid employee ID: "${data.employeeId}". Must be a valid UUID.`
				)
			);
		}

		// Validate rolledBackLogId if provided
		if (data.rolledBackLogId != null && !UUID_REGEX.test(data.rolledBackLogId)) {
			return Result.error(
				new InvalidActivityLogError(
					`Invalid rolled back log ID: "${data.rolledBackLogId}". Must be a valid UUID.`
				)
			);
		}

		// Validate createdAt
		if (!(data.createdAt instanceof Date) || isNaN(data.createdAt.getTime())) {
			return Result.error(new InvalidActivityLogError('Invalid createdAt date'));
		}

		return Result.ok(
			new ActivityLog({
				id: data.id,
				employeeId: data.employeeId,
				action: data.action,
				resourceType: data.resourceType,
				resourceId: data.resourceId ?? null,
				details: data.details ?? null,
				beforeSnapshot: data.beforeSnapshot ?? null,
				afterSnapshot: data.afterSnapshot ?? null,
				isRollback: data.isRollback ?? false,
				rolledBackLogId: data.rolledBackLogId ?? null,
				ipAddress: data.ipAddress ?? null,
				// Defensive copy
				createdAt: new Date(data.createdAt.getTime())
			})
		);
	}

	/** The activity log entry ID (UUID) */
	get id(): string {
		return this.props.id;
	}

	/** The employee who performed the action (UUID) */
	get employeeId(): string {
		return this.props.employeeId;
	}

	/** The action performed */
	get action(): ActivityAction {
		return this.props.action;
	}

	/** The type of resource affected */
	get resourceType(): ResourceType {
		return this.props.resourceType;
	}

	/** The ID of the specific resource affected, or null if not applicable */
	get resourceId(): string | null {
		return this.props.resourceId;
	}

	/** Additional details about the action, or null if none */
	get details(): Record<string, unknown> | null {
		return this.props.details;
	}

	/** State of the resource before the action, or null if not captured */
	get beforeSnapshot(): Record<string, unknown> | null {
		return this.props.beforeSnapshot;
	}

	/** State of the resource after the action, or null if not captured */
	get afterSnapshot(): Record<string, unknown> | null {
		return this.props.afterSnapshot;
	}

	/** Whether this log entry represents a rollback operation */
	get isRollback(): boolean {
		return this.props.isRollback;
	}

	/** The ID of the log entry that was rolled back, or null if not a rollback */
	get rolledBackLogId(): string | null {
		return this.props.rolledBackLogId;
	}

	/** The IP address of the client, or null if not available */
	get ipAddress(): IpAddress | null {
		return this.props.ipAddress;
	}

	/** Timestamp when the activity was logged (defensive copy) */
	get createdAt(): Date {
		return new Date(this.props.createdAt.getTime());
	}

	/**
	 * Returns true if the action is a write operation (create, update, or delete).
	 * Delegates to ActivityAction.isWriteAction().
	 */
	isWriteAction(): boolean {
		return this.props.action.isWriteAction();
	}

	/**
	 * Returns true if the log entry has either a before or after snapshot.
	 * Snapshots capture the state of a resource before and/or after modification.
	 */
	hasSnapshot(): boolean {
		return this.props.beforeSnapshot !== null || this.props.afterSnapshot !== null;
	}

	/**
	 * Returns true if this log entry represents a rollback operation.
	 */
	wasRolledBack(): boolean {
		return this.props.isRollback;
	}
}
