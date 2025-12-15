import type { RequestEvent } from '@sveltejs/kit';
import { requireAuth } from './rbac-core';

/**
 * Specific permission checks for common scenarios
 * Updated to use scoped read permissions (read:self, read:team, read:all)
 */
export const PermissionChecks = {
	// Dashboard access - requires at least self-level access
	dashboard: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'dashboard:read:self',
				'dashboard:read:team',
				'dashboard:read:all',
				'dashboard:read'
			]
		}),

	// Employee management - accepts any level of read access
	employeeRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'employees:read:self',
				'employees:read:team',
				'employees:read:all',
				'employees:read'
			]
		}),
	employeeWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:write']
		}),
	employeeManagement: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['employees:read:team', 'employees:read:all', 'employees:read'],
			allowedRoles: ['Admin', 'Manager', 'HR Manager']
		}),

	// Department management - accepts any level of read access
	departmentRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'departments:read:self',
				'departments:read:team',
				'departments:read:all',
				'departments:read'
			]
		}),
	departmentWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['departments:write']
		}),

	// Team management - requires at least team-level access
	teamRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['teams:read:team', 'teams:read:all', 'teams:read']
		}),
	teamWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['teams:write']
		}),

	// Management pages - requires team or all-level access
	management: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['management:read:team', 'management:read:all', 'management:read']
		}),
	managementWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['management:write']
		}),

	// Leave management - accepts any level of read access
	leaveRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['leave:read:self', 'leave:read:team', 'leave:read:all', 'leave:read']
		}),
	leaveApproval: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['leave:approve']
		}),

	// Performance management - accepts any level of read access
	performanceRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'performance:read:self',
				'performance:read:team',
				'performance:read:all',
				'performance:read'
			]
		}),
	performanceWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['performance:write']
		}),

	// Goals and OKRs - accepts any level of read access
	goalsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['goals:read:self', 'goals:read:team', 'goals:read:all', 'goals:read']
		}),
	goalsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['goals:write']
		}),

	// Reports - accepts any level of read access
	reportsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'reports:read:self',
				'reports:read:team',
				'reports:read:all',
				'reports:read'
			]
		}),
	reportsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:write']
		}),
	reportsExecute: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:execute']
		}),
	reportsAnalytics: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['reports:analytics']
		}),

	// Admin pages - requires all-level access
	adminRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['admin:read:all', 'admin:read']
		}),
	adminWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['admin:write']
		}),

	// Additional scoped permission checks
	// Tasks
	tasksRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['tasks:read:self', 'tasks:read:team', 'tasks:read:all', 'tasks:read']
		}),
	tasksWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['tasks:write']
		}),
	tasksDelete: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['tasks:delete']
		}),

	// Documents
	documentsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'documents:read:self',
				'documents:read:team',
				'documents:read:all',
				'documents:read'
			]
		}),
	documentsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['documents:write']
		}),
	documentsDelete: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['documents:delete']
		}),

	// Events
	eventsRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'events:read:self',
				'events:read:team',
				'events:read:all',
				'events:read'
			]
		}),
	eventsWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['events:write']
		}),

	// Attendance
	attendanceRead: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: [
				'attendance:read:self',
				'attendance:read:team',
				'attendance:read:all',
				'attendance:read'
			]
		}),
	attendanceWrite: (event: RequestEvent) =>
		requireAuth(event, {
			requiredPermissions: ['attendance:write']
		})
};
