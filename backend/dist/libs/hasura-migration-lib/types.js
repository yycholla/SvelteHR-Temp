/**
 * Type definitions for Hasura Migration Library
 */
// Error types
export class MigrationError extends Error {
    migrationId;
    cause;
    constructor(message, migrationId, cause) {
        super(message);
        this.migrationId = migrationId;
        this.cause = cause;
        this.name = 'MigrationError';
    }
}
export class ValidationError extends Error {
    errors;
    migrationId;
    constructor(message, errors, migrationId) {
        super(message);
        this.errors = errors;
        this.migrationId = migrationId;
        this.name = 'ValidationError';
    }
}
export class PerformanceError extends Error {
    metrics;
    migrationId;
    constructor(message, metrics, migrationId) {
        super(message);
        this.metrics = metrics;
        this.migrationId = migrationId;
        this.name = 'PerformanceError';
    }
}
export class LockTimeoutError extends Error {
    migrationId;
    timeoutMs;
    constructor(message, migrationId, timeoutMs) {
        super(message);
        this.migrationId = migrationId;
        this.timeoutMs = timeoutMs;
        this.name = 'LockTimeoutError';
    }
}
//# sourceMappingURL=types.js.map