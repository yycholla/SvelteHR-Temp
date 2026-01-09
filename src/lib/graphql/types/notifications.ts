import type { NotificationCategory, NotificationType } from './enums';

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

export interface NotificationStatistics {
	totalNotifications: number;
	unreadCount: number;
	emailNotifications: number;
	inAppNotifications: number;
	notificationsByCategory: Record<NotificationCategory, number>;
}
