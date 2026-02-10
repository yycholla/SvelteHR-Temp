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
import type { EmployeeService } from '$services/EmployeeService';
import type { LeaveRequestService } from '$services/LeaveRequestService';
import type { DepartmentService } from '$services/DepartmentService';

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
