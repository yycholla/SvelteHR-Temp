import { api } from './client';
import { eventSchema, eventApiSchema, type Event, type EventCreate, type EventUpdate, type EventQuery } from '$lib/schemas/event';
import { z } from 'zod';

// Transform API response to UI format (matching actual backend structure)
function transformEventFromApi(apiEvent: any): Event {
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
		recurrence: 'None', // Backend doesn't have recurrence yet
		recurrenceEnd: null,
		color: apiEvent.color || apiEvent.Color || '#3b82f6', // Default blue
		isPublic: apiEvent.isPublic || apiEvent.IsPublic || false,
		createdAt: apiEvent.createdAt || apiEvent.CreatedAt,
		updatedAt: apiEvent.updatedAt || apiEvent.UpdatedAt
	};
}

// Transform UI format to API format (matching backend's expected structure)
function transformEventToApi(event: EventCreate | EventUpdate): any {
	// Extract date and time parts from ISO strings
	const startDate = new Date(event.startDate);
	const endDate = event.endDate ? new Date(event.endDate) : null;
	
	return {
		title: event.title,
		description: event.description || null,
		startDate: startDate.toISOString().split('T')[0], // YYYY-MM-DD
		endDate: endDate ? endDate.toISOString().split('T')[0] : null,
		startTime: startDate.toTimeString().slice(0, 5), // HH:MM
		endTime: endDate ? endDate.toTimeString().slice(0, 5) : null,
		location: event.location || '',
		type: event.type,
		priority: event.priority,
		isPublic: event.isPublic || false,
		isAllDay: event.allDay || false
	};
}

export const eventApi = {
	// List events with query parameters
	list: async (query: EventQuery = {}): Promise<Event[]> => {
		try {
			const params = new URLSearchParams();
			if (query.startDate) params.append('startDate', query.startDate);
			if (query.endDate) params.append('endDate', query.endDate);
			if (query.type) params.append('type', query.type);
			if (query.createdById) params.append('createdById', query.createdById.toString());
			if (query.isPublic !== undefined) params.append('public', query.isPublic.toString()); // Backend uses 'public' not 'isPublic'
			if (query.limit) params.append('limit', query.limit.toString());
			if (query.offset) params.append('offset', query.offset.toString());
			
			// Debug: Check if we're sending auth header
			console.log('🔍 Making request to events endpoint with params:', params.toString());
			
			const response = await api.get(`events?${params.toString()}`);
			
			// Backend returns array of events directly
			if (Array.isArray(response)) {
				return response.map(transformEventFromApi);
			}
			
			return [];
		} catch (error: any) {
			console.error('❌ Failed to fetch events:', error);
			
			// Enhanced debugging
			if (error.response) {
				console.error('📊 Response status:', error.response.status);
				console.error('📋 Response headers:', error.response.headers);
				try {
					const responseText = await error.response.text();
					console.error('📄 Response body:', responseText);
				} catch (e) {
					console.error('📄 Unable to read response body');
				}
			}
			
			// Check if auth token exists
			const hasAuthToken = document.cookie.includes('hr_token');
			console.error('🔐 Auth token in cookie?', hasAuthToken);
			
			throw error;
		}
	},

	// Get single event by ID
	getById: async (id: number): Promise<Event> => {
		try {
			const response = await api.get(`events/${id}`);
			return transformEventFromApi(response);
		} catch (error) {
			console.error(`Failed to fetch event ${id}:`, error);
			throw error;
		}
	},

	// Create new event
	create: async (eventData: EventCreate): Promise<Event> => {
		try {
			const apiData = transformEventToApi(eventData);
			const response = await api.post('events', apiData);
			return transformEventFromApi(response);
		} catch (error) {
			console.error('Failed to create event:', error);
			throw error;
		}
	},

	// Update existing event
	update: async (id: number, eventData: EventUpdate): Promise<Event> => {
		try {
			const apiData = transformEventToApi(eventData);
			const response = await api.put(`events/${id}`, apiData);
			return transformEventFromApi(response);
		} catch (error) {
			console.error(`Failed to update event ${id}:`, error);
			throw error;
		}
	},

	// Delete event
	delete: async (id: number): Promise<void> => {
		try {
			await api.delete(`events/${id}`);
		} catch (error) {
			console.error(`Failed to delete event ${id}:`, error);
			throw error;
		}
	},

	// Get events for a specific date range (helper for calendar views)
	getForDateRange: async (startDate: string, endDate: string): Promise<Event[]> => {
		return eventApi.list({ startDate, endDate });
	},

	// Get events for a specific day (helper for day view)
	getForDay: async (date: string): Promise<Event[]> => {
		const startDate = `${date}T00:00:00.000Z`;
		const endDate = `${date}T23:59:59.999Z`;
		return eventApi.list({ startDate, endDate });
	}
};