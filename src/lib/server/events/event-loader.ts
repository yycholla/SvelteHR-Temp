import { error } from '@sveltejs/kit';
import { gql } from '@urql/svelte';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers';
import { StatisticsCalculator } from '$lib/server/analytics';
import type { EventStatus, EventType, EventVisibilityType } from '$lib/graphql/types';
import type { RequestEvent } from '@sveltejs/kit';

export async function loadEventsData(event: RequestEvent) {
	const loader = new RBACDataLoader(event, [
		'events:read',
		'events:read:self',
		'events:read:team',
		'events:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		const { locals, url } = event;
		// Assert user exists for TS
		if (!locals.user) throw error(401, 'Unauthorized');
		const userId = locals.user.id;

		const params = new QueryParamExtractor(url);

		// Get query parameters for filtering
		const visibilityFilter = params.getString('visibility') as EventVisibilityType | null;
		const statusFilter = params.getString('status') as EventStatus | null;
		const typeFilter = params.getString('type') as EventType | null;
		const sortBy = params.getString('sort', 'date');
		const { page, limit, offset } = params.getPagination(50);
		const view = params.getString('view', 'list');

		// Determine sort order for GraphQL
		const orderByMap: Record<string, string> = {
			date: 'START_TIME_ASC',
			created: 'CREATED_AT_DESC',
			title: 'TITLE_ASC'
		};
		const orderBy = orderByMap[sortBy] || 'START_TIME_ASC';

		// Build filter for events
		const filter: Record<string, unknown> = {};
		if (statusFilter) filter.status = statusFilter;
		if (typeFilter) filter.event_type = typeFilter;

		// Fetch events visible to the user
		// Note: Rust backend doesn't support filtering/sorting yet, handled client-side
		const GET_EVENTS = gql`
			query GetAllEvents($limit: Int, $offset: Int) {
				events(limit: $limit, offset: $offset) {
					id
					title
					description
					eventType
					startTime
					endTime
					isAllDay
					location
					status
					isPublic
					color
					organizerId
					createdAt
					updatedAt
					attendees(limit: 100) {
						id
						employeeId
						responseStatus
						employee {
							id
							displayName
							email
						}
					}
					organizer {
						id
						displayName
						email
					}
				}
			}
		`;

		const eventsResponse = await client.query(GET_EVENTS, {
			limit,
			offset
		});

		let events = eventsResponse?.events || [];

		// Apply client-side filtering since backend doesn't support it yet
		if (statusFilter) {
			events = events.filter((e: any) => e.status === statusFilter);
		}
		if (typeFilter) {
			events = events.filter((e: any) => e.eventType === typeFilter);
		}

		// Apply client-side sorting
		if (sortBy === 'date') {
			events = events.sort((a: any, b: any) =>
				new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
			);
		} else if (sortBy === 'created') {
			events = events.sort((a: any, b: any) =>
				new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
			);
		} else if (sortBy === 'title') {
			events = events.sort((a: any, b: any) =>
				a.title.localeCompare(b.title)
			);
		}

		const totalCount = events.length;

		// Fetch all events for statistics calculation
		const GET_STATS_DATA = gql`
			query GetEventStats($limit: Int) {
				events(limit: $limit) {
					id
					startTime
					endTime
					status
					attendees(limit: 100) {
						employeeId
						responseStatus
					}
				}
			}
		`;

		const statsResponse = await client.query(GET_STATS_DATA, { limit: 1000 });
		const allEventsForStats = statsResponse?.events || [];

		// Calculate statistics
		const eventStats = StatisticsCalculator.forEvents(allEventsForStats);

		const stats = {
			total: totalCount,
			upcoming: eventStats.upcoming,
			ongoing: eventStats.ongoing,
			past: eventStats.past,
			cancelled: eventStats.cancelled,
			myEvents: allEventsForStats.filter((e: any) =>
				(e.attendees || []).some((a: any) => a.employeeId === userId)
			).length,
			accepted: allEventsForStats.filter((e: any) =>
				(e.attendees || []).some(
					(a: any) => a.employeeId === userId && a.responseStatus === 'accepted'
				)
			).length
		};

		// Fetch all employees for attendee picker
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

		const employeesResult = await client.query(FETCH_ALL_EMPLOYEES, {
			limit: 1000,
			offset: 0
		});

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

		const employees = (employeesResult?.users || []).map((user: any) => {
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

		const mappedEvents = events.map((e: any) => ({
			...e,
			attendees: e.attendees || []
		}));

		return {
			events: mappedEvents,
			totalCount,
			hasNextPage: offset + limit < totalCount,
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
			canCreateEvents: loader.hasPermission('events:write'),
			employees
		};
	});
}
