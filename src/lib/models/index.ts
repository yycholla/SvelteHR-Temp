/**
 * Models Index - Entity Models for GraphQL Integration
 *
 * Exports all entity models created for standardized GraphQL error handling,
 * session management, and application page state management.
 */

// T021: DataRequest Entity Model
export {
	DataRequest,
	DataRequestStatus,
	createDataRequest,
	isValidUserCredentials,
	createUserCredentials,
	type UserCredentials
} from './data-request';

// T022: ErrorResponse Entity Model
export {
	ErrorResponse,
	SuggestedAction,
	createErrorResponse,
	isErrorResponse,
	type TechnicalDetails
} from './error-response';

// T023: UserSession Entity Model
export {
	UserSession,
	createUserSession,
	createAnonymousSession,
	isUserSession,
	type JWTPayload,
	type SessionActivity,
	type SessionSecurity
} from './user-session';

// T024: ApplicationPage Entity Model
export {
	ApplicationPage,
	PageLoadingState,
	createApplicationPage,
	isApplicationPage,
	type PageErrorState,
	type PageCachePolicy,
	type PageRetryConfiguration,
	type RequiredOperation,
	type PagePerformance,
	type PageMetadata
} from './application-page';
