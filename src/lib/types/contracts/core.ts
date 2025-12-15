// =============================================================================
// Core GraphQL Operation Types
// =============================================================================

export interface DataRequest<TVariables = any, TData = any> {
	id: string;
	operationName: string;
	variables: TVariables;
	userCredentials: UserSession;
	status: RequestStatus;
	retryAttempts: number;
	createdAt: Date;
	completedAt: Date | null;
	timeoutMs: number; // Maximum 5000ms
	cachePolicy?: 'cache-first' | 'cache-only' | 'network-only' | 'cache-and-network';
	cacheTtlMinutes?: number;
}

export type RequestStatus = 'pending' | 'loading' | 'success' | 'error' | 'timeout' | 'retrying';

export interface ErrorResponse {
	id: string;
	type: ErrorType;
	originalError: any;
	userMessage: string;
	technicalDetails: string;
	suggestedActions: ActionOption[];
	timestamp: Date;
	isRetryable: boolean;
	severity: ErrorSeverity;
	operationId: string;
	retryAfter?: number; // Seconds to wait before retry
}

export type ErrorType =
	| 'network'
	| 'graphql'
	| 'authentication'
	| 'permission'
	| 'timeout'
	| 'validation'
	| 'PERMISSION_ERROR'
	| 'VALIDATION_ERROR'
	| 'NETWORK_ERROR'
	| 'AUTHENTICATION_ERROR'
	| 'DATA_LOAD_ERROR'
	| 'TIMEOUT_ERROR'
	| 'SETTINGS_ERROR'
	| 'GRAPHQL_ERROR';

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ActionOption {
	label: string;
	action: string;
	isPrimary: boolean;
	parameters?: Record<string, any>;
}

export interface UserSession {
	id: string;
	userId: string;
	jwtToken: string;
	permissions: string[];
	roles: string[];
	isAuthenticated: boolean;
	expiresAt: Date;
	lastActivity: Date;
}

// =============================================================================
// Validation Constants
// =============================================================================

export const GRAPHQL_OPERATION_CONSTANTS = {
	MAX_TIMEOUT_MS: 5000,
	MAX_RETRY_ATTEMPTS: 3,
	MAX_CACHE_TTL_MINUTES: 30,
	DEFAULT_PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100
} as const;

// =============================================================================
// Error Code Mappings
// =============================================================================

export const GRAPHQL_ERROR_CODES = {
	NETWORK_ERROR: 'NETWORK_ERROR',
	TIMEOUT_ERROR: 'TIMEOUT_ERROR',
	AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
	AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
	SERVER_ERROR: 'SERVER_ERROR',
	UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type GraphQLErrorCode = (typeof GRAPHQL_ERROR_CODES)[keyof typeof GRAPHQL_ERROR_CODES];

// =============================================================================
// Type Guards for Runtime Validation
// =============================================================================

export function isErrorResponse(value: any): value is ErrorResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof value.id === 'string' &&
		typeof value.userMessage === 'string' &&
		Array.isArray(value.suggestedActions)
	);
}

export function hasValidUserSession(session: any): session is UserSession {
	return (
		typeof session === 'object' &&
		session !== null &&
		typeof session.id === 'string' &&
		typeof session.userId === 'string' &&
		typeof session.isAuthenticated === 'boolean' &&
		Array.isArray(session.permissions)
	);
}
