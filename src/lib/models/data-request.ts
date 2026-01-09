/**
 * T021: DataRequest Entity Model
 *
 * Implements the DataRequest entity with standardized GraphQL request handling.
 * Enforces timeout (≤5000ms), retry (0-3 attempts), and validation requirements.
 */

import type { DataRequest as DataRequestContract } from '$lib/types/graphql-contracts';

/**
 * Status enumeration for DataRequest lifecycle
 */
export enum DataRequestStatus {
	PENDING = 'pending',
	IN_PROGRESS = 'in_progress',
	SUCCESS = 'success',
	ERROR = 'error',
	TIMEOUT = 'timeout',
	CANCELLED = 'cancelled'
}

/**
 * User credentials interface for RBAC integration
 * T036: Session-based authentication - jwtToken is optional for session-based auth
 */
export interface UserCredentials {
	userId: string;
	jwtToken?: string; // Optional for session-based auth
	roles: string[];
	permissions: string[];
	departmentId?: string;
	isAuthenticated: boolean;
	expiresAt: string; // ISO timestamp
}

/**
 * DataRequest entity model implementing standardized GraphQL request handling
 */
export class DataRequest<TVariables = Record<string, unknown>, TData = unknown> {
	readonly id: string;
	readonly operationName: string;
	readonly variables: TVariables;
	readonly userCredentials: UserCredentials;
	readonly timeoutMs: number;
	readonly createdAt: string;

	private _status: DataRequestStatus;
	private _retryAttempts: number;
	private _completedAt: string | null;
	private _errorDetails: unknown | null;
	private _responseData: TData | null;

	/**
	 * Creates a new DataRequest instance
	 *
	 * @param config - Configuration object for the data request
	 * @throws {Error} When validation rules are violated
	 */
	constructor(config: {
		id?: string;
		operationName: string;
		variables: TVariables;
		userCredentials: UserCredentials;
		timeoutMs?: number;
	}) {
		// Validation Rules (as specified in T021)
		this.validateConfig(config);

		this.id = config.id || this.generateId();
		this.operationName = config.operationName;
		this.variables = config.variables;
		this.userCredentials = config.userCredentials;
		this.timeoutMs = Math.min(config.timeoutMs || 5000, 5000); // Enforce ≤5000ms limit
		this.createdAt = new Date().toISOString();

		// Initialize mutable properties
		this._status = DataRequestStatus.PENDING;
		this._retryAttempts = 0;
		this._completedAt = null;
		this._errorDetails = null;
		this._responseData = null;
	}

	/**
	 * Current status of the data request
	 */
	get status(): DataRequestStatus {
		return this._status;
	}

	/**
	 * Number of retry attempts (0-3)
	 */
	get retryAttempts(): number {
		return this._retryAttempts;
	}

	/**
	 * Completion timestamp (null if not completed)
	 */
	get completedAt(): string | null {
		return this._completedAt;
	}

	/**
	 * Error details (null if no error)
	 */
	get errorDetails(): unknown | null {
		return this._errorDetails;
	}

	/**
	 * Response data (null if not successful)
	 */
	get responseData(): TData | null {
		return this._responseData;
	}

	/**
	 * Duration in milliseconds (null if not completed)
	 */
	get durationMs(): number | null {
		if (!this._completedAt) return null;
		return new Date(this._completedAt).getTime() - new Date(this.createdAt).getTime();
	}

	/**
	 * Whether this request can be retried
	 */
	get canRetry(): boolean {
		return (
			this._retryAttempts < 3 &&
			(this._status === DataRequestStatus.ERROR || this._status === DataRequestStatus.TIMEOUT)
		);
	}

	/**
	 * Whether this request has exceeded timeout
	 */
	get isTimedOut(): boolean {
		if (
			this._status !== DataRequestStatus.PENDING &&
			this._status !== DataRequestStatus.IN_PROGRESS
		) {
			return false;
		}

		const elapsedMs = Date.now() - new Date(this.createdAt).getTime();
		return elapsedMs > this.timeoutMs;
	}

	/**
	 * Start processing the request
	 */
	start(): void {
		if (this._status !== DataRequestStatus.PENDING) {
			throw new Error(`Cannot start request in status: ${this._status}`);
		}
		this._status = DataRequestStatus.IN_PROGRESS;
	}

	/**
	 * Mark request as successful with response data
	 */
	success(data: TData): void {
		if (this._status !== DataRequestStatus.IN_PROGRESS) {
			throw new Error(`Cannot complete request in status: ${this._status}`);
		}
		this._status = DataRequestStatus.SUCCESS;
		this._responseData = data;
		this._completedAt = new Date().toISOString();
	}

	/**
	 * Mark request as failed with error details
	 */
	error(errorDetails: unknown): void {
		if (this._status !== DataRequestStatus.IN_PROGRESS) {
			throw new Error(`Cannot fail request in status: ${this._status}`);
		}
		this._status = DataRequestStatus.ERROR;
		this._errorDetails = errorDetails;
		this._completedAt = new Date().toISOString();
	}

	/**
	 * Mark request as timed out
	 */
	timeout(): void {
		if (this._status !== DataRequestStatus.IN_PROGRESS) {
			throw new Error(`Cannot timeout request in status: ${this._status}`);
		}
		this._status = DataRequestStatus.TIMEOUT;
		this._completedAt = new Date().toISOString();
	}

	/**
	 * Cancel the request
	 */
	cancel(): void {
		if (
			this._status === DataRequestStatus.SUCCESS ||
			this._status === DataRequestStatus.ERROR ||
			this._status === DataRequestStatus.TIMEOUT
		) {
			throw new Error(`Cannot cancel completed request in status: ${this._status}`);
		}
		this._status = DataRequestStatus.CANCELLED;
		this._completedAt = new Date().toISOString();
	}

	/**
	 * Attempt to retry the request (increments retry counter)
	 */
	retry(): void {
		if (!this.canRetry) {
			throw new Error(`Cannot retry: attempts=${this._retryAttempts}, status=${this._status}`);
		}

		this._retryAttempts += 1;
		this._status = DataRequestStatus.PENDING;
		this._completedAt = null;
		this._errorDetails = null;
		this._responseData = null;
	}

	/**
	 * Convert to contract-compatible format
	 */
	toContract(): DataRequestContract<TVariables> {
		return {
			id: this.id,
			operationName: this.operationName,
			variables: this.variables,
			userCredentials: {
				...this.userCredentials,
				id: this.userCredentials.userId,
				lastActivity: new Date()
			} as any,
			status: this._status as any,
			retryAttempts: this._retryAttempts,
			createdAt: new Date(this.createdAt),
			completedAt: this._completedAt ? new Date(this._completedAt) : null,
			timeoutMs: this.timeoutMs
		};
	}

	/**
	 * Convert to JSON representation for logging/debugging
	 */
	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			operationName: this.operationName,
			variables: this.variables,
			status: this._status,
			retryAttempts: this._retryAttempts,
			timeoutMs: this.timeoutMs,
			createdAt: this.createdAt,
			completedAt: this._completedAt,
			durationMs: this.durationMs,
			canRetry: this.canRetry,
			isTimedOut: this.isTimedOut,
			userCredentials: {
				userId: this.userCredentials.userId,
				roles: this.userCredentials.roles,
				permissions: this.userCredentials.permissions,
				departmentId: this.userCredentials.departmentId,
				isAuthenticated: this.userCredentials.isAuthenticated
				// Exclude sensitive data like JWT token
			}
		};
	}

	/**
	 * Validate configuration according to T021 requirements
	 */
	private validateConfig(config: {
		operationName: string;
		variables: TVariables;
		userCredentials: UserCredentials;
		timeoutMs?: number;
	}): void {
		// Validation Rule: operationName (non-empty)
		if (!config.operationName || config.operationName.trim().length === 0) {
			throw new Error('operationName must be non-empty');
		}

		// Validation Rule: userCredentials (valid)
		if (!config.userCredentials) {
			throw new Error('userCredentials is required');
		}

		if (!config.userCredentials.userId || config.userCredentials.userId.trim().length === 0) {
			throw new Error('userCredentials.userId must be non-empty');
		}

		// T036: JWT token is optional for session-based authentication
		// Only validate if jwtToken is provided
		if (config.userCredentials.jwtToken?.trim().length === 0) {
			throw new Error('userCredentials.jwtToken must be non-empty if provided');
		}

		if (!Array.isArray(config.userCredentials.roles)) {
			throw new Error('userCredentials.roles must be an array');
		}

		if (!Array.isArray(config.userCredentials.permissions)) {
			throw new Error('userCredentials.permissions must be an array');
		}

		if (typeof config.userCredentials.isAuthenticated !== 'boolean') {
			throw new Error('userCredentials.isAuthenticated must be a boolean');
		}

		// Validation Rule: timeoutMs (≤5000ms)
		if (
			config.timeoutMs &&
			(typeof config.timeoutMs !== 'number' || config.timeoutMs <= 0 || config.timeoutMs > 5000)
		) {
			throw new Error('timeoutMs must be a positive number ≤ 5000');
		}

		// Validation Rule: expiresAt (valid ISO timestamp)
		if (config.userCredentials.expiresAt) {
			const expiresAt = new Date(config.userCredentials.expiresAt);
			if (isNaN(expiresAt.getTime())) {
				throw new Error('userCredentials.expiresAt must be a valid ISO timestamp');
			}
		}
	}

	/**
	 * Generate unique identifier for the request
	 */
	private generateId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 9);
		return `req_${timestamp}_${random}`;
	}
}

/**
 * Factory function to create DataRequest instances with validation
 */
export function createDataRequest<TVariables = Record<string, unknown>, TData = unknown>(config: {
	operationName: string;
	variables: TVariables;
	userCredentials: UserCredentials;
	timeoutMs?: number;
}): DataRequest<TVariables, TData> {
	return new DataRequest<TVariables, TData>(config);
}

/**
 * Type guard to check if an object is a valid UserCredentials
 * T036: jwtToken is optional for session-based authentication
 */
export function isValidUserCredentials(obj: unknown): obj is UserCredentials {
	if (!obj || typeof obj !== 'object') return false;

	const creds = obj as Partial<UserCredentials>;

	return (
		typeof creds.userId === 'string' &&
		(creds.jwtToken === undefined || typeof creds.jwtToken === 'string') &&
		Array.isArray(creds.roles) &&
		Array.isArray(creds.permissions) &&
		typeof creds.isAuthenticated === 'boolean' &&
		(creds.expiresAt === undefined || typeof creds.expiresAt === 'string')
	);
}

/**
 * Utility to create UserCredentials from authentication context
 * T036: jwtToken is optional for session-based authentication
 */
export function createUserCredentials(authContext: {
	userId: string;
	jwtToken?: string;
	roles: string[];
	permissions: string[];
	departmentId?: string;
	expiresAt?: string;
}): UserCredentials {
	return {
		userId: authContext.userId,
		jwtToken: authContext.jwtToken,
		roles: authContext.roles,
		permissions: authContext.permissions,
		departmentId: authContext.departmentId,
		isAuthenticated: true,
		expiresAt: authContext.expiresAt || new Date(Date.now() + 3600000).toISOString() // 1 hour default
	};
}
