// src/domain/ActivityLog/value-objects/ActivityAction.ts
import { Result } from '$domain/Result';
import { InvalidActivityLogError } from '../errors/ActivityLogErrors';

type ActivityActionValue = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout';

const VALID_ACTIONS: ReadonlySet<string> = new Set([
	'create',
	'update',
	'delete',
	'view',
	'login',
	'logout'
]);

const WRITE_ACTIONS: ReadonlySet<string> = new Set(['create', 'update', 'delete']);

const AUTH_ACTIONS: ReadonlySet<string> = new Set(['login', 'logout']);

/**
 * Value object representing the action performed in an activity log entry.
 *
 * Valid values: create, update, delete, view, login, logout
 *
 * Provides business logic:
 * - isWriteAction(): true for create/update/delete (state-changing operations)
 * - isAuthAction(): true for login/logout (authentication operations)
 */
export class ActivityAction {
	private constructor(private readonly _value: ActivityActionValue) {}

	/**
	 * Create an ActivityAction value object.
	 * @param value - Action type string
	 * @returns Result containing ActivityAction or InvalidActivityLogError
	 */
	static create(value: string): Result<ActivityAction, InvalidActivityLogError> {
		if (!VALID_ACTIONS.has(value)) {
			return Result.error(
				new InvalidActivityLogError(
					`Invalid activity action: "${value}". Must be one of: ${Array.from(VALID_ACTIONS).join(', ')}`
				)
			);
		}

		return Result.ok(new ActivityAction(value as ActivityActionValue));
	}

	/** The action value */
	get value(): ActivityActionValue {
		return this._value;
	}

	/**
	 * Returns true if the action is a write operation (create, update, or delete).
	 * Write actions modify state and may trigger audit trails.
	 */
	isWriteAction(): boolean {
		return WRITE_ACTIONS.has(this._value);
	}

	/**
	 * Returns true if the action is an authentication operation (login or logout).
	 */
	isAuthAction(): boolean {
		return AUTH_ACTIONS.has(this._value);
	}

	equals(other: ActivityAction): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
