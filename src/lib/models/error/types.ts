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
 * Interface for application errors with user messages
 */
export interface AppError {
	userMessage: string;
	code?: string;
}
