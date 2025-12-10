/**
 * GraphQL Operation Contracts for SvelteHR
 *
 * Standardized TypeScript interfaces for GraphQL operations with comprehensive
 * error handling, retry logic, and performance monitoring. These contracts
 * ensure consistent parameter handling across all GraphQL operations.
 *
 * Features:
 * - 5-second timeout maximum
 * - 3 retry attempts with exponential backoff
 * - 30-minute cache TTL with invalidation
 * - Detailed error messages and suggested actions
 * - RBAC-aware operation parameters
 */

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
// Dashboard Operation Contracts
// =============================================================================

export interface GetCompleteDashboardDataVariables {
	userId: string;
	userRole: string;
}

export interface GetCompleteDashboardDataResponse {
	dashboardData: {
		metrics: DashboardMetrics;
		user: DashboardUser;
		activities: ActivityItem[];
		tasks: TaskItem[];
		upcomingEvents: UpcomingEvent[];
	};
}

export interface DashboardMetrics {
	attendanceRate: number;
	pendingRequests: number;
	taskCount: number;
	remainingVacationDays: number;
}

export interface DashboardUser {
	id: string;
	displayName: string;
	role: string;
	department?: string;
	profileImage?: string;
}

export interface ActivityItem {
	id: string;
	type: string;
	message: string;
	timestamp: string;
	severity: string;
}

export interface TaskItem {
	id: string;
	title: string;
	status: string;
	dueDate?: string;
	priority: string;
}

export interface UpcomingEvent {
	id: string;
	title: string;
	type: string;
	time: string;
	location?: string;
}

// =============================================================================
// Authentication Operation Contracts
// =============================================================================

export interface AuthUser {
	id: string;
	email: string;
	displayName: string;
	firstName: string;
	lastName: string;
	isActive: boolean;
	emailVerified: boolean;
	profileImage?: string;
	lastLoginAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface AuthRole {
	id: string;
	name: string;
	displayName: string;
	description: string;
	permissions: string[];
}

export interface AuthTokenInfo {
	expiresAt: string;
	issuedAt: string;
	needsRefresh: boolean;
	refreshToken?: string | null;
}

export interface AuthSessionInfo {
	sessionId: string;
	ipAddress?: string;
	userAgent?: string;
	deviceInfo?: {
		type: string;
		os: string;
		browser: string;
	};
}

export interface AuthData {
	isValid: boolean;
	user: AuthUser | null;
	roles: AuthRole[];
	permissions: string[];
	tokenInfo: AuthTokenInfo;
	sessionInfo: AuthSessionInfo | null;
}

export interface VerifyUserAuthenticationVariables {
	token: string;
	includePermissions?: boolean;
	includeRoles?: boolean;
}

export interface VerifyUserAuthenticationResponse {
	success?: boolean;
	data?: any;
	authData: AuthData;
	// Legacy properties for backward compatibility
	currentUser?: AuthenticatedUser;
	authStatus?: AuthStatus;
}

export interface AuthenticatedUser {
	id: string;
	email: string;
	displayName: string;
	role: string;
	permissions: string[];
	isActive: boolean;
	lastLogin?: string;
	profileImage?: string;
	department: {
		id: string;
		name: string;
	};
}

export interface AuthStatus {
	isAuthenticated: boolean;
	tokenExpiry?: string;
	needsRefresh: boolean;
	sessionId: string;
}

// =============================================================================
// Employee Management Operation Contracts
// =============================================================================

export interface GetEmployeesVariables {
	limit?: number;
	offset?: number;
	filter?: EmployeeFilter;
	sortBy?: string;
	sortDirection?: 'asc' | 'desc';
}

export interface GetEmployeesResponse {
	employees: {
		totalCount: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
		data: Employee[];
	};
	pagination: PaginationInfo;
}

export interface Employee {
	id: string;
	email: string;
	displayName: string;
	role: string;
	department: string;
	isActive: boolean;
	startDate: string;
	profileImage?: string;
	contactInfo?: {
		phone?: string;
		address?: string;
	};
}

export interface EmployeeFilter {
	department?: string;
	role?: string;
	isActive?: boolean;
	startDateAfter?: string;
	startDateBefore?: string;
	searchTerm?: string;
}

export interface PaginationInfo {
	currentPage: number;
	totalPages: number;
	totalItems: number;
	itemsPerPage: number;
}

// =============================================================================
// Department Management Operation Contracts
// =============================================================================

export interface GetDepartmentsVariables {
	includeEmployeeCount?: boolean;
}

export interface GetDepartmentsResponse {
	departments: Department[];
}

export interface Department {
	id: string;
	name: string;
	description?: string;
	managerId?: string;
	manager?: {
		id: string;
		displayName: string;
		email: string;
	};
	employeeCount?: number;
	isActive: boolean;
	createdAt: string;
}

// =============================================================================
// Error Handling and Retry Operation Contracts
// =============================================================================

export interface RetryFailedOperationVariables {
	operationId: string;
	operationName: string;
	originalVariables: any;
	retryAttempt: number;
	userId: string;
}

export interface RetryFailedOperationResponse {
	retryResult: {
		success: boolean;
		data?: any;
		error?: ErrorResponse;
		retryInfo: {
			attemptsRemaining: number;
			nextRetryDelay: number;
			maxRetries: number;
		};
	};
}

// =============================================================================
// Cache Management Operation Contracts
// =============================================================================

export interface InvalidateCacheVariables {
	cacheKeys: string[];
	scope: 'user' | 'department' | 'global';
	userId: string;
	reason: string;
}

export interface InvalidateCacheResponse {
	cacheInvalidation: {
		success: boolean;
		invalidatedKeys: string[];
		affectedOperations: string[];
		timestamp: string;
		nextRefreshAt: string;
	};
}

export interface CachePolicy {
	ttlMinutes: number; // Maximum 30 minutes
	invalidateOnChange: boolean;
	staleWhileRevalidate: boolean;
}

// =============================================================================
// Application Page State Management
// =============================================================================

export interface ApplicationPage {
	id: string;
	title: string;
	requiredOperations: string[];
	loadingState: LoadingState;
	errorState: ErrorResponse | null;
	cachePolicy: CachePolicy;
	lastDataRefresh: Date | null;
	retryConfiguration: RetryConfig;
}

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error' | 'retrying';

export interface RetryConfig {
	maxAttempts: number; // Maximum 3
	backoffStrategy: 'exponential' | 'linear' | 'fixed';
	retryConditions: string[];
}

// =============================================================================
// Standardized Operation Result Wrapper
// =============================================================================

export interface OperationResult<TData = any> {
	data?: TData;
	error?: ErrorResponse;
	loading: boolean;
	networkError?: Error;
	operation?: DataRequest;
}

// =============================================================================
// URQL Integration Types
// =============================================================================

export interface UrqlOperationContext {
	requestPolicy?: 'cache-first' | 'cache-only' | 'network-only' | 'cache-and-network';
	additionalTypenames?: string[];
	fetch?: typeof fetch;
	fetchOptions?: RequestInit;
	preferGetMethod?: boolean;
	timeout?: number; // Maximum 5000ms
}

// =============================================================================
// Svelte Component Integration Types
// =============================================================================

export interface GraphQLComponentProps<TVariables = any, TData = any> {
	variables: TVariables;
	onSuccess?: (data: TData) => void;
	onError?: (error: ErrorResponse) => void;
	onRetry?: (attempt: number) => void;
	loadingComponent?: any;
	errorComponent?: any;
	cachePolicy?: CachePolicy;
	retryConfig?: RetryConfig;
}

// =============================================================================
// Error Boundary Types for Svelte Components
// =============================================================================

export interface ErrorBoundaryState {
	hasError: boolean;
	error: ErrorResponse | null;
	errorInfo?: {
		componentStack: string;
		errorBoundary: string;
	};
	retryAttempts: number;
	canRetry: boolean;
}

// =============================================================================
// Performance Monitoring Types
// =============================================================================

export interface PerformanceMetrics {
	operationName: string;
	executionTime: number;
	cacheHit: boolean;
	networkLatency: number;
	payloadSize: number;
	retryCount: number;
	timestamp: Date;
}

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

export function isOperationResult<T>(value: any): value is OperationResult<T> {
	return typeof value === 'object' && value !== null && typeof value.loading === 'boolean';
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
