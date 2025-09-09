/**
 * Error handling utilities for MountainHR
 * Provides consistent error handling, reporting, and user feedback
 */

export interface ErrorReport {
	id: string;
	message: string;
	stack?: string;
	url: string;
	userAgent: string;
	timestamp: string;
	userId?: string;
	sessionId?: string;
	context?: Record<string, any>;
	severity: ErrorSeverity;
	category: ErrorCategory;
	retryCount?: number;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorCategory = 'network' | 'authentication' | 'validation' | 'permission' | 'unknown' | 'system';

export interface ErrorHandlerOptions {
	showToast?: boolean;
	reportToService?: boolean;
	logToConsole?: boolean;
	context?: Record<string, any>;
}

/**
 * Enhanced Error class with additional context
 */
export class MountainHRError extends Error {
	public readonly severity: ErrorSeverity;
	public readonly category: ErrorCategory;
	public readonly context?: Record<string, any>;
	public readonly timestamp: string;
	public readonly retryable: boolean;

	constructor(
		message: string,
		severity: ErrorSeverity = 'medium',
		category: ErrorCategory = 'unknown',
		context?: Record<string, any>,
		retryable: boolean = true
	) {
		super(message);
		this.name = 'MountainHRError';
		this.severity = severity;
		this.category = category;
		this.context = context;
		this.timestamp = new Date().toISOString();
		this.retryable = retryable;
	}
}

/**
 * Error classification utility
 */
export class ErrorClassifier {
	static classifyError(error: Error): { severity: ErrorSeverity; category: ErrorCategory } {
		const message = error.message.toLowerCase();
		const stack = error.stack?.toLowerCase() || '';

		// Network errors
		if (message.includes('fetch') || message.includes('network') || 
			message.includes('connection') || message.includes('timeout')) {
			return { severity: 'medium', category: 'network' };
		}

		// Authentication errors
		if (message.includes('unauthorized') || message.includes('authentication') || 
			message.includes('token') || message.includes('login')) {
			return { severity: 'high', category: 'authentication' };
		}

		// Permission errors
		if (message.includes('permission') || message.includes('forbidden') || 
			message.includes('access denied')) {
			return { severity: 'high', category: 'permission' };
		}

		// Validation errors
		if (message.includes('validation') || message.includes('invalid') || 
			message.includes('required') || message.includes('format')) {
			return { severity: 'low', category: 'validation' };
		}

		// System errors (critical)
		if (message.includes('cannot read') || message.includes('undefined') || 
			message.includes('null') || stack.includes('typeerror')) {
			return { severity: 'critical', category: 'system' };
		}

		return { severity: 'medium', category: 'unknown' };
	}

	static isRetryable(error: Error): boolean {
		const { category } = this.classifyError(error);
		
		// Network errors are usually retryable
		if (category === 'network') return true;
		
		// System errors might not be retryable
		if (category === 'system') return false;
		
		// Authentication and permission errors typically aren't retryable
		if (category === 'authentication' || category === 'permission') return false;
		
		// Validation errors aren't retryable without user input
		if (category === 'validation') return false;
		
		return true;
	}
}

/**
 * Error reporting service
 */
export class ErrorReporter {
	private static instance: ErrorReporter;
	private reportQueue: ErrorReport[] = [];
	private isOnline = navigator.onLine;
	private sessionId: string;

	constructor() {
		this.sessionId = this.generateSessionId();
		
		// Monitor online status
		window.addEventListener('online', () => {
			this.isOnline = true;
			this.flushQueue();
		});
		
		window.addEventListener('offline', () => {
			this.isOnline = false;
		});
	}

	static getInstance(): ErrorReporter {
		if (!ErrorReporter.instance) {
			ErrorReporter.instance = new ErrorReporter();
		}
		return ErrorReporter.instance;
	}

	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateErrorId(): string {
		return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	async reportError(
		error: Error, 
		context?: Record<string, any>,
		userId?: string
	): Promise<void> {
		const { severity, category } = ErrorClassifier.classifyError(error);
		
		const report: ErrorReport = {
			id: this.generateErrorId(),
			message: error.message,
			stack: error.stack,
			url: window.location.href,
			userAgent: navigator.userAgent,
			timestamp: new Date().toISOString(),
			userId,
			sessionId: this.sessionId,
			context,
			severity,
			category,
			retryCount: (error as any).retryCount || 0
		};

		// Store in local storage for offline scenarios
		this.storeErrorLocally(report);

		// Add to queue for reporting
		this.reportQueue.push(report);

		// Try to send immediately if online
		if (this.isOnline) {
			await this.flushQueue();
		}
	}

	private storeErrorLocally(report: ErrorReport): void {
		try {
			const storedErrors = JSON.parse(
				localStorage.getItem('mountainhr_error_reports') || '[]'
			);
			
			storedErrors.push(report);
			
			// Keep only the last 50 errors to prevent storage bloat
			if (storedErrors.length > 50) {
				storedErrors.splice(0, storedErrors.length - 50);
			}
			
			localStorage.setItem('mountainhr_error_reports', JSON.stringify(storedErrors));
		} catch (e) {
			console.error('Failed to store error report locally:', e);
		}
	}

	private async flushQueue(): Promise<void> {
		if (this.reportQueue.length === 0) return;

		const reports = [...this.reportQueue];
		this.reportQueue = [];

		try {
			// In a real application, this would send to an error tracking service
			// like Sentry, LogRocket, or a custom endpoint
			await fetch('/api/errors', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ reports })
			});

			console.log('Error reports sent successfully:', reports.length);
		} catch (e) {
			// If sending fails, add back to queue
			this.reportQueue.unshift(...reports);
			console.error('Failed to send error reports:', e);
		}
	}

	getStoredErrors(): ErrorReport[] {
		try {
			return JSON.parse(localStorage.getItem('mountainhr_error_reports') || '[]');
		} catch (e) {
			return [];
		}
	}

	clearStoredErrors(): void {
		localStorage.removeItem('mountainhr_error_reports');
	}
}

/**
 * Toast notification for errors
 */
export interface ErrorToast {
	show: (message: string, type: 'error' | 'warning' | 'info') => void;
}

let toastService: ErrorToast | null = null;

export function setToastService(service: ErrorToast): void {
	toastService = service;
}

/**
 * Global error handler
 */
export class GlobalErrorHandler {
	private reporter: ErrorReporter;
	private userId?: string;

	constructor() {
		this.reporter = ErrorReporter.getInstance();
		this.setupGlobalHandlers();
	}

	setUserId(id: string): void {
		this.userId = id;
	}

	private setupGlobalHandlers(): void {
		// Handle uncaught JavaScript errors
		window.addEventListener('error', (event) => {
			this.handleError(
				new Error(event.message),
				{
					filename: event.filename,
					lineno: event.lineno,
					colno: event.colno,
					type: 'uncaught-error'
				}
			);
		});

		// Handle unhandled promise rejections
		window.addEventListener('unhandledrejection', (event) => {
			const error = event.reason instanceof Error 
				? event.reason 
				: new Error(String(event.reason));
			
			this.handleError(error, {
				type: 'unhandled-promise-rejection'
			});
		});

		// Handle resource loading errors
		window.addEventListener('error', (event) => {
			if (event.target !== window) {
				this.handleError(
					new Error(`Resource failed to load: ${(event.target as any)?.src || 'Unknown'}`),
					{
						type: 'resource-error',
						tagName: (event.target as any)?.tagName,
						src: (event.target as any)?.src
					}
				);
			}
		}, true);
	}

	async handleError(
		error: Error,
		context?: Record<string, any>,
		options: ErrorHandlerOptions = {}
	): Promise<void> {
		const {
			showToast = true,
			reportToService = true,
			logToConsole = true,
			context: additionalContext
		} = options;

		const combinedContext = { ...context, ...additionalContext };

		// Log to console if enabled
		if (logToConsole) {
			console.error('Global error handler:', error);
			if (combinedContext) {
				console.error('Error context:', combinedContext);
			}
		}

		// Show toast notification if enabled
		if (showToast && toastService) {
			const { severity } = ErrorClassifier.classifyError(error);
			const userMessage = this.getUserFriendlyMessage(error);
			
			const toastType = severity === 'critical' || severity === 'high' ? 'error' : 'warning';
			toastService.show(userMessage, toastType);
		}

		// Report to service if enabled
		if (reportToService) {
			await this.reporter.reportError(error, combinedContext, this.userId);
		}
	}

	private getUserFriendlyMessage(error: Error): string {
		const { category } = ErrorClassifier.classifyError(error);

		switch (category) {
			case 'network':
				return 'Network connection error. Please check your internet connection.';
			case 'authentication':
				return 'Authentication error. Please log in again.';
			case 'permission':
				return 'You don\'t have permission to perform this action.';
			case 'validation':
				return 'Please check your input and try again.';
			case 'system':
				return 'A system error occurred. Please try again or contact support.';
			default:
				return 'An unexpected error occurred. Please try again.';
		}
	}
}

/**
 * Async error wrapper utility
 */
export async function withErrorHandling<T>(
	operation: () => Promise<T>,
	context?: Record<string, any>,
	options?: ErrorHandlerOptions
): Promise<T | null> {
	try {
		return await operation();
	} catch (error) {
		const globalHandler = new GlobalErrorHandler();
		await globalHandler.handleError(error as Error, context, options);
		return null;
	}
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
	operation: () => Promise<T>,
	maxAttempts: number = 3,
	baseDelay: number = 1000
): Promise<T> {
	let lastError: Error;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;
			
			// Don't retry non-retryable errors
			if (!ErrorClassifier.isRetryable(lastError)) {
				throw lastError;
			}

			// Don't wait after the last attempt
			if (attempt < maxAttempts) {
				const delay = baseDelay * Math.pow(2, attempt - 1);
				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError!;
}

/**
 * Initialize global error handling
 */
export function initializeErrorHandling(userId?: string): GlobalErrorHandler {
	const handler = new GlobalErrorHandler();
	if (userId) {
		handler.setUserId(userId);
	}
	return handler;
}

/**
 * Error boundary helpers for Svelte
 */
export function createErrorBoundary() {
	let hasError = false;
	let error: Error | null = null;

	return {
		get hasError() { return hasError; },
		get error() { return error; },
		
		catch(err: Error) {
			hasError = true;
			error = err;
			
			const globalHandler = new GlobalErrorHandler();
			globalHandler.handleError(err);
		},
		
		reset() {
			hasError = false;
			error = null;
		}
	};
}