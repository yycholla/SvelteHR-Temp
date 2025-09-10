/**
 * Enhanced Error Handling Utilities - Feature 004
 * 
 * Comprehensive error handling system for the SvelteHR application.
 * Provides user-friendly error messages, logging, recovery mechanisms,
 * and modern Svelte 5 runes integration.
 */

import { writable } from 'svelte/store';
import type { ApiResponse, ApiError } from '../api/types';
import type { 
  ValidationError, 
  UserContext 
} from '$lib/types';

// ============================================================================
// Enhanced Error Types & Classifications
// ============================================================================

export enum ErrorType {
  // Authentication & Authorization
  AUTHENTICATION_FAILED = 'authentication_failed',
  ACCESS_DENIED = 'access_denied',
  TOKEN_EXPIRED = 'token_expired',
  INVALID_TOKEN = 'invalid_token',
  
  // Network & API
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  API_ERROR = 'api_error',
  TIMEOUT_ERROR = 'timeout_error',
  RATE_LIMITED = 'rate_limited',
  
  // Validation & Input
  VALIDATION_ERROR = 'validation_error',
  INVALID_INPUT = 'invalid_input',
  REQUIRED_FIELD_MISSING = 'required_field_missing',
  
  // Data & State
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  OUTDATED_DATA = 'outdated_data',
  
  // UI & User Experience
  USER_CANCELLED = 'user_cancelled',
  FEATURE_UNAVAILABLE = 'feature_unavailable',
  
  // System & Unknown
  SYSTEM_ERROR = 'system_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export interface EnhancedAppError {
  type: ErrorType;
  message: string;
  details?: any;
  cause?: Error;
  timestamp: Date;
  context?: {
    user_id?: string;
    route?: string;
    action?: string;
    component?: string;
  };
  recoverable: boolean;
  retry_after?: number; // seconds
}

// ============================================================================
// Legacy Toast Types (maintaining backward compatibility)
// ============================================================================

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  timeout?: number;
  dismissible?: boolean;
  actions?: ToastAction[];
}

export interface ToastAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

// Toast store for reactive notifications
export const toasts = writable<Toast[]>([]);

// ============================================================================
// Enhanced Error Factory Functions
// ============================================================================

/**
 * Create a standardized application error
 */
export function createError(
  type: ErrorType,
  message: string,
  options?: {
    details?: any;
    cause?: Error;
    recoverable?: boolean;
    retry_after?: number;
    context?: EnhancedAppError['context'];
  }
): EnhancedAppError {
  const result: EnhancedAppError = {
    type,
    message,
    timestamp: new Date(),
    recoverable: options?.recoverable ?? isRecoverableError(type)
  };

  if (options?.details !== undefined) {
    result.details = options.details;
  }
  if (options?.cause !== undefined) {
    result.cause = options.cause;
  }
  if (options?.context !== undefined) {
    result.context = options.context;
  }
  if (options?.retry_after !== undefined) {
    result.retry_after = options.retry_after;
  }

  return result;
}

/**
 * Create authentication error
 */
export function createAuthError(message: string, cause?: Error): EnhancedAppError {
  const options: any = {
    recoverable: true,
    context: { route: globalThis?.location?.pathname }
  };
  
  if (cause !== undefined) {
    options.cause = cause;
  }
  
  return createError(ErrorType.AUTHENTICATION_FAILED, message, options);
}

/**
 * Create authorization error
 */
export function createAccessDeniedError(resource?: string, action?: string): EnhancedAppError {
  const message = resource && action 
    ? `Access denied: Cannot ${action} ${resource}`
    : 'Access denied: Insufficient permissions';
    
  const options: any = {
    details: { resource, action },
    recoverable: false
  };
  
  const route = globalThis?.location?.pathname;
  if (route !== undefined || action !== undefined) {
    options.context = {};
    if (route !== undefined) options.context.route = route;
    if (action !== undefined) options.context.action = action;
  }
  
  return createError(ErrorType.ACCESS_DENIED, message, options);
}

/**
 * Create RBAC-specific error
 */
export function createRBACError(
  user: UserContext | null,
  requiredPermission: string,
  resource?: string
): EnhancedAppError {
  const userInfo = user ? `User ${user.email} (roles: ${user.roles.map(r => r.name).join(', ')})` : 'Unauthenticated user';
  
  const options: any = {
    details: {
      user_info: userInfo,
      required_permission: requiredPermission,
      resource,
      user_permissions: user?.permissions || []
    },
    recoverable: false
  };
  
  const context: any = { action: 'rbac_check' };
  const userId = user?.id;
  const route = globalThis?.location?.pathname;
  
  if (userId !== undefined) context.user_id = userId;
  if (route !== undefined) context.route = route;
  
  options.context = context;
  
  return createError(ErrorType.ACCESS_DENIED, 'Insufficient permissions for this action', options);
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string, 
  validationErrors?: ValidationError[]
): EnhancedAppError {
  return createError(ErrorType.VALIDATION_ERROR, message, {
    details: { validation_errors: validationErrors },
    recoverable: true
  });
}

// ============================================================================
// Error Classification Helpers
// ============================================================================

/**
 * Check if an error type is recoverable
 */
export function isRecoverableError(type: ErrorType): boolean {
  const recoverableTypes = [
    ErrorType.NETWORK_ERROR,
    ErrorType.TIMEOUT_ERROR,
    ErrorType.RATE_LIMITED,
    ErrorType.SERVER_ERROR,
    ErrorType.AUTHENTICATION_FAILED,
    ErrorType.TOKEN_EXPIRED,
    ErrorType.VALIDATION_ERROR,
    ErrorType.INVALID_INPUT,
    ErrorType.USER_CANCELLED
  ];
  
  return recoverableTypes.includes(type);
}

/**
 * Check if error requires authentication
 */
export function requiresAuth(error: EnhancedAppError): boolean {
  return [
    ErrorType.AUTHENTICATION_FAILED,
    ErrorType.TOKEN_EXPIRED,
    ErrorType.INVALID_TOKEN
  ].includes(error.type);
}

/**
 * Get error severity level
 */
export function getErrorSeverity(error: EnhancedAppError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.type) {
    case ErrorType.SYSTEM_ERROR:
    case ErrorType.SERVER_ERROR:
      return 'critical';
    case ErrorType.ACCESS_DENIED:
    case ErrorType.AUTHENTICATION_FAILED:
    case ErrorType.NETWORK_ERROR:
      return 'high';
    case ErrorType.VALIDATION_ERROR:
    case ErrorType.NOT_FOUND:
    case ErrorType.CONFLICT:
      return 'medium';
    default:
      return 'low';
  }
}

// ============================================================================
// Legacy API Error Handler (Enhanced)
// ============================================================================

/**
 * Comprehensive API Error Handler
 * Converts API responses to user-friendly error messages
 */
export class ApiErrorHandler {
  /**
   * Handle API response and convert to ApiError
   */
  static handle(response: ApiResponse<any>): ApiError {
    const error: ApiError = {
      message: response.error || 'An unexpected error occurred',
      status: response.status,
      details: response.data
    };

    // Handle specific HTTP status codes with user-friendly messages
    switch (response.status) {
      case 400:
        error.message = 'Invalid request. Please check your input and try again.';
        break;
      case 401:
        error.message = 'Please login to continue';
        break;
      case 403:
        error.message = "You don't have permission to perform this action";
        break;
      case 404:
        error.message = 'The requested resource was not found';
        break;
      case 409:
        error.message = 'A conflict occurred. The resource may already exist.';
        break;
      case 422:
        error.message = 'Please check your input and try again';
        // Extract field-specific errors if available
        if (response.data?.field_errors) {
          error.field_errors = response.data.field_errors;
        }
        break;
      case 429:
        error.message = 'Too many requests. Please slow down and try again later.';
        break;
      case 500:
        error.message = 'Server error. Please try again later or contact support.';
        break;
      case 502:
        error.message = 'Service temporarily unavailable. Please try again.';
        break;
      case 503:
        error.message = 'Service is currently under maintenance. Please try again later.';
        break;
      default:
        if (response.status >= 500) {
          error.message = 'Server error. Please try again later.';
        } else if (response.status >= 400) {
          error.message = response.error || 'Request failed. Please try again.';
        }
    }

    return error;
  }

  /**
   * Convert legacy ApiError to EnhancedAppError
   */
  static toEnhancedError(apiError: ApiError): EnhancedAppError {
    let errorType: ErrorType;
    
    switch (apiError.status) {
      case 401:
        errorType = ErrorType.AUTHENTICATION_FAILED;
        break;
      case 403:
        errorType = ErrorType.ACCESS_DENIED;
        break;
      case 404:
        errorType = ErrorType.NOT_FOUND;
        break;
      case 409:
        errorType = ErrorType.CONFLICT;
        break;
      case 422:
        errorType = ErrorType.VALIDATION_ERROR;
        break;
      case 429:
        errorType = ErrorType.RATE_LIMITED;
        break;
      case 500:
      case 502:
      case 503:
        errorType = ErrorType.SERVER_ERROR;
        break;
      default:
        errorType = ErrorType.API_ERROR;
    }
    
    return createError(errorType, apiError.message, {
      details: { 
        status: apiError.status, 
        api_response: apiError.details,
        field_errors: apiError.field_errors 
      }
    });
  }

  /**
   * Get field-specific error message
   */
  static getFieldError(
    fieldErrors: Record<string, string[]> | undefined,
    field: string
  ): string | undefined {
    return fieldErrors?.[field]?.[0];
  }

  /**
   * Get all field errors as a formatted string
   */
  static formatFieldErrors(fieldErrors: Record<string, string[]>): string {
    const errors: string[] = [];

    Object.entries(fieldErrors).forEach(([field, messages]) => {
      const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      messages.forEach((message) => {
        errors.push(`${fieldName}: ${message}`);
      });
    });

    return errors.join('\n');
  }

  /**
   * Handle API error and show appropriate toast notification
   */
  static handleWithToast(response: ApiResponse<any>, customMessage?: string): ApiError {
    const error = this.handle(response);

    if (customMessage) {
      error.message = customMessage;
    }

    // Show error toast
    showError(error.message, {
      title: this.getErrorTitle(error.status),
      timeout: this.getErrorTimeout(error.status),
      details: error.details
    });

    return error;
  }

  /**
   * Get appropriate error title based on status code
   */
  static getErrorTitle(status: number): string {
    switch (status) {
      case 401:
        return 'Authentication Required';
      case 403:
        return 'Access Denied';
      case 404:
        return 'Not Found';
      case 422:
        return 'Validation Error';
      case 429:
        return 'Rate Limited';
      case 500:
      case 502:
      case 503:
        return 'Server Error';
      default:
        return 'Error';
    }
  }

  /**
   * Get appropriate timeout based on error severity
   */
  static getErrorTimeout(status: number): number {
    switch (status) {
      case 401:
      case 403:
        return 7000; // Longer for auth errors
      case 500:
      case 502:
      case 503:
        return 8000; // Longer for server errors
      default:
        return 5000; // Default timeout
    }
  }
}

// ============================================================================
// Enhanced Error Logging & Reporting
// ============================================================================

/**
 * Log error with appropriate level
 */
export function logError(error: EnhancedAppError, additional?: any): void {
  const severity = getErrorSeverity(error);
  const logData = {
    ...error,
    additional,
    stack: error.cause?.stack,
    url: globalThis?.location?.href,
    userAgent: globalThis?.navigator?.userAgent
  };
  
  switch (severity) {
    case 'critical':
      console.error('🚨 Critical Error:', logData);
      break;
    case 'high':
      console.error('❌ High Severity Error:', logData);
      break;
    case 'medium':
      console.warn('⚠️ Medium Severity Error:', logData);
      break;
    case 'low':
      console.log('ℹ️ Low Severity Error:', logData);
      break;
  }
  
  // In production, send to error reporting service
  if (import.meta.env.PROD && severity !== 'low') {
    reportError(error, additional);
  }
}

/**
 * Report error to external service
 */
async function reportError(error: EnhancedAppError, additional?: any): Promise<void> {
  try {
    // This would integrate with services like Sentry, LogRocket, etc.
    await fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error,
        additional,
        timestamp: new Date().toISOString(),
        url: globalThis?.location?.href,
        userAgent: globalThis?.navigator?.userAgent
      })
    });
  } catch (reportingError) {
    console.error('Failed to report error:', reportingError);
  }
}

// ============================================================================
// Retry Logic with Enhanced Error Handling
// ============================================================================

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        const enhancedError = createError(ErrorType.NETWORK_ERROR, 'All retry attempts failed', {
          cause: lastError,
          details: { attempts: attempt + 1, max_retries: maxRetries },
          context: { action: 'retry_exhausted' }
        });
        throw enhancedError;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw createError(ErrorType.NETWORK_ERROR, 'Retry failed', {
    cause: lastError!,
    context: { action: 'retry_exhausted' }
  });
}

// ============================================================================
// Toast Notification Functions (Legacy + Enhanced)
// ============================================================================

/**
 * Show error toast notification
 */
export function showError(
  message: string,
  options: {
    title?: string;
    timeout?: number;
    dismissible?: boolean;
    details?: any;
  } = {}
): void {
  const toast: Toast = {
    id: crypto.randomUUID(),
    type: 'error',
    title: options.title,
    message,
    timeout: options.timeout ?? 5000,
    dismissible: options.dismissible ?? true
  };

  toasts.update((items) => [...items, toast]);

  if (toast.timeout && toast.timeout > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.timeout);
  }

  // Log error details for debugging
  if (options.details) {
    console.error('API Error Details:', options.details);
  }
}

/**
 * Show success toast notification
 */
export function showSuccess(
  message: string,
  options: {
    title?: string;
    timeout?: number;
    dismissible?: boolean;
  } = {}
): void {
  const toast: Toast = {
    id: crypto.randomUUID(),
    type: 'success',
    title: options.title,
    message,
    timeout: options.timeout ?? 3000,
    dismissible: options.dismissible ?? true
  };

  toasts.update((items) => [...items, toast]);

  if (toast.timeout && toast.timeout > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.timeout);
  }
}

/**
 * Show warning toast notification
 */
export function showWarning(
  message: string,
  options: {
    title?: string;
    timeout?: number;
    dismissible?: boolean;
  } = {}
): void {
  const toast: Toast = {
    id: crypto.randomUUID(),
    type: 'warning',
    title: options.title,
    message,
    timeout: options.timeout ?? 4000,
    dismissible: options.dismissible ?? true
  };

  toasts.update((items) => [...items, toast]);

  if (toast.timeout && toast.timeout > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.timeout);
  }
}

/**
 * Show info toast notification
 */
export function showInfo(
  message: string,
  options: {
    title?: string;
    timeout?: number;
    dismissible?: boolean;
  } = {}
): void {
  const toast: Toast = {
    id: crypto.randomUUID(),
    type: 'info',
    title: options.title,
    message,
    timeout: options.timeout ?? 4000,
    dismissible: options.dismissible ?? true
  };

  toasts.update((items) => [...items, toast]);

  if (toast.timeout && toast.timeout > 0) {
    setTimeout(() => {
      removeToast(toast.id);
    }, toast.timeout);
  }
}

/**
 * Show toast with custom actions
 */
export function showToastWithActions(
  message: string,
  type: Toast['type'],
  actions: ToastAction[],
  options: {
    title?: string;
    timeout?: number;
    dismissible?: boolean;
  } = {}
): void {
  const toast: Toast = {
    id: crypto.randomUUID(),
    type,
    title: options.title,
    message,
    timeout: options.timeout ?? 0, // Don't auto-dismiss with actions
    dismissible: options.dismissible ?? true,
    actions
  };

  toasts.update((items) => [...items, toast]);
}

/**
 * Remove specific toast
 */
export function removeToast(id: string): void {
  toasts.update((items) => items.filter((item) => item.id !== id));
}

/**
 * Clear all toasts
 */
export function clearToasts(): void {
  toasts.set([]);
}

// ============================================================================
// Enhanced API Call Handlers
// ============================================================================

/**
 * Utility function to handle async operations with proper error handling
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: {
    successMessage?: string;
    errorMessage?: string;
    showSuccessToast?: boolean;
    showErrorToast?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
  } = {}
): Promise<T | null> {
  try {
    const response = await apiCall();

    if (response.success && response.data !== null) {
      // Handle success
      if (options.showSuccessToast && options.successMessage) {
        showSuccess(options.successMessage);
      }

      if (options.onSuccess) {
        options.onSuccess(response.data);
      }

      return response.data;
    } else {
      // Handle API error
      const error = ApiErrorHandler.handle(response);

      if (options.showErrorToast) {
        const message = options.errorMessage || error.message;
        showError(message, {
          title: ApiErrorHandler.getErrorTitle(error.status),
          details: error.details
        });
      }

      if (options.onError) {
        options.onError(error);
      }

      return null;
    }
  } catch (err) {
    // Handle unexpected errors
    const message = options.errorMessage || 'An unexpected error occurred';

    if (options.showErrorToast) {
      showError(message);
    }

    console.error('Unexpected error:', err);

    if (options.onError) {
      options.onError({
        message,
        status: 500,
        details: err
      });
    }

    return null;
  }
}

/**
 * Enhanced API call handler with EnhancedAppError support
 */
export async function handleEnhancedApiCall<T>(
  apiCall: () => Promise<T>,
  context?: {
    action?: string;
    component?: string;
    user?: UserContext;
  }
): Promise<{ data: T; error: null } | { data: null; error: EnhancedAppError }> {
  try {
    const data = await apiCall();
    return { data, error: null };
  } catch (err) {
    const error = err instanceof Error 
      ? createError(ErrorType.API_ERROR, err.message, {
          cause: err,
          context: {
            action: context?.action,
            component: context?.component,
            user_id: context?.user?.id,
            route: globalThis?.location?.pathname
          }
        })
      : createError(ErrorType.UNKNOWN_ERROR, 'Unknown error occurred', {
          details: err,
          context
        });
    
    logError(error);
    return { data: null, error };
  }
}

/**
 * Retry utility for failed API calls
 */
export async function retryApiCall<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<ApiResponse<T>> {
  let lastError: ApiResponse<T>;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await apiCall();

    if (response.success) {
      return response;
    }

    lastError = response;

    // Don't retry on client errors (4xx), only server errors (5xx)
    if (response.status < 500) {
      break;
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }

  return lastError!;
}

/**
 * Debounced error handler to prevent spam
 */
const errorDebounceMap = new Map<string, number>();

export function debouncedShowError(
  message: string,
  debounceKey: string,
  debounceTime: number = 2000,
  options?: Parameters<typeof showError>[1]
): void {
  const now = Date.now();
  const lastShown = errorDebounceMap.get(debounceKey) || 0;

  if (now - lastShown > debounceTime) {
    showError(message, options);
    errorDebounceMap.set(debounceKey, now);
  }
}

// ============================================================================
// Form Error Helpers
// ============================================================================

/**
 * Extract field errors from validation error
 */
export function extractFieldErrors(error: EnhancedAppError): Record<string, string> {
  if (error.type !== ErrorType.VALIDATION_ERROR || !error.details?.validation_errors) {
    return {};
  }
  
  const fieldErrors: Record<string, string> = {};
  
  for (const validationError of error.details.validation_errors) {
    fieldErrors[validationError.field] = validationError.message;
  }
  
  return fieldErrors;
}

/**
 * Create form error from validation errors
 */
export function createFormError(
  validationErrors: ValidationError[]
): { message: string; fieldErrors: Record<string, string> } {
  const error = createValidationError(
    'Please correct the following errors:',
    validationErrors
  );
  
  return {
    message: error.message,
    fieldErrors: extractFieldErrors(error)
  };
}

// ============================================================================
// Global Error Handler Setup
// ============================================================================

/**
 * Handle unhandled errors globally
 */
export function setupGlobalErrorHandler(): void {
  if (typeof globalThis === 'undefined' || typeof window === 'undefined') return;
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = createError(ErrorType.SYSTEM_ERROR, 'Unhandled promise rejection', {
      cause: event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      context: { 
        component: 'global',
        action: 'unhandled_promise_rejection' 
      }
    });
    
    logError(error);
    event.preventDefault();
  });
  
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = createError(ErrorType.SYSTEM_ERROR, 'Uncaught error', {
      cause: event.error || new Error(event.message),
      context: {
        component: 'global',
        action: 'uncaught_error'
      }
    });
    
    logError(error);
  });
}

// ============================================================================
// Constants & Presets
// ============================================================================

export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network connection problem. Please check your internet connection.',
  AUTH_REQUIRED: 'Please sign in to continue.',
  ACCESS_DENIED: 'You don\'t have permission to perform this action.',
  VALIDATION_FAILED: 'Please check your input and try again.',
  NOT_FOUND: 'The requested item could not be found.',
  SERVER_ERROR: 'Server is temporarily unavailable. Please try again later.'
} as const;

export const RETRY_DELAYS = {
  SHORT: 1000,    // 1 second
  MEDIUM: 5000,   // 5 seconds
  LONG: 30000     // 30 seconds
} as const;

// Initialize global error handling
if (typeof window !== 'undefined') {
  setupGlobalErrorHandler();
}