// src/domain/ActivityLog/errors/ActivityLogErrors.ts

/**
 * Base error class for ActivityLog domain errors.
 */
export class ActivityLogError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'ActivityLogError';
	}
}

/**
 * Error thrown when an activity log entry is not found.
 */
export class ActivityLogNotFoundError extends ActivityLogError {
	constructor(id: string) {
		super(`Activity log not found: ${id}`, 'ACTIVITY_LOG_NOT_FOUND');
		this.name = 'ActivityLogNotFoundError';
	}
}

/**
 * Error thrown when activity log data is invalid.
 */
export class InvalidActivityLogError extends ActivityLogError {
	constructor(message: string) {
		super(message, 'INVALID_ACTIVITY_LOG');
		this.name = 'InvalidActivityLogError';
	}
}
