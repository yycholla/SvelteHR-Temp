import type { PageServerLoad, Actions } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { apiClient } from '$lib/api/client';
import { eventSchema, type Event } from '$lib/schemas/event';
import { z } from 'zod';

export const load: PageServerLoad = async ({ url, cookies }) => {
	// Get authentication token
	const token = cookies.get('auth-token');
	
	if (!token) {
		throw error(401, 'Authentication required');
	}

	// Parse URL parameters for date range (optional - can default to current month)
	const startDate = url.searchParams.get('startDate');
	const endDate = url.searchParams.get('endDate');
	const view = url.searchParams.get('view') || 'month';

	try {
		// Create server-side API client with proper token handling
		const serverApiClient = apiClient.extend({
			hooks: {
				beforeRequest: [
					(request) => {
						// Ensure we're setting the authorization header properly
						request.headers.set('Authorization', `Bearer ${token}`);
						request.headers.set('Content-Type', 'application/json');
						console.log('🔑 Making events API request to:', request.url);
					}
				],
				afterResponse: [
					(request, options, response) => {
						console.log('📡 Events API Response:', response.status, response.url);
						return response;
					}
				]
			}
		});

		// Build query parameters for events API
		const params = new URLSearchParams();
		if (startDate) params.append('startDate', startDate);
		if (endDate) params.append('endDate', endDate);

		// Fetch events from API
		console.log('🔍 Fetching events from API...');
		const eventsResponse = await serverApiClient.get(`events?${params.toString()}`).json();
		
		// Transform events to match frontend schema
		let events: Event[] = [];
		if (Array.isArray(eventsResponse)) {
			events = eventsResponse.map((apiEvent: any): Event => {
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
	deleteEvent: async ({ request, cookies }) => {
		const token = cookies.get('auth-token');
		
		if (!token) {
			return fail(401, { error: 'Authentication required' });
		}

		const data = await request.formData();
		const eventId = data.get('eventId');

		if (!eventId || typeof eventId !== 'string') {
			return fail(400, { error: 'Event ID is required' });
		}

		try {
			// Create server-side API client with proper token handling
			const serverApiClient = apiClient.extend({
				hooks: {
					beforeRequest: [
						(request) => {
							request.headers.set('Authorization', `Bearer ${token}`);
							request.headers.set('Content-Type', 'application/json');
						}
					]
				}
			});

			// Delete the event
			await serverApiClient.delete(`events/${eventId}`);
			
			console.log(`✅ Successfully deleted event ${eventId}`);
			
			return { success: true };

		} catch (err) {
			console.error('❌ Error deleting event:', err);
			return fail(500, { error: 'Failed to delete event' });
		}
	}
};