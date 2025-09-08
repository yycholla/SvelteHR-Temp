import type { PageServerLoad } from './$types';
import {
	loadAnnouncementData,
	parseSearchParams,
	createAuthenticatedApiClient
} from '$lib/api/server-client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	console.log('🔔 Loading notifications page with new API client');

	try {
		// Parse URL parameters for filtering
		const params = parseSearchParams(url);
		const isRead = url.searchParams.get('isRead');
		const type = url.searchParams.get('type') || 'all';

		// Load announcements as notifications (they serve similar purpose)
		const announcementData = await loadAnnouncementData(cookies, {
			limit: params.limit,
			page: params.page,
			active_only: true, // Only show active announcements
			priority: params.priority
		});

		// Also try to get any system notifications or alerts
		const apiClient = createAuthenticatedApiClient(cookies);
		let systemNotifications: any[] = [];

		try {
			// Try to get activity logs as system notifications
			const activityResult = await apiClient.activityLogs.list({
				limit: 10,
				action_type: 'system'
			});
			if (activityResult.success && activityResult.data) {
				systemNotifications =
					activityResult.data.data?.map((log: any) => ({
						id: `activity-${log.id}`,
						title: `System Activity: ${log.action_type}`,
						message: log.details?.message || `${log.action_type} on ${log.resource_type}`,
						type: 'info',
						timestamp: log.created_at,
						isRead: false,
						category: 'System',
						priority: 'low'
					})) || [];
			}
		} catch (error) {
			console.log('ℹ️ No system notifications available');
		}

		// Transform announcements to notification format for UI compatibility
		const announcementNotifications = announcementData.announcements.map((announcement: any) => ({
			id: announcement.id,
			title: announcement.title,
			message: announcement.content,
			type: getNotificationType(announcement.priority),
			timestamp: announcement.created_at,
			isRead: false, // This would come from a user_notifications junction table in real app
			category: 'Announcements',
			priority: announcement.priority || 'medium',
			// Original announcement data
			announcement
		}));

		// Combine all notifications
		const allNotifications = [...announcementNotifications, ...systemNotifications];

		// Apply filters
		let filteredNotifications = allNotifications;
		if (isRead !== null) {
			const isReadFilter = isRead === 'true';
			filteredNotifications = filteredNotifications.filter((n) => n.isRead === isReadFilter);
		}
		if (type !== 'all') {
			filteredNotifications = filteredNotifications.filter((n) => n.type === type);
		}

		// Sort by timestamp (newest first)
		filteredNotifications.sort(
			(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);

		// Calculate stats
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const stats = {
			total: allNotifications.length,
			unread: allNotifications.filter((n) => !n.isRead).length,
			read: allNotifications.filter((n) => n.isRead).length,
			urgent: allNotifications.filter((n) => n.type === 'error' || n.priority === 'high').length,
			today: allNotifications.filter((n) => {
				if (!n.timestamp) return false;
				const notifDate = new Date(n.timestamp);
				notifDate.setHours(0, 0, 0, 0);
				return notifDate.getTime() === today.getTime();
			}).length
		};

		console.log('✅ Notifications page loaded with', filteredNotifications.length, 'notifications');

		return {
			notifications: filteredNotifications,
			stats,
			totalCount: announcementData.totalCount,
			filters: {
				isRead,
				type,
				priority: params.priority || 'all'
			}
		};
	} catch (error) {
		console.error('❌ Error loading notifications:', error);

		// Return empty notifications on error
		return {
			notifications: [],
			stats: {
				total: 0,
				unread: 0,
				read: 0,
				urgent: 0,
				today: 0
			},
			totalCount: 0,
			filters: {
				isRead: null,
				type: 'all',
				priority: 'all'
			},
			error: 'Failed to load notifications'
		};
	}
};

/**
 * Convert announcement priority to notification type
 */
function getNotificationType(priority?: string): string {
	switch (priority) {
		case 'urgent':
			return 'error';
		case 'high':
			return 'warning';
		case 'medium':
			return 'info';
		case 'low':
		default:
			return 'reminder';
	}
}
