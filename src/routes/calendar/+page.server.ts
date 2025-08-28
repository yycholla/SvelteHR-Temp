import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { apiClient } from '$lib/api/client';
import { eventSchema, type Event } from '$lib/schemas/event';
import { z } from 'zod';

export const load: PageServerLoad = async ({ url, cookies }) => {
	// Get authentication token
	const token = cookies.get('hr_token');
	
	if (!token) {
		throw error(401, 'Authentication required');
	}

	// Parse URL parameters for date range (optional - can default to current month)
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const view = url.searchParams.get('view') || 'month';

	try {
		// Set token for server-side request
		apiClient.setToken(token);

		// Build query parameters for events API
		const params: Record<string, string> = {};
		if (startDate) params.startDate = startDate;
		if (endDate) params.endDate = endDate;

		// Fetch events from API using new client
		console.log('🔍 Fetching events from API...');
		const eventsResponse = await apiClient.get('/portal/events', params);
		
		// Transform events to match frontend schema
		let events: Event[] = [];
		if (eventsResponse.success && Array.isArray(eventsResponse.data)) {
			events = eventsResponse.data.map((apiEvent: any): Event => {
				// Convert dates to proper ISO format for frontend
				const startDateTime = `${apiEvent.startDate}T${apiEvent.startTime || '00:00:00'}.000Z`;
				const endDateTime = apiEvent.endDate && apiEvent.endTime 
					? `${apiEvent.endDate}T${apiEvent.endTime}.000Z`
					: apiEvent.endDate 
					? `${apiEvent.endDate}T23:59:59.999Z`
					: startDateTime;

				return {
					id: apiEvent.id || apiEvent.ID,
					title: apiEvent.title || apiEvent.Title,
					description: apiEvent.description || apiEvent.Description,
					startDate: startDateTime,
					endDate: endDateTime,
					allDay: apiEvent.isAllDay || apiEvent.AllDay || false,
					type: apiEvent.type || apiEvent.Type,
					priority: apiEvent.priority || apiEvent.Priority,
					location: apiEvent.location || apiEvent.Location,
					attendees: apiEvent.attendees ? apiEvent.attendees.map((a: any) => a.employeeID || a.EmployeeID).filter(Boolean) : undefined,
					createdById: apiEvent.createdByID || apiEvent.CreatedByID,
					createdBy: apiEvent.createdBy || apiEvent.CreatedBy ? {
						id: (apiEvent.createdBy?.id || apiEvent.CreatedBy?.ID) || 0,
						firstName: (apiEvent.createdBy?.firstName || apiEvent.CreatedBy?.FirstName) || '',
						lastName: (apiEvent.createdBy?.lastName || apiEvent.CreatedBy?.LastName) || '',
						email: (apiEvent.createdBy?.email || apiEvent.CreatedBy?.Email) || ''
					} : undefined,
					recurrence: 'None',
					recurrenceEnd: null,
					color: apiEvent.color || apiEvent.Color || '#3b82f6',
					isPublic: apiEvent.isPublic || apiEvent.IsPublic || false,
					createdAt: apiEvent.createdAt || apiEvent.CreatedAt,
					updatedAt: apiEvent.updatedAt || apiEvent.UpdatedAt
				};
			});
		}

		console.log(`✅ Successfully loaded ${events.length} events`);

		return {
			events,
			initialView: view as 'month' | 'week' | 'day',
			initialDateRange: startDate && endDate ? { startDate, endDate } : null
		};

	} catch (err) {
		console.error('❌ Error loading events:', err);
		// Return empty events array instead of throwing error to prevent page crash
		return {
			events: [],
			initialView: view as 'month' | 'week' | 'day',
			initialDateRange: null,
			error: 'Failed to load events'
		};
	}
};

export const actions: Actions = {
	createEvent: async ({ request, cookies }) => {
		console.log('🚀 createEvent action started');
		
		try {
			const token = cookies.get('hr_token');
			console.log('🔑 Token found:', !!token);
			
			if (!token) {
				console.log('❌ No auth token found');
				return fail(401, { error: 'Authentication required' });
			}

			const data = await request.formData();
			console.log('📝 Form data received:', Object.fromEntries(data.entries()));
			
			// Set token for server-side request
			apiClient.setToken(token);
			console.log('🔑 Token set for API client');

			// Prepare the event data for the backend (CompanyEvent format)
			console.log('📤 Preparing event data...');
			
			// Parse dates properly for GORM
			const startDate = data.get('startDate') as string;
			const startTime = data.get('startTime') as string;
			const endDate = (data.get('endDate') as string) || startDate;
			const endTime = (data.get('endTime') as string) || '23:59';
			
			const eventData = {
				title: data.get('title'),
				description: data.get('description') || '',
				startDate: startDate, // GORM expects separate date field
				endDate: endDate === startDate ? null : endDate, // Optional end date
				startTime: startTime, // String format like "09:00"
				endTime: endTime === '23:59' ? null : endTime, // Optional end time
				eventType: data.get('type'), // Note: eventType not type for CompanyEvent
				priority: data.get('priority'),
				location: data.get('location') || '',
				isAllDay: data.get('isAllDay') === 'true',
				isPublic: data.get('isPublic') === 'true'
			};

			console.log('📤 Backend event data:', eventData);
			console.log('🚀 Making API call to backend...');

			// Send POST request to create event
			console.log('🚀 Making API call to backend...');
			const response = await apiClient.post('/portal/events', eventData);
			
			if (response.success) {
				console.log('✅ Event successfully created in backend:', response.data);
				return { success: true, event: response.data };
			} else {
				console.error('❌ Failed to create event in backend:', response.error);
				return fail(400, { error: response.error || 'Failed to create event' });
			}

		} catch (err) {
			console.error('❌ Error in createEvent action:', err);
			console.error('❌ Error stack:', err.stack);
			return fail(500, { error: `Server error: ${err.message}` });
		}
	},

	deleteEvent: async ({ request, cookies }) => {
		const token = cookies.get('hr_token');
		
		if (!token) {
			return fail(401, { error: 'Authentication required' });
		}

		const data = await request.formData();
		const eventId = data.get('eventId');

		if (!eventId || typeof eventId !== 'string') {
			return fail(400, { error: 'Event ID is required' });
		}

		try {
			// Set token for server-side request
			apiClient.setToken(token);

			// Delete the event using new API client
			const response = await apiClient.delete(`/portal/events/${eventId}`);
			
			if (response.success) {
				console.log(`✅ Successfully deleted event ${eventId}`);
				return { success: true };
			} else {
				console.error('❌ Error deleting event:', response.error);
				return fail(400, { error: response.error || 'Failed to delete event' });
			}

		} catch (err) {
			console.error('❌ Error deleting event:', err);
			return fail(500, { error: 'Failed to delete event' });
		}
	}
};