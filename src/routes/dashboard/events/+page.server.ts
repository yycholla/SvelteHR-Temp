// Events List Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T028
// Purpose: Load events with filtering and visibility controls

import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { EventsOperations } from '$lib/graphql/events-operations';
import { createUrqlClient, serializeCookies } from '$lib/graphql/client';
import { requireAuth, getUserPermissions } from '$lib/server/rbac-utils';
import type { EventStatus, EventType, EventVisibilityType } from '$lib/graphql/types';
import { normalizeRsvpStatus } from '$lib/graphql/types';
import { gql } from '@urql/svelte';
import { logger } from '$lib/utils/logger';
// Feature 026: Import GraphQL operations for comments, history, waitlist
import {
	type EventComment,
	type EventHistoryEntry,
	GET_EVENT_COMMENTS,
	GET_EVENT_HISTORY,
	GET_USER_WAITLIST_STATUS
} from '$lib/graphql/events-operations';
import type { ActivityLogFilter } from '$lib/graphql/types';
import type { Client } from '@urql/core';

interface AttendeeSubset {
	id: string;
	employeeId: string;
	responseStatus: string;
}

export const load: PageServerLoad = async (event) => {
	const { url, cookies } = event;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['events:read', 'events:read:self', 'events:read:team', 'events:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Get standardized user permissions
	const userPerms = getUserPermissions(locals);

	// T036: Session-based authentication - jwtToken not needed
	const userCredentials = {
		userId: locals.user.id,
		roles: locals.roles || [],
		permissions: locals.permissions || [],
		isAuthenticated: true,
		expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
	};

	try {
		// Initialize GraphQL client and operations with session cookie forwarding
		// For server-side: createUrqlClient(fetchFn?, authToken?, url?, cookies?)
		// Session-based auth forwards cookies for authentication
		const cookieHeader = serializeCookies(cookies);
		const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
		const eventsOps = new EventsOperations(urqlClient);

		// Get query parameters for filtering
		const visibilityFilter = url.searchParams.get('visibility') as EventVisibilityType | null;
		const statusFilter = url.searchParams.get('status') as EventStatus | null;
		const typeFilter = url.searchParams.get('type') as EventType | null;
		const sortBy = url.searchParams.get('sort') || 'date';
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const view = url.searchParams.get('view') || 'list'; // 'list' or 'calendar'

		// Determine sort order for GraphQL
		const orderByMap: Record<string, string> = {
			date: 'START_TIME_ASC',
			created: 'CREATED_AT_DESC',
			title: 'TITLE_ASC'
		};
		const orderBy = orderByMap[sortBy] || 'START_TIME_ASC';

		// Build filter for events based on actual schema fields
		// PostGraphile's condition expects direct values in snake_case
		const filter: Record<string, unknown> = {};

		// Note: events table has is_public (boolean), not visibility_type
		// For now, we'll filter by status and type only
		if (statusFilter) {
			filter.status = statusFilter;
		}

		if (typeFilter) {
			// PostGraphile uses snake_case for condition fields
			filter.event_type = typeFilter;
		}

		// Feature 027: 3-month buffer strategy
		// TODO: Implement date range filtering when PostGraphile filter syntax is confirmed
		// Current approach: Fetch all events and let client-side filtering handle it
		// const { bufferStart, bufferEnd } = calculate3MonthBuffer(new Date());

		// Fetch events visible to the user (RLS handles visibility rules)
		const eventsResult = await eventsOps.getAllEvents({
			first: limit,
			offset: (page - 1) * limit,
			filter,
			orderBy,
			userCredentials
		});

		// Fetch upcoming events without pagination for statistics
		const upcomingEventsResult = await eventsOps.getUpcomingEvents({
			limit: 1000, // Reasonable max for statistics
			filter: statusFilter ? { status: statusFilter } : {},
			userCredentials
		});

		// Fetch user's events for "My Events" tab
		const userEventsResult = await eventsOps.getUserEvents({
			employeeId: locals.user.id,
			limit: 1000,
			userCredentials
		});

		// Calculate statistics
		// NOTE: Using Rust GraphQL schema - direct array access (no .nodes wrapper)
		const stats = {
			total: eventsResult.totalCount,
			upcoming: upcomingEventsResult.events.filter((e) => new Date(e.startTime) > new Date())
				.length,
			myEvents: userEventsResult.events.length,
			accepted: userEventsResult.events.filter((e) =>
				(e.eventAttendees || []).some(
					(a: AttendeeSubset) =>
						a.employeeId === locals.user.id && a.responseStatus === 'accepted'
				)
			).length
		};

		// Feature 027: Fetch all employees for attendee picker in event creation
		const FETCH_ALL_EMPLOYEES = gql`
			query FetchAllEmployees($limit: Int, $offset: Int) {
				users(limit: $limit, offset: $offset) {
					id
					displayName
					email
					jobTitle
					departmentId
					department {
						id
						name
					}
				}
			}
		`;

		const employeesResult = await urqlClient
			.query(FETCH_ALL_EMPLOYEES, {
				limit: 1000,
				offset: 0
			})
			.toPromise();

		// Transform employees to match expected interface
		interface EmployeeUser {
			id: string;
			displayName: string;
			email: string;
			jobTitle?: string;
			department?: {
				id: string;
				name: string;
			};
		}

		const employees = (employeesResult.data?.users || []).map((user: unknown) => {
			const u = user as EmployeeUser;
			return {
				id: u.id,
				displayName: u.displayName,
				email: u.email,
				jobTitle: u.jobTitle,
				department: u.department
					? {
							id: u.department.id,
							name: u.department.name
						}
					: undefined
			};
		});

		// Feature 026: Helper functions are available at module level
		// (fetchEventComments, fetchEventHistory, fetchUserWaitlistStatus)
		// These will be called from page component when dialog opens for better performance

		return {
			events: eventsResult.events,
			totalCount: eventsResult.totalCount,
			hasNextPage: eventsResult.hasNextPage,
			currentPage: page,
			limit,
			filters: {
				visibility: visibilityFilter,
				status: statusFilter,
				type: typeFilter,
				sortBy,
				view
			},
			statistics: stats,
			canCreateEvents: userPerms.canManageEvents, // Use standardized permission
			userPerms, // Pass full permissions object to frontend
			user: locals.user,
			// Feature 027: Pass employees for attendee picker and all events for conflict detection
			employees
			// Feature 026: For per-event data fetching (comments/history/waitlist),
			// create API endpoints instead of passing urqlClient to client
		};
	} catch (err: unknown) {
		logger.error('Error loading events:', err instanceof Error ? err : new Error(String(err)));

		const errorMessage = err instanceof Error ? err.message : String(err);

		// Handle specific error cases
		if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (typeof err === 'object' && err !== null && 'status' in err) {
			throw err;
		}

		// Use type guard for AppError
		const { isAppError } = await import('$lib/models/error-response');
		const userMessage = isAppError(err) ? err.userMessage : undefined;

		error(500, {
			message: userMessage || errorMessage || 'Failed to load events. Please try again later.'
		});
	}
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
		system_admin: 200, // Highest level - system administrator
		super_admin: 200, // Alias for system_admin
		admin: 100,
		hr_manager: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[role?.toLowerCase() || 'employee'] || 20;
}

// Feature 026: Helper functions for fetching comments, history, waitlist data
// T010: Fetch event comments with pagination (20 per page)
async function fetchEventComments(
	urqlClient: Client,
	eventId: string,
	limit: number = 20,
	offset: number = 0
): Promise<{ comments: EventComment[]; totalCount: number; hasMore: boolean }> {
	try {
		const result = await urqlClient
			.query(GET_EVENT_COMMENTS, {
				eventId,
				limit,
				offset
			})
			.toPromise();

		if (result.error || !result.data) {
			logger.error('Error fetching event comments:', result.error);
			return { comments: [], totalCount: 0, hasMore: false };
		}

		// NOTE: Using Rust GraphQL schema - direct array access (no .nodes wrapper)
		const comments = result.data.eventComments || [];
		const totalCount = result.data.eventCommentsCount || comments.length;
		return {
			comments,
			totalCount,
			hasMore: comments.length >= limit
		};
	} catch (err) {
		logger.error('Failed to fetch event comments:', err instanceof Error ? err : new Error(String(err)));
		return { comments: [], totalCount: 0, hasMore: false };
	}
}

// T010: Fetch event history with pagination (25 per page)
async function fetchEventHistory(
	urqlClient: Client,
	eventId: string,
	limit: number = 25,
	offset: number = 0
): Promise<{ history: EventHistoryEntry[]; totalCount: number; hasMore: boolean }> {
	try {
		const result = await urqlClient
			.query(GET_EVENT_HISTORY, {
				eventId,
				limit,
				offset
			})
			.toPromise();

		if (result.error || !result.data) {
			logger.error('Error fetching event history:', result.error);
			return { history: [], totalCount: 0, hasMore: false };
		}

		// NOTE: Using Rust GraphQL schema - direct array access (no .nodes wrapper)
		const history = result.data.eventHistories || [];
		const totalCount = result.data.eventHistoriesCount || history.length;
		return {
			history,
			totalCount,
			hasMore: history.length >= limit
		};
	} catch (err) {
		logger.error('Failed to fetch event history:', err instanceof Error ? err : new Error(String(err)));
		return { history: [], totalCount: 0, hasMore: false };
	}
}

// T011: Fetch user's waitlist status for an event
async function fetchUserWaitlistStatus(
	urqlClient: Client,
	eventId: string,
	userId: string
): Promise<{ isOnWaitlist: boolean; position: number | null; joinedAt?: string }> {
	try {
		const result = await urqlClient
			.query(GET_USER_WAITLIST_STATUS, {
				eventId,
				userId
			})
			.toPromise();

		if (result.error || !result.data) {
			logger.error('Error fetching waitlist status:', result.error);
			return { isOnWaitlist: false, position: null };
		}

		// NOTE: Using Rust GraphQL schema - direct array access (no .nodes wrapper)
		const waitlistEntries = result.data.eventWaitlists || [];
		if (waitlistEntries.length > 0) {
			const waitlistEntry = waitlistEntries[0];
			return {
				isOnWaitlist: true,
				position: waitlistEntry.position || null,
				joinedAt: waitlistEntry.joinedAt
			};
		}

		return { isOnWaitlist: false, position: null };
	} catch (err) {
		logger.error('Failed to fetch waitlist status:', err instanceof Error ? err : new Error(String(err)));
		return { isOnWaitlist: false, position: null };
	}
}

// Form actions
export const actions: Actions = {
	updateEventTime: async (event) => {
		const { request, cookies } = event;

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		// Parse form data
		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const startTime = formData.get('startTime') as string; // Already in UTC from toISOString()
		const endTime = formData.get('endTime') as string; // Already in UTC from toISOString()

		if (!eventId || !startTime || !endTime) {
			return fail(400, { error: 'Missing required fields' });
		}

		try {
			// Session-based auth - forward cookies for authentication
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			// T036: Session-based authentication - jwtToken not needed
			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// Verify the event exists
			const event = await eventsOps.getEventById({
				eventId,
				userCredentials
			});

			if (!event) {
				return fail(404, { error: 'Event not found' });
			}

			// The client sends ISO strings that are already in UTC format (from toISOString())
			// We don't need to apply timezone offset because the conversion is already done client-side
			const startTimeUTC = startTime;
			const endTimeUTC = endTime;

			// Update the event using event ID
			// Migration: ✅ Use idiomatic Rust pattern (id param, direct input fields)
			await eventsOps.updateEvent({
				id: eventId,
				input: {
					startTime: startTimeUTC,
					endTime: endTimeUTC
				},
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error updating event time:', err instanceof Error ? err : new Error(String(err)));
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to update event. Please try again.'
			});
		}
	},

	createEvent: async (event) => {
		const { request, cookies, fetch: eventFetch } = event;

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		// Parse form data
		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const isAllDay = formData.get('isAllDay') === 'on';
		const location = formData.get('location') as string;
		const eventType = formData.get('eventType') as string;
		const isPublic = formData.get('visibilityType') === 'company';
		const timezoneOffset = parseInt(formData.get('timezoneOffset') as string);

		// Validate required fields
		if (!title || !startTime || !endTime) {
			return fail(400, { error: 'Title, start time, and end time are required.' });
		}

		try {
			// Session-based auth - pass fetch and cookies to forward session
			const cookieHeader = request.headers.get('cookie') || '';
			const urqlClient = createUrqlClient(eventFetch, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			// T036: Session-based authentication - jwtToken not needed
			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// Parse datetime-local as user's local time and convert to UTC
			const parseLocalTime = (timeStr: string, offsetMinutes: number): Date => {
				const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
				if (!match) throw new Error('Invalid datetime format');

				const [, year, month, day, hours, minutes] = match;

				// Create Date in UTC
				const date = new Date(
					Date.UTC(
						parseInt(year),
						parseInt(month) - 1,
						parseInt(day),
						parseInt(hours),
						parseInt(minutes)
					)
				);

				// Adjust for user's timezone offset
				date.setMinutes(date.getMinutes() + offsetMinutes);

				return date;
			};

			const startDate = parseLocalTime(startTime, timezoneOffset);
			const endDate = parseLocalTime(endTime, timezoneOffset);

			// Convert to UTC ISO strings
			const startTimeUTC = startDate.toISOString();
			const endTimeUTC = endDate.toISOString();

			// Migration: ✅ Use idiomatic Rust pattern (direct input, no nested wrapper)
			await eventsOps.createEvent({
				input: {
					title,
					description,
					eventType,
					startTime: startTimeUTC,
					endTime: endTimeUTC,
					isAllDay,
					location,
					status: 'scheduled',
					isPublic,
					organizerId: locals.user.id
				},
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error creating event:', err instanceof Error ? err : new Error(String(err)));
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to create event. Please try again.'
			});
		}
	},

	updateEvent: async (event) => {
		const { request, cookies } = event;

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		// Parse form data
		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const startTime = formData.get('startTime') as string;
		const endTime = formData.get('endTime') as string;
		const isAllDay = formData.get('isAllDay') === 'on';
		const location = formData.get('location') as string;
		const eventType = formData.get('eventType') as string;
		const isPublic = formData.get('visibilityType') === 'company';
		const timezoneOffset = parseInt(formData.get('timezoneOffset') as string);

		// Validate required fields
		if (!eventId || !title || !startTime || !endTime) {
			return fail(400, { error: 'Event ID, title, start time, and end time are required.' });
		}

		try {
			// Session-based auth - forward cookies for authentication
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			// T036: Session-based authentication - jwtToken not needed
			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// Parse datetime-local as user's local time and convert to UTC
			const parseLocalTime = (timeStr: string, offsetMinutes: number): Date => {
				const match = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
				if (!match) throw new Error('Invalid datetime format');

				const [, year, month, day, hours, minutes] = match;

				const date = new Date(
					Date.UTC(
						parseInt(year),
						parseInt(month) - 1,
						parseInt(day),
						parseInt(hours),
						parseInt(minutes)
					)
				);

				date.setMinutes(date.getMinutes() + offsetMinutes);
				return date;
			};

			const startDate = parseLocalTime(startTime, timezoneOffset);
			const endDate = parseLocalTime(endTime, timezoneOffset);

			const startTimeUTC = startDate.toISOString();
			const endTimeUTC = endDate.toISOString();

			// Migration: ✅ Use idiomatic Rust pattern (id param, direct input fields)
			await eventsOps.updateEvent({
				id: eventId,
				input: {
					title,
					description,
					eventType,
					startTime: startTimeUTC,
					endTime: endTimeUTC,
					isAllDay,
					location,
					isPublic
				},
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error updating event:', err instanceof Error ? err : new Error(String(err)));
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to update event. Please try again.'
			});
		}
	},

	deleteEvent: async (event) => {
		const { request, cookies, fetch } = event;
		logger.info('[SERVER] deleteEvent action called');

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: [
				'events:write',
				'events:write:self',
				'events:write:team',
				'events:write:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		// Parse form data
		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		logger.info('[SERVER] Deleting event with ID:', { eventId });

		if (!eventId) {
			return fail(400, { error: 'Event ID is required.' });
		}

		try {
			// Session-based auth - forward cookies for authentication
			const cookieHeader = serializeCookies(cookies);

			// Use REST API for deletion
			// Use environment variable for backend URL or default to localhost:4000
			const backendUrl = process.env.PUBLIC_API_URL || 'http://localhost:4000';
			logger.debug(`[SERVER] Calling REST endpoint: DELETE ${backendUrl}/api/events/${eventId}`);

			const response = await fetch(`${backendUrl}/api/events/${eventId}`, {
				method: 'DELETE',
				headers: {
					Cookie: cookieHeader
				}
			});

			logger.debug('[SERVER] Delete operation response status:', { status: response.status });

			if (!response.ok) {
				if (response.status === 404) {
					return fail(404, {
						error:
							'Failed to delete event. It may have already been deleted or you do not have permission.'
					});
				}
				throw new Error(`Failed to delete event: ${response.statusText}`);
			}

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error deleting event:', err instanceof Error ? err : new Error(String(err)));
			const message = err instanceof Error ? err.message : 'Failed to delete event. Please try again.';
			return fail(500, {
				error: message
			});
		}
	},

	updateRsvpStatus: async (event) => {
		const { request, cookies } = event;

		logger.info('[SERVER] updateRsvpStatus action called');

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: [
				'events:read',
				'events:read:self',
				'events:read:team',
				'events:read:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		logger.debug('[SERVER] User authenticated:', { userId: locals.user.id });

		// Parse form data
		const formData = await request.formData();
		const attendeeId = formData.get('attendeeId') as string | null;
		const eventId = formData.get('eventId') as string;
		const status = formData.get('status') as string;
		const scope = formData.get('scope') as string;

		logger.debug('[SERVER UPDATE] FormData received:', {
			attendeeId,
			eventId,
			status,
			statusType: typeof status,
			scope
		});

		if (!eventId || !status) {
			logger.error('[SERVER] Missing eventId or status');
			return fail(400, { error: 'Event ID and status are required' });
		}

		// Normalize and validate the RSVP status
		const normalizedStatus = normalizeRsvpStatus(status);
		logger.debug('[SERVER UPDATE] Normalized status:', {
			original: status,
			normalized: normalizedStatus,
			wasChanged: status !== normalizedStatus
		});

		try {
			logger.debug('[SERVER] Creating URQL client and EventsOperations');
			// Session-based auth - forward cookies for authentication
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			// T036: Session-based authentication - jwtToken not needed
			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			if (attendeeId) {
				// Update existing attendee
				logger.debug('[SERVER] Updating existing attendee:', { attendeeId });
				const result = await eventsOps.updateRsvpStatus({
					attendeeId,
					status: normalizedStatus,
					userCredentials
				});
				logger.debug('[SERVER] Update result:', { result });
			} else {
				// Create new attendee record with RSVP status directly
				logger.debug('[SERVER] Creating new attendee with RSVP status:', { normalizedStatus });

				// Migration: ✅ Use idiomatic Rust pattern (direct input, no nested wrapper)
				const CREATE_ATTENDEE_WITH_STATUS = gql`
					mutation CreateAttendeeWithStatus($input: CreateEventAttendeeInput!) {
						createEventAttendee(input: $input) {
							id
							eventId
							employeeId
							responseStatus
						}
					}
				`;

				const input = {
					eventId,
					employeeId: locals.user.id,
					responseStatus: normalizedStatus,
					isOrganizer: false,
					isRequired: false
				};

				logger.debug('[SERVER] Creating attendee with input:', input);

				const result = await urqlClient
					.mutation(CREATE_ATTENDEE_WITH_STATUS, { input })
					.toPromise();

				if (result.error) {
					logger.error('[SERVER] GraphQL errors creating attendee:', result.error);

					// Check if it's a duplicate key error (user is already an attendee)
					const isDuplicateKey =
						result.error.message?.includes('event_attendees_unique') ||
						result.error.message?.includes('duplicate key');

					if (isDuplicateKey) {
						logger.info('[SERVER] User is already an attendee, fetching existing record to update');

						// Fetch the event to get the existing attendee ID
						const event = await eventsOps.getEventById({
							eventId,
							userCredentials
						});

						// NOTE: Using Rust GraphQL schema - direct array access (no .nodes wrapper)
						const existingAttendee = (event.eventAttendees || event.attendees || []).find(
							(a: AttendeeSubset) => a.employeeId === locals.user.id
						);

						if (existingAttendee) {
							logger.info('[SERVER] Found existing attendee, updating RSVP status');
							await eventsOps.updateRsvpStatus({
								attendeeId: existingAttendee.id,
								status: status as import('$lib/graphql/types').RsvpStatus,
								userCredentials
							});
						} else {
							logger.error('[SERVER] Could not find existing attendee after duplicate key error!');
							throw new Error('Unable to update RSVP status. Please try again.');
						}
					} else {
						throw new Error(result.error.message || 'GraphQL error occurred');
					}
				} else {
					// Migration: ✅ Direct return value (no nested wrapper)
					logger.debug('[SERVER] Created attendee:', result.data?.createEventAttendee);
				}
			}

			logger.info('[SERVER] RSVP update successful');
			return { success: true };
		} catch (err: unknown) {
			logger.error('[SERVER] Error updating RSVP status:', err instanceof Error ? err : new Error(String(err)));
			if (err instanceof Error && err.stack) {
				logger.error('[SERVER] Error stack:', { stack: err.stack });
			}
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to update RSVP status. Please try again.'
			});
		}
	},

	setEventReminder: async (event) => {
		const { request, cookies } = event;

		// Check authentication and permissions
		requireAuth(event, {
			requiredPermissions: [
				'events:read',
				'events:read:self',
				'events:read:team',
				'events:read:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		// Parse form data
		const formData = await request.formData();
		const eventId = formData.get('eventId') as string;
		const reminderMinutes = formData.get('reminderMinutes') as string;

		if (!eventId || !reminderMinutes) {
			return fail(400, { error: 'Event ID and reminder time are required' });
		}

		try {
			// Session-based auth - forward cookies for authentication
			const cookieHeader = serializeCookies(cookies);
			const urqlClient = createUrqlClient(undefined, undefined, undefined, cookieHeader);
			const eventsOps = new EventsOperations(urqlClient);

			// T036: Session-based authentication - jwtToken not needed
			const userCredentials = {
				userId: locals.user.id,
				roles: locals.roles || [],
				permissions: locals.permissions || [],
				isAuthenticated: true,
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			};

			// First, fetch the event to get the user's attendee record
			const event = await eventsOps.getEventById({
				eventId,
				userCredentials
			});

			if (!event) {
				return fail(404, { error: 'Event not found' });
			}

			// Find the user's attendee record
			// NOTE: Using Rust GraphQL schema - direct array access (no .nodes wrapper)
			const attendee = (event.eventAttendees || event.attendees || []).find(
				(a: AttendeeSubset) => a.employeeId === locals.user.id
			);

			if (!attendee) {
				return fail(400, {
					error: 'You must RSVP to this event before setting a reminder'
				});
			}

			// Update the attendee record with the reminder time (0 = clear reminder)
			const minutes = parseInt(reminderMinutes);
			await eventsOps.setEventReminder({
				attendeeId: attendee.id,
				reminderMinutes: minutes === 0 ? null : minutes,
				userCredentials
			});

			return { success: true };
		} catch (err: unknown) {
			logger.error('Error setting event reminder:', err instanceof Error ? err : new Error(String(err)));
			const { isAppError } = await import('$lib/models/error-response');
			return fail(500, {
				error: isAppError(err) ? err.userMessage : 'Failed to set event reminder. Please try again.'
			});
		}
	}
};
