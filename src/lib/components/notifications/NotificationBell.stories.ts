// NotificationBell Storybook Stories
// Feature: 019-we-need-to - Task T025

import type { Meta, StoryObj } from '@storybook/svelte';
import NotificationBell from './NotificationBell.svelte';
import type { Notification } from '$lib/graphql/types';

// Mock notification data
const mockNotifications: Notification[] = [
	{
		id: '1',
		recipientId: 'user-1',
		type: 'in_app',
		category: 'event_invitation',
		title: 'Event Invitation',
		message: 'You have been invited to Q4 Planning Meeting on January 15, 2025 at 2:00 PM',
		relatedResourceType: 'event',
		relatedResourceId: 'event-1',
		readStatus: false,
		deliveredAt: new Date().toISOString(),
		readAt: null,
		createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
	},
	{
		id: '2',
		recipientId: 'user-1',
		type: 'in_app',
		category: 'task_assignment',
		title: 'New Task Assigned',
		message: 'Sarah Manager assigned you a task: Implement user authentication',
		relatedResourceType: 'task',
		relatedResourceId: 'task-1',
		readStatus: false,
		deliveredAt: new Date().toISOString(),
		readAt: null,
		createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
	},
	{
		id: '3',
		recipientId: 'user-1',
		type: 'in_app',
		category: 'task_due_soon',
		title: 'Task Due Soon',
		message: 'Your task "Submit quarterly report" is due in 24 hours',
		relatedResourceType: 'task',
		relatedResourceId: 'task-2',
		readStatus: false,
		deliveredAt: new Date().toISOString(),
		readAt: null,
		createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
	},
	{
		id: '4',
		recipientId: 'user-1',
		type: 'in_app',
		category: 'leave_approved',
		title: 'Leave Request Approved',
		message: 'Your leave request for December 24-26 has been approved by your manager',
		relatedResourceType: 'leave_request',
		relatedResourceId: 'leave-1',
		readStatus: true,
		deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
		readAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
	},
	{
		id: '5',
		recipientId: 'user-1',
		type: 'in_app',
		category: 'event_reminder',
		title: 'Event Reminder',
		message: 'Reminder: Team standup meeting starts in 15 minutes',
		relatedResourceType: 'event',
		relatedResourceId: 'event-2',
		readStatus: true,
		deliveredAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		readAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
	},
	{
		id: '6',
		recipientId: 'user-1',
		type: 'in_app',
		category: 'performance_review',
		title: 'Performance Review',
		message: 'Your Q3 performance review is ready for your feedback',
		relatedResourceType: 'performance_review',
		relatedResourceId: 'review-1',
		readStatus: true,
		deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		readAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
	},
	{
		id: '7',
		recipientId: 'user-1',
		type: 'in_app',
		category: 'system_announcement',
		title: 'System Maintenance',
		message: 'Scheduled maintenance will occur on Sunday, January 20 from 2-4 AM EST',
		relatedResourceType: null,
		relatedResourceId: null,
		readStatus: true,
		deliveredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
		readAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
		createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
	}
];

const meta = {
	title: 'Notifications/NotificationBell',
	component: NotificationBell,
	tags: ['autodocs'],
	argTypes: {
		notifications: {
			control: 'object',
			description: 'Array of notification objects'
		},
		unreadCount: {
			control: 'number',
			description: 'Number of unread notifications'
		},
		maxDisplayed: {
			control: 'number',
			description: 'Maximum number of notifications to display'
		},
		onMarkAsRead: {
			action: 'mark-as-read',
			description: 'Handler when marking notification as read'
		},
		onMarkAllRead: {
			action: 'mark-all-read',
			description: 'Handler when marking all as read'
		},
		onDelete: {
			action: 'delete',
			description: 'Handler when deleting notification'
		},
		onNotificationClick: {
			action: 'notification-clicked',
			description: 'Handler when notification is clicked'
		},
		onViewAll: {
			action: 'view-all',
			description: 'Handler when "View all" is clicked'
		}
	}
} satisfies Meta<NotificationBell>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default with unread notifications
export const Default: Story = {
	args: {
		notifications: mockNotifications,
		unreadCount: 3,
		maxDisplayed: 5
	}
};

// With unread notifications
export const WithUnread: Story = {
	args: {
		notifications: mockNotifications,
		unreadCount: 3,
		maxDisplayed: 5,
		onMarkAsRead: (id: string) => console.log('Mark as read:', id),
		onMarkAllRead: () => console.log('Mark all as read'),
		onDelete: (id: string) => console.log('Delete:', id),
		onNotificationClick: (notification: Notification) =>
			console.log('Clicked notification:', notification.title),
		onViewAll: () => console.log('View all notifications')
	}
};

// No unread notifications
export const NoUnread: Story = {
	args: {
		notifications: mockNotifications.map((n) => ({ ...n, readStatus: true })),
		unreadCount: 0,
		maxDisplayed: 5,
		onNotificationClick: (notification: Notification) =>
			console.log('Clicked notification:', notification.title),
		onViewAll: () => console.log('View all notifications')
	}
};

// Many unread (9+)
export const ManyUnread: Story = {
	args: {
		notifications: mockNotifications,
		unreadCount: 15,
		maxDisplayed: 5,
		onMarkAsRead: (id: string) => console.log('Mark as read:', id),
		onMarkAllRead: () => console.log('Mark all as read')
	}
};

// Single unread
export const SingleUnread: Story = {
	args: {
		notifications: [mockNotifications[0]],
		unreadCount: 1,
		maxDisplayed: 5,
		onMarkAsRead: (id: string) => console.log('Mark as read:', id),
		onMarkAllRead: () => console.log('Mark all as read')
	}
};

// Empty notifications
export const Empty: Story = {
	args: {
		notifications: [],
		unreadCount: 0,
		maxDisplayed: 5
	}
};

// Limited display (max 3)
export const LimitedDisplay: Story = {
	args: {
		notifications: mockNotifications,
		unreadCount: 3,
		maxDisplayed: 3,
		onViewAll: () => console.log('View all notifications')
	}
};

// Only unread notifications
export const OnlyUnread: Story = {
	args: {
		notifications: mockNotifications.filter((n) => !n.readStatus),
		unreadCount: 3,
		maxDisplayed: 5,
		onMarkAsRead: (id: string) => console.log('Mark as read:', id),
		onMarkAllRead: () => console.log('Mark all as read')
	}
};

// Different notification categories
export const DifferentCategories: Story = {
	args: {
		notifications: [
			mockNotifications.find((n) => n.category === 'event_invitation')!,
			mockNotifications.find((n) => n.category === 'task_assignment')!,
			mockNotifications.find((n) => n.category === 'leave_approved')!,
			mockNotifications.find((n) => n.category === 'performance_review')!,
			mockNotifications.find((n) => n.category === 'system_announcement')!
		],
		unreadCount: 5,
		maxDisplayed: 5,
		onNotificationClick: (notification: Notification) =>
			console.log('Clicked:', notification.category)
	}
};

// Interactive (full functionality)
export const Interactive: Story = {
	args: {
		notifications: mockNotifications,
		unreadCount: 3,
		maxDisplayed: 5,
		onMarkAsRead: (id: string) => alert(`Marked notification ${id} as read`),
		onMarkAllRead: () => alert('Marked all notifications as read'),
		onDelete: (id: string) => alert(`Deleted notification ${id}`),
		onNotificationClick: (notification: Notification) =>
			alert(`Clicked notification: ${notification.title}`),
		onViewAll: () => alert('Viewing all notifications')
	}
};
