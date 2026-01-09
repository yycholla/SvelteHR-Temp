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
export interface CreateNotificationInput {
	userId: string;
	title: string;
	message: string;
	type?: string;
	priority?: string;
	actionUrl?: string;
}

export interface UpdateNotificationInput {
	isRead?: boolean;
}

export interface Notification {
	id: string;
	userId: string;
	type: string;
	priority: string;
	category?: string;
	title: string;
	message: string;
	actionUrl?: string;
	isRead: boolean;
	createdAt: string;
	updatedAt?: string;
}
