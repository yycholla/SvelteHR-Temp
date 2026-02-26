import type { RequestEvent } from '@sveltejs/kit';
import { requireAuth, requireAccess, AccessTier } from './rbac-core';

/**
 * Centralised permission/access checks for all pages and actions.
 *
 * VIEW checks use role-based tiers:
 *   - SELF  = any authenticated user (employee+)
 *   - TEAM  = manager+
 *   - ALL   = admin / hr_manager only
 *
 * ACTION checks (write, delete, approve, execute) still use flat permissions
 * so fine-grained control is preserved.
 */
export const PermissionChecks = {
	// -- Dashboard
	dashboard: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),

	// -- Employees
	employeeRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	employeeWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['employees:write'] }),
	employeeManagement: (event: RequestEvent) =>
		requireAccess(event, AccessTier.TEAM),

	// -- Departments
	departmentRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	departmentWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['departments:write'] }),

	// -- Teams
	teamRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.TEAM),
	teamWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['teams:write'] }),

	// -- Management
	management: (event: RequestEvent) =>
		requireAccess(event, AccessTier.TEAM),
	managementWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['management:write'] }),

	// -- Leave
	leaveRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	leaveApproval: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['leave:approve'] }),

	// -- Performance
	performanceRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	performanceWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['performance:write'] }),

	// -- Goals / OKRs
	goalsRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	goalsWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['goals:write'] }),

	// -- Reports
	reportsRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	reportsWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['reports:write'] }),
	reportsExecute: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['reports:execute'] }),
	reportsAnalytics: (event: RequestEvent) =>
		requireAccess(event, AccessTier.TEAM),

	// -- Admin
	adminRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.ALL),
	adminWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['admin:write'] }),

	// -- Tasks
	tasksRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	tasksWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['tasks:write'] }),
	tasksDelete: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['tasks:delete'] }),

	// -- Documents
	documentsRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	documentsWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['documents:write'] }),
	documentsDelete: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['documents:delete'] }),

	// -- Events
	eventsRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	eventsWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['events:write'] }),

	// -- Attendance
	attendanceRead: (event: RequestEvent) =>
		requireAccess(event, AccessTier.SELF),
	attendanceWrite: (event: RequestEvent) =>
		requireAuth(event, { requiredPermissions: ['attendance:write'] })
};
