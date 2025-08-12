import { writable, derived } from 'svelte/store';
import { useApi, usePaginatedApi, useMutation } from './useApi';
import { NotificationService } from '$lib/api/services';
import type { 
	Notification, 
	NotificationFilter, 
	CreateNotificationInput,
	UnreadCount 
} from '$lib/schemas/notification';

/**
 * Notifications management hooks
 */

// Notifications list hook with filtering
export function useNotifications(initialFilter?: NotificationFilter) {
	const {
		data,
		loading,
		error,
		pagination,
		loadPage,
		nextPage,
		previousPage,
		refresh
	} = usePaginatedApi<any>('notifications', {
		pageSize: 20,
		transform: (response) => response
	});

	// Current filter state
	const filter = writable<NotificationFilter>(initialFilter || {});
	
	// Load notifications with current filter
	async function loadNotifications(pageNumber = 1) {
		let currentFilter: NotificationFilter;
		filter.subscribe(f => currentFilter = f)();
		return loadPage(pageNumber, currentFilter!);
	}

	// Update filter and reload
	async function updateFilter(newFilter: Partial<NotificationFilter>) {
		filter.update(f => ({ ...f, ...newFilter }));
		return loadNotifications(1);
	}

	// Filter by type
	async function filterByType(type?: string) {
		return updateFilter({ type: type as any });
	}

	// Filter by read status
	async function filterByReadStatus(isRead?: boolean) {
		return updateFilter({ isRead });
	}

	// Show only unread
	async function showUnreadOnly() {
		return updateFilter({ isRead: false });
	}

	// Show all notifications
	async function showAll() {
		return updateFilter({ isRead: undefined });
	}

	// Initialize
	if (initialFilter) {
		loadNotifications();
	}

	return {
		notifications: data,
		loading,
		error,
		pagination,
		filter,
		loadNotifications,
		updateFilter,
		filterByType,
		filterByReadStatus,
		showUnreadOnly,
		showAll,
		nextPage,
		previousPage,
		refresh
	};
}

// Unread count hook
export function useUnreadCount() {
	const unreadCount = useApi<UnreadCount>('notifications/unread-count', {
		cacheDuration: 30 * 1000, // Refresh every 30 seconds
		onSuccess: (data) => {
			// Update document title with unread count
			if (typeof document !== 'undefined') {
				const count = data?.unreadCount || 0;
				const baseTitle = 'SvelteHR';
				document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
			}
		}
	});

	// Poll for updates every 30 seconds
	if (typeof window !== 'undefined') {
		setInterval(() => {
			unreadCount.refresh();
		}, 30000);
	}

	return {
		unreadCount: unreadCount.data,
		loading: unreadCount.loading,
		error: unreadCount.error,
		refresh: unreadCount.refresh
	};
}

// Mark as read hook
export function useMarkAsRead() {
	const markReadMutation = useMutation<string, void>('notifications/{id}/read', 'PUT', {
		onSuccess: () => {
			console.log('Notification marked as read');
		},
		onError: (error) => {
			console.error('Failed to mark notification as read:', error);
		}
	});

	async function markAsRead(id: string) {
		return markReadMutation.mutate(id, { id });
	}

	return {
		...markReadMutation,
		markAsRead
	};
}

// Real-time notifications hook (using WebSocket or polling)
export function useRealTimeNotifications(userId?: string) {
	const notifications = writable<Notification[]>([]);
	const unreadCount = writable<number>(0);
	
	// Polling implementation (can be replaced with WebSocket)
	let pollInterval: number;

	async function startPolling() {
		if (pollInterval) clearInterval(pollInterval);
		
		const poll = async () => {
			try {
				const [notificationsResponse, countResponse] = await Promise.allSettled([
					NotificationService.list({ 
						employeeId: userId ? parseInt(userId) : undefined,
						isRead: false,
						pageSize: 10,
						sort: 'createdAt',
						order: 'DESC'
					}),
					NotificationService.getUnreadCount()
				]);
				
				if (notificationsResponse.status === 'fulfilled') {
					notifications.set(notificationsResponse.value.notifications);
				} else {
					console.error('Failed to fetch notifications:', notificationsResponse.reason);
					// Use empty array as fallback
					notifications.set([]);
				}
				
				if (countResponse.status === 'fulfilled') {
					unreadCount.set(countResponse.value.unreadCount);
				} else {
					console.error('Failed to fetch unread count:', countResponse.reason);
					// Use 0 as fallback
					unreadCount.set(0);
				}
			} catch (error) {
				console.error('Failed to poll notifications:', error);
				// Set fallback values
				notifications.set([]);
				unreadCount.set(0);
			}
		};

		// Initial load
		await poll();
		
		// Poll every 30 seconds
		pollInterval = window.setInterval(poll, 30000);
	}

	function stopPolling() {
		if (pollInterval) {
			clearInterval(pollInterval);
			pollInterval = undefined;
		}
	}

	// Auto-start polling if userId is provided
	if (userId && typeof window !== 'undefined') {
		startPolling();
	}

	// Cleanup on unmount
	if (typeof window !== 'undefined') {
		window.addEventListener('beforeunload', stopPolling);
	}

	return {
		notifications,
		unreadCount,
		startPolling,
		stopPolling
	};
}

// Notification types hook (for filtering UI)
export function useNotificationTypes() {
	const types = [
		{ value: '', label: 'All Types' },
		{ value: 'info', label: 'Information' },
		{ value: 'success', label: 'Success' },
		{ value: 'warning', label: 'Warning' },
		{ value: 'error', label: 'Error' },
		{ value: 'ChangeRequest', label: 'Change Request' },
		{ value: 'OnboardingReminder', label: 'Onboarding Reminder' },
		{ value: 'TaskUpdate', label: 'Task Update' },
		{ value: 'General', label: 'General' }
	];

	return { types };
}

// Notification actions hook
export function useNotificationActions() {
	const markAsRead = useMarkAsRead();

	// Handle notification click
	async function handleNotificationClick(notification: Notification) {
		// Mark as read if unread
		if (!notification.isRead) {
			try {
				await markAsRead.markAsRead(notification.id.toString());
			} catch (error) {
				console.error('Failed to mark notification as read:', error);
			}
		}

		// Navigate based on notification type and related entity
		if (notification.relatedEntityType && notification.relatedEntityId) {
			const routes = {
				'Employee': `/employees/${notification.relatedEntityId}`,
				'Task': `/tasks/${notification.relatedEntityId}`,
				'Leave': `/calendar?leave=${notification.relatedEntityId}`,
				'HRRequest': `/requests/${notification.relatedEntityId}`,
				'Document': `/documents/${notification.relatedEntityId}`,
				'Compliance': `/compliance/${notification.relatedEntityId}`
			};

			const route = routes[notification.relatedEntityType as keyof typeof routes];
			if (route && typeof window !== 'undefined') {
				window.location.href = route;
			}
		}
	}

	// Bulk mark as read
	async function bulkMarkAsRead(notificationIds: string[]) {
		const promises = notificationIds.map(id => markAsRead.markAsRead(id));
		
		try {
			await Promise.all(promises);
			return true;
		} catch (error) {
			console.error('Failed to bulk mark notifications as read:', error);
			return false;
		}
	}

	// Get notification icon based on type
	function getNotificationIcon(type: string): string {
		const icons = {
			'info': 'ℹ️',
			'success': '✅',
			'warning': '⚠️',
			'error': '❌',
			'ChangeRequest': '📝',
			'OnboardingReminder': '👋',
			'TaskUpdate': '📋',
			'General': '📢'
		};

		return icons[type as keyof typeof icons] || '📢';
	}

	// Get notification color based on type
	function getNotificationColor(type: string): string {
		const colors = {
			'info': 'blue',
			'success': 'green',
			'warning': 'yellow',
			'error': 'red',
			'ChangeRequest': 'purple',
			'OnboardingReminder': 'indigo',
			'TaskUpdate': 'orange',
			'General': 'gray'
		};

		return colors[type as keyof typeof colors] || 'gray';
	}

	// Format notification time
	function formatNotificationTime(timestamp: string): string {
		const date = new Date(timestamp);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

		if (diffInMinutes < 1) return 'Just now';
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
		
		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours}h ago`;
		
		const diffInDays = Math.floor(diffInHours / 24);
		if (diffInDays < 7) return `${diffInDays}d ago`;
		
		return date.toLocaleDateString();
	}

	return {
		handleNotificationClick,
		bulkMarkAsRead,
		getNotificationIcon,
		getNotificationColor,
		formatNotificationTime,
		markAsReadLoading: markAsRead.loading
	};
}

// Notification preferences hook (for user settings)
export function useNotificationPreferences() {
	const preferences = writable({
		emailNotifications: true,
		pushNotifications: true,
		taskUpdates: true,
		leaveRequests: true,
		complianceReminders: true,
		systemAlerts: true,
		quiet_hours_start: '22:00',
		quiet_hours_end: '08:00',
		weekend_notifications: false
	});

	// Save preferences
	async function savePreferences(newPreferences: any) {
		try {
			// This would typically save to the user's profile
			preferences.set(newPreferences);
			return true;
		} catch (error) {
			console.error('Failed to save notification preferences:', error);
			return false;
		}
	}

	return {
		preferences,
		savePreferences
	};
}