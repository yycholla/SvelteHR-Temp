// API Client and Services
export { apiClient, api, type ApiClient } from './client';
export { ApiServices } from './services';

// All Individual Services
export {
	EmployeeService,
	DepartmentService,
	RoleService,
	TaskService,
	ComplianceService,
	LeaveService,
	DocumentService,
	NotificationService,
	HRRequestService,
	MonitoringService,
	AuthService
} from './services';

// Generic Hooks
export { useApi, usePaginatedApi, useMutation, useOptimisticMutation } from '../hooks/useApi';

// Entity-specific Hooks
export {
	useEmployees,
	useEmployee,
	useCreateEmployee,
	useUpdateEmployee,
	useDeleteEmployee,
	useDepartments,
	useRoles,
	useManagers,
	useEmployeeStats,
	useEmployeeValidation
} from '../hooks/useEmployees';

export {
	useNotifications,
	useUnreadCount,
	useMarkAsRead,
	useRealTimeNotifications,
	useNotificationTypes,
	useNotificationActions,
	useNotificationPreferences
} from '../hooks/useNotifications';

// Schema Transformers and Utilities
export {
	createFlexibleSchema,
	normalizeApiResponse,
	FieldMappings,
	DepartmentMappings,
	RoleMappings,
	EmployeeMappings,
	transformPaginatedResponse,
	transformErrorResponse,
	transformSuccessResponse,
	buildQueryParams,
	validateRequiredFields,
	normalizeDateField,
	normalizeIdField,
	normalizeBooleanField
} from '../schemas/transformers';

// Error Handling
export {
	errorHandler,
	errorStore,
	ErrorType,
	ErrorSeverity,
	ErrorUtils,
	type AppError,
	type ErrorContext,
	type RecoveryStrategy
} from '../utils/error-handler';

// All Schema Types
export type * from '../schemas/employee';
export type * from '../schemas/task';
export type * from '../schemas/compliance';
export type * from '../schemas/leave';
export type * from '../schemas/document';
export type * from '../schemas/notification';
export type * from '../schemas/hr-request';