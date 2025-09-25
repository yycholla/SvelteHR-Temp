/**
 * Retry Handler Utilities
 * SvelteHR GraphQL Integration Error Resolution
 *
 * Provides sophisticated retry logic for GraphQL operations with:
 * - Exponential backoff with jitter
 * - Configurable retry conditions
 * - Integration with Svelte component lifecycle
 * - Coordination with URQL retry exchange
 * - User feedback and progress tracking
 */

import type { ErrorResponse } from '$lib/types/graphql-contracts';
import { GRAPHQL_OPERATION_CONSTANTS } from '$lib/types/graphql-contracts';

// =============================================================================
// Core Retry Types
// =============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed';
  jitter: boolean;
  retryConditions: RetryCondition[];
  onRetryAttempt?: (attempt: number, delay: number, error: ErrorResponse) => void;
  onMaxAttemptsReached?: (finalError: ErrorResponse) => void;
  onRetrySuccess?: (attempt: number) => void;
}

export type RetryCondition = (error: ErrorResponse, attempt: number) => boolean;

export interface RetryState {
  currentAttempt: number;
  totalAttempts: number;
  isRetrying: boolean;
  lastError: ErrorResponse | null;
  nextRetryAt: Date | null;
  retryHistory: RetryAttempt[];
}

export interface RetryAttempt {
  attempt: number;
  timestamp: Date;
  error: ErrorResponse;
  delay: number;
  successful: boolean;
}

// =============================================================================
// Default Retry Configurations
// =============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: GRAPHQL_OPERATION_CONSTANTS.MAX_RETRY_ATTEMPTS,
  baseDelayMs: 1000,
  maxDelayMs: 5000,
  backoffStrategy: 'exponential',
  jitter: true,
  retryConditions: [
    // Retry network errors
    (error) => error.type === 'network',

    // Retry timeout errors
    (error) => error.type === 'timeout',

    // Retry server errors
    (error) => error.type === 'graphql' && error.severity === 'critical',

    // Retry rate limit errors (with delay)
    (error) => error.retryAfter !== undefined,
  ],
};

export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxAttempts: 5,
  baseDelayMs: 500,
  retryConditions: [
    ...DEFAULT_RETRY_CONFIG.retryConditions,
    // Also retry medium severity GraphQL errors
    (error) => error.type === 'graphql' && error.severity === 'medium',
  ],
};

export const CONSERVATIVE_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxAttempts: 1,
  retryConditions: [
    // Only retry clear network issues
    (error) => error.type === 'network',
    (error) => error.type === 'timeout',
  ],
};

// =============================================================================
// Delay Calculation
// =============================================================================

export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig,
  retryAfter?: number
): number {
  // Respect server-provided retry delay (e.g., rate limiting)
  if (retryAfter) {
    return retryAfter * 1000; // Convert to milliseconds
  }

  let delay: number;

  switch (config.backoffStrategy) {
    case 'exponential':
      delay = Math.min(config.baseDelayMs * Math.pow(2, attempt - 1), config.maxDelayMs);
      break;

    case 'linear':
      delay = Math.min(config.baseDelayMs * attempt, config.maxDelayMs);
      break;

    case 'fixed':
    default:
      delay = config.baseDelayMs;
      break;
  }

  // Add jitter to prevent thundering herd
  if (config.jitter) {
    const jitterRange = 0.1; // ±10%
    const jitterAmount = delay * jitterRange * (Math.random() * 2 - 1);
    delay = Math.max(100, delay + jitterAmount); // Minimum 100ms
  }

  return Math.floor(delay);
}

// =============================================================================
// Retry Decision Logic
// =============================================================================

export function shouldRetry(
  error: ErrorResponse,
  attempt: number,
  config: RetryConfig
): boolean {
  // Check maximum attempts
  if (attempt >= config.maxAttempts) {
    return false;
  }

  // Check if error is marked as non-retryable
  if (!error.isRetryable) {
    return false;
  }

  // Check custom retry conditions
  return config.retryConditions.some(condition => condition(error, attempt));
}

// =============================================================================
// Retry Handler Class
// =============================================================================

export class RetryHandler {
  private config: RetryConfig;
  private state: RetryState;
  private timeoutId: number | null = null;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.state = {
      currentAttempt: 0,
      totalAttempts: 0,
      isRetrying: false,
      lastError: null,
      nextRetryAt: null,
      retryHistory: [],
    };
  }

  /**
   * Execute an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = 'unknown'
  ): Promise<T> {
    this.state.currentAttempt = 0;
    this.state.isRetrying = false;
    this.state.retryHistory = [];

    return this.attemptOperation(operation, operationName);
  }

  /**
   * Schedule a retry for a failed operation
   */
  scheduleRetry<T>(
    operation: () => Promise<T>,
    error: ErrorResponse,
    operationName: string = 'unknown'
  ): Promise<T> | null {
    const attempt = this.state.currentAttempt + 1;

    if (!shouldRetry(error, attempt, this.config)) {
      // Call max attempts callback
      if (this.config.onMaxAttemptsReached) {
        this.config.onMaxAttemptsReached(error);
      }
      return null;
    }

    this.state.currentAttempt = attempt;
    this.state.isRetrying = true;
    this.state.lastError = error;

    const delay = calculateRetryDelay(attempt, this.config, error.retryAfter);
    this.state.nextRetryAt = new Date(Date.now() + delay);

    // Record retry attempt
    this.state.retryHistory.push({
      attempt,
      timestamp: new Date(),
      error,
      delay,
      successful: false,
    });

    // Call retry callback
    if (this.config.onRetryAttempt) {
      this.config.onRetryAttempt(attempt, delay, error);
    }

    return new Promise((resolve, reject) => {
      this.timeoutId = window.setTimeout(async () => {
        try {
          const result = await this.attemptOperation(operation, operationName);
          resolve(result);
        } catch (retryError) {
          reject(retryError);
        }
      }, delay);
    });
  }

  /**
   * Cancel any pending retry
   */
  cancel(): void {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.state.isRetrying = false;
    this.state.nextRetryAt = null;
  }

  /**
   * Reset retry state
   */
  reset(): void {
    this.cancel();
    this.state = {
      currentAttempt: 0,
      totalAttempts: 0,
      isRetrying: false,
      lastError: null,
      nextRetryAt: null,
      retryHistory: [],
    };
  }

  /**
   * Get current retry state
   */
  getState(): Readonly<RetryState> {
    return { ...this.state };
  }

  /**
   * Update retry configuration
   */
  updateConfig(updates: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  private async attemptOperation<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      const result = await operation();

      // Mark success in retry history if this was a retry
      if (this.state.currentAttempt > 0) {
        const lastAttempt = this.state.retryHistory[this.state.retryHistory.length - 1];
        if (lastAttempt) {
          lastAttempt.successful = true;
        }

        // Call success callback
        if (this.config.onRetrySuccess) {
          this.config.onRetrySuccess(this.state.currentAttempt);
        }
      }

      this.state.isRetrying = false;
      this.state.totalAttempts = this.state.currentAttempt;

      return result;
    } catch (error) {
      // This will be handled by the calling code
      throw error;
    }
  }
}

// =============================================================================
// Svelte Integration Helpers
// =============================================================================

export interface RetryHandlerSvelteState {
  isRetrying: boolean;
  currentAttempt: number;
  maxAttempts: number;
  timeToNextRetry: number;
  canRetry: boolean;
  retryProgress: number; // 0-100%
}

/**
 * Create a retry handler for Svelte components
 */
export function createSvelteRetryHandler(
  config: Partial<RetryConfig> = {}
): {
  handler: RetryHandler;
  getState: () => RetryHandlerSvelteState;
  retry: <T>(operation: () => Promise<T>, error: ErrorResponse) => Promise<T | null>;
} {
  const handler = new RetryHandler(config);

  const getState = (): RetryHandlerSvelteState => {
    const state = handler.getState();
    const now = Date.now();
    const timeToNextRetry = state.nextRetryAt
      ? Math.max(0, state.nextRetryAt.getTime() - now)
      : 0;

    return {
      isRetrying: state.isRetrying,
      currentAttempt: state.currentAttempt,
      maxAttempts: config.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts,
      timeToNextRetry,
      canRetry: state.currentAttempt < (config.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts),
      retryProgress: state.currentAttempt > 0
        ? (state.currentAttempt / (config.maxAttempts || DEFAULT_RETRY_CONFIG.maxAttempts)) * 100
        : 0,
    };
  };

  const retry = async <T>(
    operation: () => Promise<T>,
    error: ErrorResponse
  ): Promise<T | null> => {
    return handler.scheduleRetry(operation, error);
  };

  return { handler, getState, retry };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create a retry wrapper for GraphQL operations
 */
export function withRetry<TVariables, TData>(
  operation: (variables: TVariables) => Promise<TData>,
  config: Partial<RetryConfig> = {}
): (variables: TVariables) => Promise<TData> {
  const handler = new RetryHandler(config);

  return async (variables: TVariables): Promise<TData> => {
    return handler.execute(() => operation(variables));
  };
}

/**
 * Create retry conditions for specific error types
 */
export const RetryConditions = {
  networkErrors: (error: ErrorResponse): boolean => error.type === 'network',
  timeoutErrors: (error: ErrorResponse): boolean => error.type === 'timeout',
  serverErrors: (error: ErrorResponse): boolean =>
    error.type === 'graphql' && error.severity === 'critical',
  retryableErrors: (error: ErrorResponse): boolean => error.isRetryable,
  rateLimitErrors: (error: ErrorResponse): boolean => error.retryAfter !== undefined,

  // Combine multiple conditions with OR logic
  any: (...conditions: RetryCondition[]): RetryCondition =>
    (error, attempt) => conditions.some(condition => condition(error, attempt)),

  // Combine multiple conditions with AND logic
  all: (...conditions: RetryCondition[]): RetryCondition =>
    (error, attempt) => conditions.every(condition => condition(error, attempt)),
};

// =============================================================================
// Debug Helpers
// =============================================================================

export function logRetryAttempt(
  attempt: number,
  delay: number,
  error: ErrorResponse
): void {
  if (import.meta.env.DEV) {
    console.group(`🔄 Retry Attempt ${attempt}`);
    console.log('Delay:', `${delay}ms`);
    console.log('Error:', error.userMessage);
    console.log('Error Type:', error.type);
    console.log('Is Retryable:', error.isRetryable);
    console.groupEnd();
  }
}

export function logRetrySuccess(attempt: number): void {
  if (import.meta.env.DEV) {
    console.log(`✅ Retry Success after ${attempt} attempts`);
  }
}

export function logMaxAttemptsReached(error: ErrorResponse): void {
  if (import.meta.env.DEV) {
    console.group(`❌ Max Retry Attempts Reached`);
    console.error('Final Error:', error.userMessage);
    console.error('Error Details:', error);
    console.groupEnd();
  }
}