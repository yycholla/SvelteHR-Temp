import { writable } from 'svelte/store';
import type { ApiResponse, ApiError } from '../api/types';

// Toast notification types
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
   * Get field-specific error message
   */
  static getFieldError(fieldErrors: Record<string, string[]> | undefined, field: string): string | undefined {
    return fieldErrors?.[field]?.[0];
  }

  /**
   * Get all field errors as a formatted string
   */
  static formatFieldErrors(fieldErrors: Record<string, string[]>): string {
    const errors: string[] = [];
    
    Object.entries(fieldErrors).forEach(([field, messages]) => {
      const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      messages.forEach(message => {
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

/**
 * Toast notification functions
 */

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
  
  toasts.update(items => [...items, toast]);
  
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
  
  toasts.update(items => [...items, toast]);
  
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
  
  toasts.update(items => [...items, toast]);
  
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
  
  toasts.update(items => [...items, toast]);
  
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
  
  toasts.update(items => [...items, toast]);
}

/**
 * Remove specific toast
 */
export function removeToast(id: string): void {
  toasts.update(items => items.filter(item => item.id !== id));
}

/**
 * Clear all toasts
 */
export function clearToasts(): void {
  toasts.set([]);
}

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
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
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