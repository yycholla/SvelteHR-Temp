/**
 * T022: ErrorResponse Entity Model
 *
 * Implements the ErrorResponse entity with comprehensive error classification and user-friendly messaging.
 * Integrates with existing graphql-error-handling utilities for consistent error treatment.
 */

import type {
	ErrorResponse as ErrorResponseContract,
	ErrorSeverity,
	ErrorType
} from '$lib/types/graphql-contracts';

/**
 * Suggested actions enumeration for error resolution
 */
export enum SuggestedAction {
	RETRY_OPERATION = 'retry_operation',
	REFRESH_PAGE = 'refresh_page',
	CHECK_CONNECTION = 'check_connection',
	VERIFY_CREDENTIALS = 'verify_credentials',
	CONTACT_ADMIN = 'contact_admin',
	REDIRECT_TO_LOGIN = 'redirect_to_login',
	SHOW_LIMITED_VIEW = 'show_limited_view',
	FIX_HIERARCHY = 'fix_hierarchy',
	MERGE_CHANGES = 'merge_changes',
	UPGRADE_PERMISSIONS = 'upgrade_permissions'
}

/**
 * Technical error details for debugging and monitoring
 */
export interface TechnicalDetails {
	stack?: string;
	statusCode?: number;
	graphqlErrors?: Array<{
		message: string;
		locations?: Array<{ line: number; column: number }>;
		path?: Array<string | number>;
		extensions?: Record<string, unknown>;
	}>;
	networkError?: {
		name: string;
		message: string;
		statusCode?: number;
		response?: unknown;
	};
	operationName?: string;
	variables?: Record<string, unknown>;
	requestId?: string;
	timestamp: string;
	userAgent?: string;
	sessionId?: string;
}

/**
 * ErrorResponse entity model implementing comprehensive error handling
 */
export class ErrorResponse {
	readonly id: string;
	readonly type: ErrorType;
	readonly originalError: unknown;
	readonly userMessage: string;
	readonly technicalDetails: TechnicalDetails;
	readonly suggestedActions: SuggestedAction[];
	readonly timestamp: string;
	readonly isRetryable: boolean;
	readonly severity: ErrorSeverity;

	// Additional metadata
	readonly context: Record<string, unknown>;
	readonly correlationId?: string;
	readonly userId?: string;

	/**
	 * Creates a new ErrorResponse instance
	 *
	 * @param config - Configuration object for the error response
	 * @throws {Error} When validation rules are violated
	 */
	constructor(config: {
		id?: string;
		type: ErrorType;
		originalError: unknown;
		userMessage?: string;
		technicalDetails?: Partial<TechnicalDetails>;
		suggestedActions?: SuggestedAction[];
		severity?: ErrorSeverity;
		isRetryable?: boolean;
		context?: Record<string, unknown>;
		correlationId?: string;
		userId?: string;
	}) {
		// Validation Rules (as specified in T022)
		this.validateConfig(config);

		this.id = config.id || this.generateId();
		this.type = config.type;
		this.originalError = config.originalError;
		this.timestamp = new Date().toISOString();

		// Generate user-friendly message if not provided
		this.userMessage =
			config.userMessage || this.generateUserMessage(config.type, config.originalError);

		// Ensure at least one suggested action
		this.suggestedActions = config.suggestedActions?.length
			? config.suggestedActions
			: this.getDefaultSuggestedActions(config.type);

		// Build technical details
		this.technicalDetails = this.buildTechnicalDetails(
			config.originalError,
			config.technicalDetails
		);

		// Determine severity based on error type if not provided
		this.severity = config.severity || this.determineSeverity(config.type);

		// Determine if retryable based on error type if not provided
		this.isRetryable = config.isRetryable ?? this.determineRetryability(config.type);

		// Additional context
		this.context = config.context || {};
		this.correlationId = config.correlationId;
		this.userId = config.userId;
	}

	/**
	 * Whether this error should be displayed to the user
	 */
	get shouldDisplayToUser(): boolean {
		return this.severity !== 'low' && this.userMessage.length > 0;
	}

	/**
	 * Whether this error requires immediate attention
	 */
	get requiresImmediateAction(): boolean {
		return (
			this.severity === 'critical' ||
			this.suggestedActions.includes(SuggestedAction.CONTACT_ADMIN) ||
			this.suggestedActions.includes(SuggestedAction.REDIRECT_TO_LOGIN)
		);
	}

	/**
	 * Primary suggested action for UI treatment
	 */
	get primaryAction(): SuggestedAction {
		return this.suggestedActions[0] || SuggestedAction.RETRY_OPERATION;
	}

	/**
	 * Convert to contract-compatible format
	 */
	toContract(): ErrorResponseContract {
		return {
			id: this.id,
			type: this.type as any,
			originalError: this.originalError,
			userMessage: this.userMessage,
			technicalDetails: JSON.stringify(this.technicalDetails),
			suggestedActions: this.suggestedActions.map((action) => ({
				label: action,
				action,
				isPrimary: action === this.primaryAction
			})),
			timestamp: new Date(this.timestamp),
			isRetryable: this.isRetryable,
			severity: this.severity as any,
			operationId: this.technicalDetails.operationName || this.id,
			retryAfter: undefined
		};
	}

	/**
	 * Convert to detailed logging format
	 */
	toLogEntry(): Record<string, unknown> {
		return {
			id: this.id,
			type: this.type,
			severity: this.severity,
			userMessage: this.userMessage,
			isRetryable: this.isRetryable,
			suggestedActions: this.suggestedActions,
			timestamp: this.timestamp,
			technicalDetails: this.technicalDetails,
			context: this.context,
			correlationId: this.correlationId,
			userId: this.userId,
			// Sanitized original error (remove sensitive data)
			originalErrorType:
				this.originalError instanceof Error
					? this.originalError.constructor.name
					: typeof this.originalError
		};
	}

	/**
	 * Convert to user-facing display format
	 */
	toUserDisplay(): {
		message: string;
		actions: Array<{
			label: string;
			action: SuggestedAction;
			primary: boolean;
		}>;
		severity: ErrorSeverity;
		canDismiss: boolean;
	} {
		return {
			message: this.userMessage,
			actions: this.suggestedActions.map((action, index) => ({
				label: this.getActionLabel(action),
				action,
				primary: index === 0
			})),
			severity: this.severity,
			canDismiss: this.severity !== 'critical'
		};
	}

	/**
	 * Create a retry-specific error response
	 */
	createRetryError(attempt: number): ErrorResponse {
		const retryMessage =
			attempt >= 3
				? `${this.userMessage} Maximum retry attempts reached.`
				: `${this.userMessage} Retrying... (attempt ${attempt}/3)`;

		return new ErrorResponse({
			type: this.type,
			originalError: this.originalError,
			userMessage: retryMessage,
			suggestedActions:
				attempt >= 3
					? [SuggestedAction.CONTACT_ADMIN, SuggestedAction.REFRESH_PAGE]
					: this.suggestedActions,
			severity: attempt >= 3 ? 'high' : this.severity,
			isRetryable: attempt < 3,
			context: {
				...this.context,
				isRetry: true,
				attemptNumber: attempt,
				originalErrorId: this.id
			},
			correlationId: this.correlationId,
			userId: this.userId
		});
	}

	/**
	 * Validate configuration according to T022 requirements
	 */
	private validateConfig(config: {
		type: ErrorType;
		originalError: unknown;
		userMessage?: string;
		suggestedActions?: SuggestedAction[];
	}): void {
		// Validation Rule: userMessage (non-empty, user-friendly)
		if (config.userMessage?.trim().length === 0) {
			throw new Error('userMessage must be non-empty when provided');
		}

		// Validation Rule: suggestedActions (≥1 action)
		if (config.suggestedActions?.length === 0) {
			throw new Error('suggestedActions must contain at least one action when provided');
		}

		// Validation Rule: timestamp (valid ISO) - enforced by constructor
		// Validation Rule: severity (determines UI treatment) - handled by determineSeverity
	}

	/**
	 * Generate user-friendly message based on error type
	 */
	private generateUserMessage(type: ErrorType, originalError: unknown): string {
		const errorMessage =
			originalError instanceof Error ? originalError.message : String(originalError);

		switch (type) {
			case 'network':
				return 'Unable to connect to the server. Please check your internet connection and try again.';

			case 'authentication':
				return 'Your session has expired. Please sign in again to continue.';

			case 'permission':
				return "You don't have permission to access this information. Contact your administrator if you believe this is an error.";

			case 'validation':
				return errorMessage.includes('validation')
					? `Please check your input: ${errorMessage}`
					: 'The information provided is not valid. Please review and try again.';

			case 'timeout':
				return 'The request is taking longer than expected. Please try again in a moment.';

			case 'graphql':
				return 'We encountered an issue processing your request. Please try again or contact support if the problem persists.';

			default:
				return 'An unexpected error occurred. Please try again or contact support if the problem continues.';
		}
	}

	/**
	 * Get default suggested actions for error type
	 */
	private getDefaultSuggestedActions(type: ErrorType): SuggestedAction[] {
		switch (type) {
			case 'network':
				return [SuggestedAction.CHECK_CONNECTION, SuggestedAction.RETRY_OPERATION];

			case 'authentication':
				return [SuggestedAction.REDIRECT_TO_LOGIN, SuggestedAction.VERIFY_CREDENTIALS];

			case 'permission':
				return [SuggestedAction.CONTACT_ADMIN, SuggestedAction.SHOW_LIMITED_VIEW];

			case 'validation':
				return [SuggestedAction.RETRY_OPERATION];

			case 'timeout':
				return [SuggestedAction.RETRY_OPERATION, SuggestedAction.REFRESH_PAGE];

			case 'graphql':
				return [SuggestedAction.RETRY_OPERATION, SuggestedAction.CONTACT_ADMIN];

			default:
				return [SuggestedAction.RETRY_OPERATION];
		}
	}

	/**
	 * Build technical details from original error and config
	 */
	private buildTechnicalDetails(
		originalError: unknown,
		configDetails?: Partial<TechnicalDetails>
	): TechnicalDetails {
		const details: TechnicalDetails = {
			timestamp: new Date().toISOString(),
			...configDetails
		};

		if (originalError instanceof Error) {
			details.stack = originalError.stack;
		}

		// Extract GraphQL errors if present
		if (originalError && typeof originalError === 'object') {
			const error = originalError as any;

			if (error.graphQLErrors?.length > 0) {
				details.graphqlErrors = error.graphQLErrors.map((gqlError: any) => ({
					message: gqlError.message,
					locations: gqlError.locations,
					path: gqlError.path,
					extensions: gqlError.extensions
				}));
			}

			if (error.networkError) {
				details.networkError = {
					name: error.networkError.name || 'NetworkError',
					message: error.networkError.message || 'Network request failed',
					statusCode: error.networkError.statusCode,
					response: error.networkError.response
				};
			}
		}

		return details;
	}

	/**
	 * Determine severity based on error type
	 */
	private determineSeverity(type: ErrorType): ErrorSeverity {
		switch (type) {
			case 'authentication':
				return 'critical';

			case 'permission':
			case 'network':
				return 'high';

			case 'validation':
			case 'timeout':
				return 'medium';

			case 'graphql':
				return 'low';

			default:
				return 'medium';
		}
	}

	/**
	 * Determine if error is retryable based on type
	 */
	private determineRetryability(type: ErrorType): boolean {
		switch (type) {
			case 'network':
			case 'timeout':
			case 'graphql':
				return true;

			case 'authentication':
			case 'permission':
			case 'validation':
				return false;

			default:
				return false;
		}
	}

	/**
	 * Get user-friendly label for action
	 */
	private getActionLabel(action: SuggestedAction): string {
		switch (action) {
			case SuggestedAction.RETRY_OPERATION:
				return 'Try Again';
			case SuggestedAction.REFRESH_PAGE:
				return 'Refresh Page';
			case SuggestedAction.CHECK_CONNECTION:
				return 'Check Connection';
			case SuggestedAction.VERIFY_CREDENTIALS:
				return 'Sign In Again';
			case SuggestedAction.CONTACT_ADMIN:
				return 'Contact Support';
			case SuggestedAction.REDIRECT_TO_LOGIN:
				return 'Sign In';
			case SuggestedAction.SHOW_LIMITED_VIEW:
				return 'Continue with Limited Access';
			case SuggestedAction.FIX_HIERARCHY:
				return 'Fix Organization Structure';
			case SuggestedAction.MERGE_CHANGES:
				return 'Merge Changes';
			case SuggestedAction.UPGRADE_PERMISSIONS:
				return 'Request Access';
			default:
				return 'Continue';
		}
	}

	/**
	 * Generate unique identifier for the error
	 */
	private generateId(): string {
		const timestamp = Date.now().toString(36);
		const random = Math.random().toString(36).substr(2, 9);
		return `err_${timestamp}_${random}`;
	}
}

/**
 * Factory function to create ErrorResponse from various error sources
 */
export function createErrorResponse(
	error: unknown,
	config?: {
		type?: ErrorType;
		userMessage?: string;
		context?: Record<string, unknown>;
		userId?: string;
		correlationId?: string;
	}
): ErrorResponse {
	// Auto-detect error type if not provided
	const type = config?.type || detectErrorType(error);

	return new ErrorResponse({
		type,
		originalError: error,
		userMessage: config?.userMessage,
		context: config?.context,
		userId: config?.userId,
		correlationId: config?.correlationId
	});
}

/**
 * Auto-detect error type from error object
 */
function detectErrorType(error: unknown): ErrorType {
	if (!error) return 'graphql';

	const errorString =
		error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

	if (errorString.includes('timeout') || errorString.includes('timed out')) {
		return 'timeout';
	}

	if (
		errorString.includes('network') ||
		errorString.includes('fetch') ||
		errorString.includes('connection')
	) {
		return 'network';
	}

	if (
		errorString.includes('unauthorized') ||
		errorString.includes('authentication') ||
		errorString.includes('token')
	) {
		return 'authentication';
	}

	if (
		errorString.includes('permission') ||
		errorString.includes('forbidden') ||
		errorString.includes('access denied')
	) {
		return 'permission';
	}

	if (
		errorString.includes('validation') ||
		errorString.includes('invalid') ||
		errorString.includes('required')
	) {
		return 'validation';
	}

	return 'graphql';
}

/**
 * Type guard to check if an object is an ErrorResponse
 */
export function isErrorResponse(obj: unknown): obj is ErrorResponse {
	return obj instanceof ErrorResponse;
}
