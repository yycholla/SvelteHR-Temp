/**
 * Server-side service factory utilities
 *
 * Provides convenience functions for creating service instances
 * in SvelteKit route loaders (+page.server.ts, +layout.server.ts).
 *
 * All services are created per-request with proper authentication context.
 */

import type { RequestEvent } from '@sveltejs/kit';
import { createEmployeeService as createEmployeeServiceFactory } from '$lib/services/employeeServiceFactory';
import { createLeaveRequestService as createLeaveRequestServiceFactory } from '$lib/services/leaveRequestServiceFactory';
import { createDepartmentService as createDepartmentServiceFactory } from '$lib/services/departmentServiceFactory';
import { createAuthService as createAuthServiceFactory } from '$lib/services/authServiceFactory';
import { createTaskService } from '$lib/services/taskServiceFactory';
import { createRBACService } from '$lib/services/rbacServiceFactory';
import { createPerformanceReviewService } from '$lib/services/performanceReviewServiceFactory';
import { createGoalService as createGoalServiceFactory } from '$lib/services/goalServiceFactory';
import { createEventService as createEventServiceFactory } from '$lib/services/eventServiceFactory';
import { createNotificationService as createNotificationServiceFactory } from '$lib/services/notificationServiceFactory';
import { createDocumentService as createDocumentServiceFactory } from '$lib/services/documentServiceFactory';
import { createAttendanceService as createAttendanceServiceFactory } from '$lib/services/attendanceServiceFactory';
import { createTimeOffBalanceService as createTimeOffBalanceServiceFactory } from '$lib/services/timeOffBalanceServiceFactory';
import { createCompensationService as createCompensationServiceFactory } from '$lib/services/compensationServiceFactory';
import type { EmployeeService } from '$services/EmployeeService';
import type { LeaveRequestService } from '$services/LeaveRequestService';
import type { DepartmentService } from '$services/DepartmentService';
import type { AuthService } from '$services/AuthService';
import type { TaskService } from '$services/TaskService';
import type { RBACService } from '$services/RBACService';
import type { PerformanceReviewService } from '$services/PerformanceReviewService';
import type { GoalService } from '$services/GoalService';
import type { EventService } from '$services/EventService';
import type { NotificationService } from '$services/NotificationService';
import type { DocumentService } from '$services/DocumentService';
import type { AttendanceService } from '$services/AttendanceService';
import type { TimeOffBalanceService } from '$services/TimeOffBalanceService';
import type { CompensationService } from '$services/CompensationService';

/**
 * Container for all available services
 *
 * Services are created lazily when accessed, ensuring proper
 * authentication context from the request event.
 */
export class ServiceContainer {
	private _employeeService?: EmployeeService;
	private _leaveRequestService?: LeaveRequestService;
	private _departmentService?: DepartmentService;
	private _authService?: AuthService;
	private _taskService?: TaskService;
	private _rbacService?: RBACService;
	private _performanceReviewService?: PerformanceReviewService;
	private _goalService?: GoalService;
	private _eventService?: EventService;
	private _notificationService?: NotificationService;
	private _documentService?: DocumentService;
	private _attendanceService?: AttendanceService;
	private _timeOffBalanceService?: TimeOffBalanceService;
	private _compensationService?: CompensationService;

	constructor(private readonly event: RequestEvent) {}

	/**
	 * Get the EmployeeService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get employeeService(): EmployeeService {
		if (!this._employeeService) {
			this._employeeService = createEmployeeServiceFactory(this.event);
		}
		return this._employeeService;
	}

	/**
	 * Get the LeaveRequestService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get leaveRequestService(): LeaveRequestService {
		if (!this._leaveRequestService) {
			this._leaveRequestService = createLeaveRequestServiceFactory(this.event);
		}
		return this._leaveRequestService;
	}

	/**
	 * Get the DepartmentService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get departmentService(): DepartmentService {
		if (!this._departmentService) {
			this._departmentService = createDepartmentServiceFactory(this.event);
		}
		return this._departmentService;
	}

	/**
	 * Get the AuthService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get authService(): AuthService {
		if (!this._authService) {
			this._authService = createAuthServiceFactory(this.event);
		}
		return this._authService;
	}

	/**
	 * Get the TaskService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get taskService(): TaskService {
		if (!this._taskService) {
			this._taskService = createTaskService(this.event);
		}
		return this._taskService;
	}

	/**
	 * Get the RBACService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get rbacService(): RBACService {
		if (!this._rbacService) {
			this._rbacService = createRBACService(this.event);
		}
		return this._rbacService;
	}

	/**
	 * Get the PerformanceReviewService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get performanceReviewService(): PerformanceReviewService {
		if (!this._performanceReviewService) {
			this._performanceReviewService = createPerformanceReviewService(this.event);
		}
		return this._performanceReviewService;
	}

	/**
	 * Get the GoalService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get goalService(): GoalService {
		if (!this._goalService) {
			this._goalService = createGoalServiceFactory(this.event);
		}
		return this._goalService;
	}

	/**
	 * Get the EventService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get eventService(): EventService {
		if (!this._eventService) {
			this._eventService = createEventServiceFactory(this.event);
		}
		return this._eventService;
	}

	/**
	 * Get the NotificationService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get notificationService(): NotificationService {
		if (!this._notificationService) {
			this._notificationService = createNotificationServiceFactory(this.event);
		}
		return this._notificationService;
	}

	/**
	 * Get the DocumentService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get documentService(): DocumentService {
		if (!this._documentService) {
			this._documentService = createDocumentServiceFactory(this.event);
		}
		return this._documentService;
	}

	/**
	 * Get the AttendanceService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get attendanceService(): AttendanceService {
		if (!this._attendanceService) {
			this._attendanceService = createAttendanceServiceFactory(this.event);
		}
		return this._attendanceService;
	}

	/**
	 * Get the TimeOffBalanceService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get timeOffBalanceService(): TimeOffBalanceService {
		if (!this._timeOffBalanceService) {
			this._timeOffBalanceService = createTimeOffBalanceServiceFactory(this.event);
		}
		return this._timeOffBalanceService;
	}

	/**
	 * Get the CompensationService instance
	 *
	 * Creates and caches the service on first access.
	 * The service is configured with authentication from the request cookies.
	 */
	get compensationService(): CompensationService {
		if (!this._compensationService) {
			this._compensationService = createCompensationServiceFactory(this.event);
		}
		return this._compensationService;
	}
}

/**
 * Create a service container for the current request
 *
 * This provides access to all application services with proper
 * authentication and request context.
 *
 * @param event - SvelteKit RequestEvent
 * @returns ServiceContainer with all available services
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const services = createServices(event);
 *
 *   const result = await services.employeeService.getEmployees();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { employees: result.value };
 * };
 * ```
 */
export function createServices(event: RequestEvent): ServiceContainer {
	return new ServiceContainer(event);
}

/**
 * Create just the EmployeeService
 *
 * Convenience function for routes that only need employee operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured EmployeeService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const employeeService = createEmployeeService(event);
 *
 *   const result = await employeeService.getEmployeeById(event.params.id);
 *
 *   if (result.isError) {
 *     if (result.error.code === 'EMPLOYEE_NOT_FOUND') {
 *       throw error(404, 'Employee not found');
 *     }
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { employee: result.value };
 * };
 * ```
 */
export function createEmployeeService(event: RequestEvent): EmployeeService {
	return createEmployeeServiceFactory(event);
}

/**
 * Create just the LeaveRequestService
 *
 * Convenience function for routes that only need leave request operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured LeaveRequestService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const leaveRequestService = createLeaveRequestService(event);
 *
 *   const result = await leaveRequestService.getLeaveRequestById(event.params.id);
 *
 *   if (result.isError) {
 *     if (result.error.code === 'LEAVE_REQUEST_NOT_FOUND') {
 *       throw error(404, 'Leave request not found');
 *     }
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { leaveRequest: result.value };
 * };
 * ```
 */
export function createLeaveRequestService(event: RequestEvent): LeaveRequestService {
	return createLeaveRequestServiceFactory(event);
}

/**
 * Create just the DepartmentService
 *
 * Convenience function for routes that only need department operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured DepartmentService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const departmentService = createDepartmentService(event);
 *
 *   const result = await departmentService.getDepartments({ page: 1, limit: 20 });
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { departments: result.value.departments };
 * };
 * ```
 */
export function createDepartmentService(event: RequestEvent): DepartmentService {
	return createDepartmentServiceFactory(event);
}

/**
 * Create just the AuthService
 *
 * Convenience function for routes that need authentication operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured AuthService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const authService = createAuthService(event);
 *
 *   const result = await authService.refreshAccessToken();
 *
 *   if (result.isError) {
 *     throw redirect(303, '/login');
 *   }
 *
 *   return { tokens: result.value };
 * };
 * ```
 */
export function createAuthService(event: RequestEvent): AuthService {
	return createAuthServiceFactory(event);
}

// Re-export createTaskService from factory for convenience
export { createTaskService } from '$lib/services/taskServiceFactory';

// Re-export createRBACService from factory for convenience
export { createRBACService } from '$lib/services/rbacServiceFactory';

// Re-export createPerformanceReviewService from factory for convenience
export { createPerformanceReviewService } from '$lib/services/performanceReviewServiceFactory';

// Re-export createGoalService from factory for convenience
export { createGoalService } from '$lib/services/goalServiceFactory';

/**
 * Create just the EventService
 *
 * Convenience function for routes that only need event operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured EventService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const eventService = createEventService(event);
 *
 *   const result = await eventService.getAllEvents({ upcomingOnly: true });
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { events: result.value };
 * };
 * ```
 */
export function createEventService(event: RequestEvent): EventService {
	return createEventServiceFactory(event);
}

/**
 * Create just the NotificationService
 *
 * Convenience function for routes that only need notification operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured NotificationService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const notificationService = createNotificationService(event);
 *
 *   const result = await notificationService.getNotificationsForRecipient('user-123');
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { notifications: result.value };
 * };
 * ```
 */
export function createNotificationService(event: RequestEvent): NotificationService {
	return createNotificationServiceFactory(event);
}

/**
 * Create just the DocumentService
 *
 * Convenience function for routes that only need document operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured DocumentService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const documentService = createDocumentService(event);
 *
 *   const result = await documentService.getAllDocuments();
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { documents: result.value };
 * };
 * ```
 */
export function createDocumentService(event: RequestEvent): DocumentService {
	return createDocumentServiceFactory(event);
}

/**
 * Create just the AttendanceService
 *
 * Convenience function for routes that only need attendance operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured AttendanceService instance
 *
 * @example
 * ```typescript
 * // In +page.server.ts:
 * export const load: PageServerLoad = async (event) => {
 *   const attendanceService = createAttendanceService(event);
 *
 *   const result = await attendanceService.getByEmployeeId('employee-123');
 *
 *   if (result.isError) {
 *     throw error(500, result.error.message);
 *   }
 *
 *   return { records: result.value };
 * };
 * ```
 */
export function createAttendanceService(event: RequestEvent): AttendanceService {
	return createAttendanceServiceFactory(event);
}

/**
 * Create just the TimeOffBalanceService
 *
 * Convenience function for routes that only need time off balance operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured TimeOffBalanceService instance
 */
export function createTimeOffBalanceService(event: RequestEvent): TimeOffBalanceService {
	return createTimeOffBalanceServiceFactory(event);
}

/**
 * Create just the CompensationService
 *
 * Convenience function for routes that only need compensation operations.
 *
 * @param event - SvelteKit RequestEvent
 * @returns Configured CompensationService instance
 */
export function createCompensationService(event: RequestEvent): CompensationService {
	return createCompensationServiceFactory(event);
}
