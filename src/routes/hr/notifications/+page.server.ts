import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const token = cookies.get('auth-token');
	
	console.log('🔔 Loading notifications page - Token present:', !!token);

	if (!token) {
		throw new Error('Authentication required');
	}

	// Create server-side API client with auth token
	const serverApiClient = apiClient.extend({
		hooks: {
			beforeRequest: [
				(request) => {
					request.headers.set('Authorization', `Bearer ${token}`);
					request.headers.set('Content-Type', 'application/json');
					console.log(`📡 API Request: ${request.method} ${request.url}`);
				}
			],
			afterResponse: [
				(request, options, response) => {
					console.log(`📡 API Response: ${response.status} for ${request.url}`);
					return response;
				}
			]
		}
	});

	// Get query parameters for filtering
	const searchParams = url.searchParams;
	const isRead = searchParams.get('isRead');
	const type = searchParams.get('type') || 'all';

	try {
		// Build query parameters
		const queryParams = new URLSearchParams();
		if (isRead !== null) queryParams.append('isRead', isRead);
		if (type !== 'all') queryParams.append('type', type);

		// Fetch notifications
		const notificationsResponse = await serverApiClient.get(`notifications?${queryParams.toString()}`).json();

		const notifications = (notificationsResponse && notificationsResponse.data) || [];

		console.log('✅ Notifications page data loaded successfully');

		// Calculate comprehensive stats
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const stats = {
			total: notifications.length,
			unread: notifications.filter((notif: any) => !notif.isRead).length,
			read: notifications.filter((notif: any) => notif.isRead).length,
			urgent: notifications.filter((notif: any) => notif.type === 'error' || notif.priority === 'high').length,
			today: notifications.filter((notif: any) => {
				if (!notif.createdAt) return false;
				const notifDate = new Date(notif.createdAt);
				notifDate.setHours(0, 0, 0, 0);
				return notifDate.getTime() === today.getTime();
			}).length
		};

		return {
			notifications,
			stats,
			filters: {
				isRead,
				type
			}
		};
	} catch (error: any) {
		console.error('❌ Error loading notifications data:', error);
		
		return {
			notifications: [],
			stats: {
				total: 0,
				unread: 0,
				read: 0,
				urgent: 0,
				today: 0
			},
			filters: {
				isRead: null,
				type: 'all'
			},
			error: error.message || 'Failed to load notifications data'
		};
	}
};