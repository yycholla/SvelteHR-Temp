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

// PostGraphile condition uses direct values, not wrapped in equalTo
export interface NotificationCondition {
	type?: NotificationType;
	category?: NotificationCategory;
	readStatus?: boolean;
	relatedResourceType?: string;
	recipientId?: string;
}

// Rust GraphQL Schema input types
export interface UpdateNotificationInput {
	readStatus?: boolean;
}

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
