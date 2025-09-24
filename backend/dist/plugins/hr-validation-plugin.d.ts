/**
 * HR Input Validation Plugin
 *
 * Comprehensive validation system for HR GraphQL API including:
 * - Input type validation (email, UUID, dates, etc.)
 * - Business rule validation (overlaps, balances, permissions)
 * - User-friendly error messages with error codes
 * - Middleware integration with PostGraphile
 */
export declare class HRValidationError extends Error {
    code: string;
    field?: string;
    details?: any;
    constructor(message: string, code: string, field?: string, details?: any);
}
export declare const ValidationPatterns: {
    email: RegExp;
    phone: RegExp;
    uuid: RegExp;
    employeeId: RegExp;
    projectCode: RegExp;
    budgetCode: RegExp;
    costCenter: RegExp;
    passwordStrong: RegExp;
};
export declare const ValidationErrorCodes: {
    REQUIRED_FIELD: string;
    INVALID_FORMAT: string;
    INVALID_TYPE: string;
    VALUE_TOO_LONG: string;
    VALUE_TOO_SHORT: string;
    VALUE_OUT_OF_RANGE: string;
    INSUFFICIENT_PERMISSION: string;
    BUSINESS_RULE_VIOLATION: string;
    RESOURCE_CONFLICT: string;
    RESOURCE_NOT_FOUND: string;
    DUPLICATE_RESOURCE: string;
    TIME_OVERLAP: string;
    TIME_INVALID_RANGE: string;
    TIME_FUTURE_LIMIT: string;
    TIME_PAST_LIMIT: string;
    LEAVE_INSUFFICIENT_BALANCE: string;
    LEAVE_DATE_CONFLICT: string;
    LEAVE_INVALID_DATE_RANGE: string;
    LEAVE_SHORT_NOTICE: string;
    GOAL_INVALID_PROGRESS: string;
    GOAL_COMPLETED: string;
    GOAL_OVERDUE: string;
    EMAIL_ALREADY_EXISTS: string;
    INVALID_CREDENTIALS: string;
    WEAK_PASSWORD: string;
    ACCOUNT_LOCKED: string;
};
export declare class InputValidator {
    static validateRequired(value: any, fieldName: string): void;
    static validateString(value: any, fieldName: string, minLength?: number, maxLength?: number): void;
    static validateNumber(value: any, fieldName: string, min?: number, max?: number): void;
    static validateDate(value: any, fieldName: string): Date;
    static validateDateRange(startDate: any, endDate: any, startFieldName: string, endFieldName: string): void;
    static validateEmail(value: any, fieldName: string): void;
    static validateUUID(value: any, fieldName: string): void;
    static validatePattern(value: any, fieldName: string, pattern: RegExp, errorMessage: string): void;
    static validateEmployeeId(value: any, fieldName?: string): void;
    static validateProjectCode(value: any, fieldName?: string): void;
    static validatePassword(value: any, fieldName?: string): void;
    static validateLeaveType(value: any, fieldName?: string): void;
    static validatePriority(value: any, fieldName?: string): void;
    static validateStatus(value: any, fieldName: string, validStatuses: string[]): void;
    static validateWorkingHours(hours: number, fieldName?: string): void;
    static validateLeaveDays(days: number, fieldName?: string): void;
    static validateGoalProgress(progress: number, fieldName?: string): void;
    static validateRoleLevel(level: number, fieldName?: string): void;
    static validateFutureDate(date: Date, maxDaysInFuture: number, fieldName: string): void;
    static validatePastDate(date: Date, maxDaysInPast: number, fieldName: string): void;
}
export declare const ValidationSchemas: {
    timeEntry: {
        validateCreate: (args: any) => void;
        validateSubmit: (args: any) => void;
        validateReject: (args: any) => void;
    };
    leaveRequest: {
        validateCreate: (args: any) => void;
        validateReject: (args: any) => void;
    };
    goal: {
        validateCreate: (args: any) => void;
        validateUpdateProgress: (args: any) => void;
    };
    user: {
        validateCreate: (args: any) => void;
        validateUpdateRole: (args: any) => void;
    };
    notification: {
        validateCreate: (args: any) => void;
    };
};
export declare const HRValidationPlugin: () => {
    build: (build: any) => any;
};
export declare const handleValidationError: (error: any) => never;
export default HRValidationPlugin;
