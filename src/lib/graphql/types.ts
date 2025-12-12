// Shared TypeScript Types for Events, Tasks, Activities, and Notifications
// Feature: 019-we-need-to - Task T017
// Purpose: Consolidated type definitions for reuse across components and pages

// ============================================================================
// EVENT TYPES
// ============================================================================

export type EventVisibilityType = 'company' | 'department' | 'specific';

export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'postponed';

export type RsvpStatus =
	| 'pending'
	| 'accepted'
	| 'declined'
	| 'tentative'
	| 'no_response'
	| 'waitlisted';

export type EventType =
	| 'meeting'
	| 'training'
	| 'social'
	| 'company_event'
	| 'holiday'
	| 'interview'
	| 'review'
	| 'team_building'
	| 'other';

// ============================================================================
// TASK TYPES
// ============================================================================

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskAssignmentType = 'employee' | 'department';

// ============================================================================
// ACTIVITY LOG TYPES
// ============================================================================

export type ActivityAction = 'create' | 'update' | 'delete' | 'view' | 'login' | 'logout';

export type ResourceType =
	| 'event'
	| 'task'
	| 'leave_request'
	| 'profile'
	| 'document'
	| 'employee'
	| 'department'
	| 'performance_review'
	| 'notification'
	| 'system';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType = 'email' | 'in_app';

export type NotificationCategory =
	| 'event_invitation'
	| 'task_assignment'
	| 'event_reminder'
	| 'task_due_soon'
	| 'leave_approved'
	| 'leave_rejected'
	| 'performance_review'
	| 'system_announcement';

// ============================================================================
// COMMON INTERFACES
// ============================================================================

/**
 * Base user/employee reference
 */
export interface UserReference {
	id: string;
	displayName: string;
	email: string;
	jobTitle?: string;
}

/**
 * Department reference
 */
export interface DepartmentReference {
	id: string;
	name: string;
}

/**
 * Pagination info (PostGraphile standard)
 */
export interface PageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor: string | null;
	endCursor: string | null;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
	nodes: T[];
	totalCount: number;
	pageInfo: PageInfo;
}

// ============================================================================
// EVENT INTERFACES
// ============================================================================

export interface Event {
	id: string;
	title: string;
	description?: string;
	type: EventType;
	startDate: string;
	endDate: string;
	isAllDay: boolean;
	allDay?: boolean; // Alias for backward compatibility
	location?: string;
	organizerId: string;
	organizer: UserReference;
	userByOrganizerId?: UserReference; // Alias for organizer
	departmentId?: string;
	department?: DepartmentReference;
	visibilityType: EventVisibilityType;
	status: EventStatus;
	color: string;
	reminderMinutes: number;
	notes?: string;
	createdAt: string;
	updatedAt: string;
	eventAttendees?: {
		nodes: EventAttendee[];
	};
}

export interface EventAttendee {
	id: string;
	eventId: string;
	employeeId: string;
	employee: UserReference;
	responseStatus: RsvpStatus;
	isOrganizer: boolean;
	isRequired: boolean;
	respondedAt?: string;
	createdAt: string;
}

// ============================================================================
// TASK INTERFACES
// ============================================================================

export interface Task {
	id: string;
	assigneeId?: string;
	assignee?: UserReference;
	assignerId: string;
	assigner: UserReference;
	departmentId: string;
	department: DepartmentReference;
	assignedToDepartmentId?: string;
	assignedToDepartment?: DepartmentReference;
	title: string;
	description?: string;
	priority: TaskPriority;
	status: TaskStatus;
	dueDate?: string;
	createdAt: string;
	updatedAt: string;
	completedAt?: string;
}

// ============================================================================
// ACTIVITY LOG INTERFACES
// ============================================================================

export interface ActivityLog {
	id: string;
	employeeId: string;
	employee?: {
		id: string;
		displayName: string;
		email: string;
		departmentId?: string;
		department?: DepartmentReference;
	};
	action: ActivityAction;
	resourceType: ResourceType;
	resourceId?: string;
	details?: Record<string, unknown>;
	beforeSnapshot?: Record<string, unknown>;
	afterSnapshot?: Record<string, unknown>;
	isRollback?: boolean;
	rolledBackLogId?: string;
	ipAddress?: string;
	userAgent?: string;
	createdAt: string;
}

// ============================================================================
// NOTIFICATION INTERFACES
// ============================================================================

export interface Notification {
	id: string;
	recipientId: string;
	type: NotificationType;
	category: NotificationCategory;
	title: string;
	message: string;
	relatedResourceType?: string;
	relatedResourceId?: string;
	readStatus: boolean;
	deliveredAt?: string;
	readAt?: string;
	createdAt: string;
}

// ============================================================================
// FILTER INTERFACES
// ============================================================================

export interface EventFilter {
	type?: {
		equalTo?: string;
		in?: string[];
	};
	status?: {
		equalTo?: EventStatus;
		in?: EventStatus[];
	};
	visibilityType?: {
		equalTo?: EventVisibilityType;
	};
	startDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
	organizerId?: {
		equalTo?: string;
	};
	departmentId?: {
		equalTo?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
}

export interface TaskFilter {
	status?: {
		equalTo?: TaskStatus;
		in?: TaskStatus[];
	};
	priority?: {
		equalTo?: TaskPriority;
		in?: TaskPriority[];
	};
	assigneeId?: {
		equalTo?: string;
	};
	assignerId?: {
		equalTo?: string;
	};
	departmentId?: {
		equalTo?: string;
	};
	assignedToDepartmentId?: {
		equalTo?: string;
		isNull?: boolean;
	};
	dueDate?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
		lessThan?: string;
	};
	title?: {
		includesInsensitive?: string;
	};
}

export interface ActivityLogFilter {
	action?: {
		equalTo?: ActivityAction;
		in?: ActivityAction[];
	};
	resourceType?: {
		equalTo?: ResourceType;
		in?: ResourceType[];
	};
	resourceId?: {
		equalTo?: string;
	};
	employeeId?: {
		equalTo?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

export interface NotificationFilter {
	type?: {
		equalTo?: NotificationType;
		in?: NotificationType[];
	};
	category?: {
		equalTo?: NotificationCategory;
		in?: NotificationCategory[];
	};
	readStatus?: {
		equalTo?: boolean;
	};
	relatedResourceType?: {
		equalTo?: string;
	};
	createdAt?: {
		greaterThanOrEqualTo?: string;
		lessThanOrEqualTo?: string;
	};
}

// ============================================================================
// UI DISPLAY TYPES
// ============================================================================

/**
 * Grouped data for display (e.g., activities by date)
 */
export interface GroupedItems<T> {
	groupKey: string;
	groupLabel: string;
	items: T[];
	count: number;
}

/**
 * Badge configuration for status/priority display
 */
export interface BadgeConfig {
	text: string;
	color: string;
	icon?: string;
}

/**
 * Calendar event for FullCalendar
 */
export interface CalendarEvent {
	id: string;
	title: string;
	start: string;
	end: string;
	allDay?: boolean;
	backgroundColor?: string;
	borderColor?: string;
	extendedProps?: {
		location?: string;
		rsvpStatus?: RsvpStatus;
		visibilityType?: EventVisibilityType;
		isOrganizer?: boolean;
	};
}

// ============================================================================
// STATISTICS INTERFACES
// ============================================================================

export interface EventStatistics {
	totalEvents: number;
	upcomingEvents: number;
	pastEvents: number;
	acceptedRsvps: number;
	pendingRsvps: number;
	declinedRsvps: number;
}

export interface TaskStatistics {
	totalTasks: number;
	todoTasks: number;
	inProgressTasks: number;
	completedTasks: number;
	overdueTasks: number;
	highPriorityTasks: number;
	urgentTasks: number;
	completionRate: number;
}

export interface ActivityStatistics {
	totalActivities: number;
	activitiesThisWeek: number;
	activitiesThisMonth: number;
	mostCommonAction: ActivityAction;
	mostCommonResourceType: ResourceType;
}

export interface NotificationStatistics {
	totalNotifications: number;
	unreadCount: number;
	emailNotifications: number;
	inAppNotifications: number;
	notificationsByCategory: Record<NotificationCategory, number>;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if a task is assigned to an employee (vs department)
 */
export function isEmployeeTask(task: Task): boolean {
	return !!task.assigneeId && !task.assignedToDepartmentId;
}

/**
 * Check if a task is assigned to a department
 */
export function isDepartmentTask(task: Task): boolean {
	return !!task.assignedToDepartmentId && !task.assigneeId;
}

/**
 * Check if an event is visible to all employees
 */
export function isCompanyWideEvent(event: Event): boolean {
	return event.visibilityType === 'company';
}

/**
 * Check if an event is department-specific
 */
export function isDepartmentEvent(event: Event): boolean {
	return event.visibilityType === 'department';
}

/**
 * Check if an event is for specific people only
 */
export function isSpecificPeopleEvent(event: Event): boolean {
	return event.visibilityType === 'specific';
}

/**
 * Check if a notification is unread
 */
export function isUnreadNotification(notification: Notification): boolean {
	return !notification.readStatus;
}

/**
 * Check if a notification is an email notification
 */
export function isEmailNotification(notification: Notification): boolean {
	return notification.type === 'email';
}

/**
 * Check if a notification is an in-app notification
 */
export function isInAppNotification(notification: Notification): boolean {
	return notification.type === 'in_app';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize RSVP status to ensure it's a valid backend enum value
 * Maps invalid values (like 'no_response', null, undefined) to 'pending'
 */
export function normalizeRsvpStatus(status: unknown): RsvpStatus {
	const validStatuses: RsvpStatus[] = ['pending', 'accepted', 'declined', 'tentative'];

	if (typeof status === 'string' && validStatuses.includes(status as RsvpStatus)) {
		return status as RsvpStatus;
	}

	// Default to 'pending' for invalid values
	return 'pending';
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
	meeting: 'Meeting',
	training: 'Training',
	social: 'Social Event',
	company_event: 'Company Event',
	holiday: 'Holiday',
	interview: 'Interview',
	review: 'Review',
	team_building: 'Team Building',
	other: 'Other'
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
	scheduled: 'Scheduled',
	ongoing: 'Ongoing',
	completed: 'Completed',
	cancelled: 'Cancelled',
	postponed: 'Postponed'
};

export const RSVP_STATUS_LABELS: Record<RsvpStatus, string> = {
	pending: 'Pending',
	accepted: 'Accepted',
	declined: 'Declined',
	tentative: 'Tentative',
	no_response: 'No Response',
	waitlisted: 'Waitlisted'
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	todo: 'To Do',
	in_progress: 'In Progress',
	completed: 'Completed',
	cancelled: 'Cancelled'
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
	low: 'Low',
	medium: 'Medium',
	high: 'High',
	urgent: 'Urgent'
};

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
	create: 'Created',
	update: 'Updated',
	delete: 'Deleted',
	view: 'Viewed',
	login: 'Logged In',
	logout: 'Logged Out'
};

export const NOTIFICATION_CATEGORY_LABELS: Record<NotificationCategory, string> = {
	event_invitation: 'Event Invitation',
	task_assignment: 'Task Assignment',
	event_reminder: 'Event Reminder',
	task_due_soon: 'Task Due Soon',
	leave_approved: 'Leave Approved',
	leave_rejected: 'Leave Rejected',
	performance_review: 'Performance Review',
	system_announcement: 'System Announcement'
};
