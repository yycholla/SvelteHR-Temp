// src/domain/ActivityLog/value-objects/ResourceType.ts
import { Result } from '$domain/Result';
import { InvalidActivityLogError } from '../errors/ActivityLogErrors';

type ResourceTypeValue =
	| 'event'
	| 'task'
	| 'leave_request'
	| 'profile'
	| 'document'
	| 'employee'
	| 'department'
	| 'performance_review'
	| 'notification'
	| 'system';

const VALID_RESOURCE_TYPES: ReadonlySet<string> = new Set([
	'event',
	'task',
	'leave_request',
	'profile',
	'document',
	'employee',
	'department',
	'performance_review',
	'notification',
	'system'
]);

const SYSTEM_RESOURCES: ReadonlySet<string> = new Set(['system']);

/**
 * Value object representing the resource type referenced in an activity log entry.
 *
 * Valid values: event, task, leave_request, profile, document, employee,
 *               department, performance_review, notification, system
 *
 * Provides business logic:
 * - isSystemResource(): true for 'system' resource type
 */
export class ResourceType {
	private constructor(private readonly _value: ResourceTypeValue) {}

	/**
	 * Create a ResourceType value object.
	 * @param value - Resource type string
	 * @returns Result containing ResourceType or InvalidActivityLogError
	 */
	static create(value: string): Result<ResourceType, InvalidActivityLogError> {
		if (!VALID_RESOURCE_TYPES.has(value)) {
			return Result.error(
				new InvalidActivityLogError(
					`Invalid resource type: "${value}". Must be one of: ${Array.from(VALID_RESOURCE_TYPES).join(', ')}`
				)
			);
		}

		return Result.ok(new ResourceType(value as ResourceTypeValue));
	}

	/** The resource type value */
	get value(): ResourceTypeValue {
		return this._value;
	}

	/**
	 * Returns true if the resource type represents a system-level resource.
	 * System resources are not tied to any specific business entity.
	 */
	isSystemResource(): boolean {
		return SYSTEM_RESOURCES.has(this._value);
	}

	equals(other: ResourceType): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
