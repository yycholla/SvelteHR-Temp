/**
 * HR Input Validation Plugin
 *
 * Comprehensive validation system for HR GraphQL API including:
 * - Input type validation (email, UUID, dates, etc.)
 * - Business rule validation (overlaps, balances, permissions)
 * - User-friendly error messages with error codes
 * - Middleware integration with PostGraphile
 */

import { GraphQLError } from 'graphql';

// Validation error class with error codes for frontend handling
export class HRValidationError extends Error {
  public code: string;
  public field?: string;
  public details?: any;

  constructor(message: string, code: string, field?: string, details?: any) {
    super(message);
    this.name = 'HRValidationError';
    this.code = code;
    this.field = field;
    this.details = details;
  }
}

// Common validation patterns
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]{10,}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  employeeId: /^EMP-\d{4,}$/,
  projectCode: /^[A-Z]{2,5}-\d{3,}$/,
  budgetCode: /^[A-Z0-9]{3,10}$/,
  costCenter: /^[A-Z0-9]{3,8}$/,
  passwordStrong: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// Error codes for consistent frontend handling
export const ValidationErrorCodes = {
  // General validation errors
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_TYPE: 'INVALID_TYPE',
  VALUE_TOO_LONG: 'VALUE_TOO_LONG',
  VALUE_TOO_SHORT: 'VALUE_TOO_SHORT',
  VALUE_OUT_OF_RANGE: 'VALUE_OUT_OF_RANGE',

  // Business rule errors
  INSUFFICIENT_PERMISSION: 'INSUFFICIENT_PERMISSION',
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',

  // Time entry specific
  TIME_OVERLAP: 'TIME_OVERLAP',
  TIME_INVALID_RANGE: 'TIME_INVALID_RANGE',
  TIME_FUTURE_LIMIT: 'TIME_FUTURE_LIMIT',
  TIME_PAST_LIMIT: 'TIME_PAST_LIMIT',

  // Leave request specific
  LEAVE_INSUFFICIENT_BALANCE: 'LEAVE_INSUFFICIENT_BALANCE',
  LEAVE_DATE_CONFLICT: 'LEAVE_DATE_CONFLICT',
  LEAVE_INVALID_DATE_RANGE: 'LEAVE_INVALID_DATE_RANGE',
  LEAVE_SHORT_NOTICE: 'LEAVE_SHORT_NOTICE',

  // Goal specific
  GOAL_INVALID_PROGRESS: 'GOAL_INVALID_PROGRESS',
  GOAL_COMPLETED: 'GOAL_COMPLETED',
  GOAL_OVERDUE: 'GOAL_OVERDUE',

  // User/Auth specific
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
};

// Input validators
export class InputValidator {
  // Basic type validators
  static validateRequired(value: any, fieldName: string): void {
    if (value === null || value === undefined || value === '') {
      throw new HRValidationError(
        `${fieldName} is required`,
        ValidationErrorCodes.REQUIRED_FIELD,
        fieldName
      );
    }
  }

  static validateString(value: any, fieldName: string, minLength?: number, maxLength?: number): void {
    this.validateRequired(value, fieldName);

    if (typeof value !== 'string') {
      throw new HRValidationError(
        `${fieldName} must be a string`,
        ValidationErrorCodes.INVALID_TYPE,
        fieldName
      );
    }

    if (minLength && value.length < minLength) {
      throw new HRValidationError(
        `${fieldName} must be at least ${minLength} characters long`,
        ValidationErrorCodes.VALUE_TOO_SHORT,
        fieldName,
        { minLength, actualLength: value.length }
      );
    }

    if (maxLength && value.length > maxLength) {
      throw new HRValidationError(
        `${fieldName} cannot exceed ${maxLength} characters`,
        ValidationErrorCodes.VALUE_TOO_LONG,
        fieldName,
        { maxLength, actualLength: value.length }
      );
    }
  }

  static validateNumber(value: any, fieldName: string, min?: number, max?: number): void {
    this.validateRequired(value, fieldName);

    const numValue = Number(value);
    if (isNaN(numValue)) {
      throw new HRValidationError(
        `${fieldName} must be a valid number`,
        ValidationErrorCodes.INVALID_TYPE,
        fieldName
      );
    }

    if (min !== undefined && numValue < min) {
      throw new HRValidationError(
        `${fieldName} must be at least ${min}`,
        ValidationErrorCodes.VALUE_OUT_OF_RANGE,
        fieldName,
        { min, max, actual: numValue }
      );
    }

    if (max !== undefined && numValue > max) {
      throw new HRValidationError(
        `${fieldName} cannot exceed ${max}`,
        ValidationErrorCodes.VALUE_OUT_OF_RANGE,
        fieldName,
        { min, max, actual: numValue }
      );
    }
  }

  static validateDate(value: any, fieldName: string): Date {
    this.validateRequired(value, fieldName);

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new HRValidationError(
        `${fieldName} must be a valid date`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName
      );
    }

    return date;
  }

  static validateDateRange(startDate: any, endDate: any, startFieldName: string, endFieldName: string): void {
    const start = this.validateDate(startDate, startFieldName);
    const end = this.validateDate(endDate, endFieldName);

    if (start >= end) {
      throw new HRValidationError(
        `${endFieldName} must be after ${startFieldName}`,
        ValidationErrorCodes.INVALID_FORMAT,
        endFieldName,
        { startDate: start, endDate: end }
      );
    }
  }

  static validateEmail(value: any, fieldName: string): void {
    this.validateString(value, fieldName);

    if (!ValidationPatterns.email.test(value)) {
      throw new HRValidationError(
        `${fieldName} must be a valid email address`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName
      );
    }
  }

  static validateUUID(value: any, fieldName: string): void {
    this.validateString(value, fieldName);

    if (!ValidationPatterns.uuid.test(value)) {
      throw new HRValidationError(
        `${fieldName} must be a valid UUID`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName
      );
    }
  }

  static validatePattern(value: any, fieldName: string, pattern: RegExp, errorMessage: string): void {
    this.validateString(value, fieldName);

    if (!pattern.test(value)) {
      throw new HRValidationError(
        errorMessage || `${fieldName} has invalid format`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName
      );
    }
  }

  // HR-specific validators
  static validateEmployeeId(value: any, fieldName: string = 'Employee ID'): void {
    this.validatePattern(
      value,
      fieldName,
      ValidationPatterns.employeeId,
      `${fieldName} must be in format EMP-XXXX (e.g., EMP-1001)`
    );
  }

  static validateProjectCode(value: any, fieldName: string = 'Project Code'): void {
    this.validatePattern(
      value,
      fieldName,
      ValidationPatterns.projectCode,
      `${fieldName} must be in format ABC-123 (e.g., HR-001)`
    );
  }

  static validatePassword(value: any, fieldName: string = 'Password'): void {
    this.validateString(value, fieldName, 8);

    if (!ValidationPatterns.passwordStrong.test(value)) {
      throw new HRValidationError(
        `${fieldName} must contain at least 8 characters including uppercase, lowercase, number, and special character`,
        ValidationErrorCodes.WEAK_PASSWORD,
        fieldName
      );
    }
  }

  static validateLeaveType(value: any, fieldName: string = 'Leave Type'): void {
    this.validateRequired(value, fieldName);

    const validLeaveTypes = [
      'VACATION', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY',
      'BEREAVEMENT', 'JURY_DUTY', 'MILITARY'
    ];

    if (!validLeaveTypes.includes(value)) {
      throw new HRValidationError(
        `${fieldName} must be one of: ${validLeaveTypes.join(', ')}`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName,
        { validValues: validLeaveTypes }
      );
    }
  }

  static validatePriority(value: any, fieldName: string = 'Priority'): void {
    this.validateRequired(value, fieldName);

    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

    if (!validPriorities.includes(value)) {
      throw new HRValidationError(
        `${fieldName} must be one of: ${validPriorities.join(', ')}`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName,
        { validValues: validPriorities }
      );
    }
  }

  static validateStatus(value: any, fieldName: string, validStatuses: string[]): void {
    this.validateRequired(value, fieldName);

    if (!validStatuses.includes(value)) {
      throw new HRValidationError(
        `${fieldName} must be one of: ${validStatuses.join(', ')}`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName,
        { validValues: validStatuses }
      );
    }
  }

  // Business rule validators
  static validateWorkingHours(hours: number, fieldName: string = 'Hours'): void {
    this.validateNumber(hours, fieldName, 0, 24);

    // Business rule: No more than 16 hours per day for safety
    if (hours > 16) {
      throw new HRValidationError(
        'Cannot log more than 16 working hours per day for safety compliance',
        ValidationErrorCodes.BUSINESS_RULE_VIOLATION,
        fieldName,
        { maxHours: 16 }
      );
    }
  }

  static validateLeaveDays(days: number, fieldName: string = 'Leave Days'): void {
    this.validateNumber(days, fieldName, 0.5, 365);

    // Business rule: Leave requests cannot exceed 90 days (except special cases)
    if (days > 90) {
      throw new HRValidationError(
        'Leave requests cannot exceed 90 days. Please contact HR for extended leave arrangements',
        ValidationErrorCodes.BUSINESS_RULE_VIOLATION,
        fieldName,
        { maxDays: 90 }
      );
    }
  }

  static validateGoalProgress(progress: number, fieldName: string = 'Progress'): void {
    this.validateNumber(progress, fieldName, 0, 100);
  }

  static validateRoleLevel(level: number, fieldName: string = 'Role Level'): void {
    this.validateNumber(level, fieldName, 0, 100);

    const validLevels = [20, 40, 60, 80, 100]; // Employee, Lead, Manager, HR, Admin
    if (!validLevels.includes(level)) {
      throw new HRValidationError(
        `${fieldName} must be one of: ${validLevels.join(', ')} (Employee: 20, Lead: 40, Manager: 60, HR: 80, Admin: 100)`,
        ValidationErrorCodes.INVALID_FORMAT,
        fieldName,
        { validValues: validLevels }
      );
    }
  }

  // Future date validation for business rules
  static validateFutureDate(date: Date, maxDaysInFuture: number, fieldName: string): void {
    const now = new Date();
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxDaysInFuture);

    if (date > maxDate) {
      throw new HRValidationError(
        `${fieldName} cannot be more than ${maxDaysInFuture} days in the future`,
        ValidationErrorCodes.TIME_FUTURE_LIMIT,
        fieldName,
        { maxDaysInFuture, requestedDate: date }
      );
    }
  }

  // Past date validation for business rules
  static validatePastDate(date: Date, maxDaysInPast: number, fieldName: string): void {
    const now = new Date();
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - maxDaysInPast);

    if (date < minDate) {
      throw new HRValidationError(
        `${fieldName} cannot be more than ${maxDaysInPast} days in the past`,
        ValidationErrorCodes.TIME_PAST_LIMIT,
        fieldName,
        { maxDaysInPast, requestedDate: date }
      );
    }
  }
}

// Validation schemas for different input types
export const ValidationSchemas = {
  timeEntry: {
    validateCreate: (args: any) => {
      InputValidator.validateUUID(args.projectId, 'Project ID');
      InputValidator.validateDate(args.entryDate, 'Entry Date');
      InputValidator.validateString(args.startTime, 'Start Time', 1, 10);
      InputValidator.validateString(args.endTime, 'End Time', 1, 10);
      InputValidator.validateWorkingHours(args.totalHours, 'Total Hours');
      if (args.description) {
        InputValidator.validateString(args.description, 'Description', 0, 1000);
      }
    },

    validateSubmit: (args: any) => {
      InputValidator.validateUUID(args.timeEntryId, 'Time Entry ID');
    },

    validateReject: (args: any) => {
      InputValidator.validateUUID(args.timeEntryId, 'Time Entry ID');
      InputValidator.validateString(args.reason, 'Rejection Reason', 5, 500);
    }
  },

  leaveRequest: {
    validateCreate: (args: any) => {
      InputValidator.validateLeaveType(args.leaveType, 'Leave Type');
      InputValidator.validateDate(args.startDate, 'Start Date');
      InputValidator.validateDate(args.endDate, 'End Date');
      InputValidator.validateDateRange(args.startDate, args.endDate, 'Start Date', 'End Date');

      if (args.totalDays) {
        InputValidator.validateLeaveDays(args.totalDays, 'Total Days');
      }

      if (args.reason) {
        InputValidator.validateString(args.reason, 'Reason', 0, 1000);
      }

      if (args.emergencyContactDuringLeave) {
        InputValidator.validateString(args.emergencyContactDuringLeave, 'Emergency Contact', 0, 200);
      }

      if (args.workCoveragePlan) {
        InputValidator.validateString(args.workCoveragePlan, 'Work Coverage Plan', 0, 2000);
      }
    },

    validateReject: (args: any) => {
      InputValidator.validateUUID(args.leaveRequestId, 'Leave Request ID');
      InputValidator.validateString(args.reason, 'Rejection Reason', 10, 1000);
    }
  },

  goal: {
    validateCreate: (args: any) => {
      InputValidator.validateString(args.title, 'Title', 3, 200);
      InputValidator.validateString(args.description, 'Description', 10, 2000);
      InputValidator.validateDate(args.dueDate, 'Due Date');

      if (args.targetValue) {
        InputValidator.validateNumber(args.targetValue, 'Target Value', 0);
      }

      if (args.priority) {
        InputValidator.validatePriority(args.priority, 'Priority');
      }
    },

    validateUpdateProgress: (args: any) => {
      InputValidator.validateUUID(args.goalId, 'Goal ID');
      InputValidator.validateGoalProgress(args.progress, 'Progress');

      if (args.notes) {
        InputValidator.validateString(args.notes, 'Notes', 0, 1000);
      }
    }
  },

  user: {
    validateCreate: (args: any) => {
      InputValidator.validateEmail(args.email, 'Email');
      InputValidator.validateString(args.displayName, 'Display Name', 2, 100);

      if (args.password) {
        InputValidator.validatePassword(args.password, 'Password');
      }

      if (args.employeeId) {
        InputValidator.validateEmployeeId(args.employeeId, 'Employee ID');
      }

      if (args.phone) {
        InputValidator.validatePattern(
          args.phone,
          'Phone',
          ValidationPatterns.phone,
          'Phone number must be in valid format'
        );
      }
    },

    validateUpdateRole: (args: any) => {
      InputValidator.validateUUID(args.userId, 'User ID');
      InputValidator.validateRoleLevel(args.roleLevel, 'Role Level');
    }
  },

  notification: {
    validateCreate: (args: any) => {
      InputValidator.validateString(args.title, 'Title', 1, 200);
      InputValidator.validateString(args.message, 'Message', 1, 2000);

      if (args.priority) {
        InputValidator.validatePriority(args.priority, 'Priority');
      }

      if (args.recipientId) {
        InputValidator.validateUUID(args.recipientId, 'Recipient ID');
      }
    }
  }
};

// PostGraphile plugin for input validation
export const HRValidationPlugin = () => {
  return (builder: any) => {
    builder.hook('build', (build: any) => {
      // Add validation context to build
      build.hrValidation = {
        InputValidator,
        ValidationSchemas,
        HRValidationError,
        ValidationErrorCodes
      };

      return build;
    });

    return builder;
  };
};

// Utility function to handle validation errors consistently
export const handleValidationError = (error: any): never => {
  if (error instanceof HRValidationError) {
    // Return structured GraphQL error
    throw new GraphQLError(error.message, {
      extensions: {
        code: error.code,
        field: error.field,
        details: error.details,
        errorType: 'VALIDATION_ERROR'
      }
    });
  }

  // Re-throw other errors as-is
  throw error;
};

export default HRValidationPlugin;