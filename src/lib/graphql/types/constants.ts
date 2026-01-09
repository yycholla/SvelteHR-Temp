import type {
	ActivityAction,
	EventStatus,
	EventType,
	NotificationCategory,
	RsvpStatus,
	TaskPriority,
	TaskStatus
} from './enums';

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
