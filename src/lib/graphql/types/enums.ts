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
