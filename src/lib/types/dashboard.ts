// Dashboard Types
import type { User } from './domain/user';
import type { Department } from './domain/department';
import type { AttendanceRecord } from './domain/attendance';
import type { LeaveRequest, LeaveType } from './domain/leave';
import type { Task } from './domain/task';
import type { ActivityType, NotificationType, NotificationPriority } from './domain/enums';

// Re-export domain types used in dashboard
export type {
	User,
	Department,
	AttendanceRecord,
	LeaveRequest,
	LeaveType,
	Task,
	ActivityType,
	NotificationType,
	NotificationPriority
};

// Re-export for convenience (Legacy aliases)
export type DashboardUser = User;
export type DashboardDepartment = Department;

export interface EmployeeGoal {
	id: string;
	employeeId: string;
	goalTitle: string;
	goalDescription: string | null;
	status: string;
	targetDate: string | null;
	createdAt: string;
}

export interface DashboardMetrics {
	attendanceRate: number;
	pendingRequests: number;
	taskCount: number;
	completedTaskCount?: number;
	totalTaskCount?: number;
	remainingVacationDays: number;
}

export interface ActivityLog {
	id: string;
	action: string;
	resourceType: string;
	resourceId: string;
	details: any;
	createdAt: string;
	userByEmployeeId?: User;
}

export interface SystemAuditLog extends ActivityLog {
	isRollback?: boolean;
	employeeName?: string;
}

export interface RollbackRequest {
	id: string;
	entityType: string;
	status: string;
	reason: string;
	createdAt: string;
	requester: User | null;
	requesterName?: string;
	resourceType?: string;
}

export interface RollbackStats {
	rollbackRequestsCount: number;
}

export interface DashboardActivity {
	id: string;
	title: string;
	description: string;
	icon: string;
	color: string;
	type: string;
	timestamp: string;
	user: { id: string; name: string };
}

export interface DashboardEvent {
	id: string;
	title: string;
	description: string;
	type: string;
	date: string;
	time: string;
	location: string;
	icon: string;
	color: string;
	priority: string;
	organizer: string;
	isPublic: boolean;
	rsvpStatus: string;
}

export interface ApiEvent {
	id: string;
	title: string;
	description: string | null;
	eventType: string;
	startTime: string;
	endTime: string;
	allDay: boolean;
	location: string | null;
	isPublic: boolean;
	status: string;
	color: string | null;
	organizerId: string;
	attendees: Array<{ id: string; employeeId: string; responseStatus: string }>;
	userByOrganizerId?: User;
}

export interface DashboardData {
	user: {
		id: string;
		email: string;
		displayName: string;
		roles: string[];
		firstName?: string;
		lastName?: string;
	};
	userSession: {
		userId: string;
		userEmail: string;
		roles: string[];
		accessToken: string;
	};
	dashboardData: {
		metrics: DashboardMetrics;
		activities: DashboardActivity[];
		tasks: Task[];
		events: DashboardEvent[];
	};
	dashboardMetrics: any[]; // Legacy/Specific metrics array
	recentActivities: DashboardActivity[];
	upcomingEvents: DashboardEvent[];
	quickActions: any[];
	preferences: {
		selectedPeriod: string;
		viewMode: string;
		theme: string;
		showWelcome: boolean;
	};
	permissions?: string[];
	userPerms: any;
	canManageUsers: boolean;
	canViewReports: boolean;
	canApproveLeave: boolean;
	isAdmin?: boolean;
	isSuperAdmin?: boolean;
	weatherPromise: Promise<string | null>;
	loadedAt?: string;
	error?: {
		message: string;
		details: string;
		retryable: boolean;
	};
	systemAuditLogs?: any[];
	rollbackRequests?: any[];
	rollbackStats?: RollbackStats | null;
}

export interface QuickStats {
	pendingTasks: number;
	completedTasksThisWeek: number;
	overdueTasksCount: number;
	pendingLeaveRequests: number;
	teamSize: number;
	attendanceRate: number;
}

export interface Activity {
	id: string;
	type: ActivityType;
	description: string;
	actor: User;
	target?: string;
	timestamp: string;
	metadata?: Record<string, any>;
}

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	recipient: User;
	isRead: boolean;
	priority: NotificationPriority;
	actionUrl?: string;
	actionLabel?: string;
	createdAt: string;
	expiresAt?: string;
}
