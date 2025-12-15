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
		const GET_EVENTS = gql`
			query GetAllEvents($first: Int, $offset: Int, $filter: EventCondition, $orderBy: [EventsOrderBy!]) {
				events(first: $first, offset: $offset, condition: $filter, orderBy: $orderBy) {
					totalCount
					nodes {
						id
						title
						description
						eventType
						startTime
						endTime
						allDay
						location
						status
						isPublic
						color
						organizerId
						createdAt
						updatedAt
						eventAttendees {
							nodes {
								id
								employeeId
								responseStatus
								isOrganizer
							}
						}
						organizer {
							id
							displayName
							email
						}
					}
				}
			}
		`;

		const eventsResponse = await client.query(GET_EVENTS, {
			first: limit,
			offset,
			filter,
			orderBy: [orderBy] as any
		});

		const events = eventsResponse?.events?.nodes || [];
		const totalCount = eventsResponse?.events?.totalCount || 0;

		// Fetch user's events for "My Events" tab (filtered client-side for simplicity in this view)
		const GET_STATS_DATA = gql`
			query GetEventStats {
				events(condition: { status: "scheduled" }) {
					nodes {
						id
						startTime
						endTime
						status
						eventAttendees {
							nodes {
								employeeId
								responseStatus
							}
						}
					}
				}
			}
		`;

		const statsResponse = await client.query(GET_STATS_DATA);
		const allEventsForStats = statsResponse?.events?.nodes || [];

		// Calculate statistics
		const eventStats = StatisticsCalculator.forEvents(allEventsForStats);

		const stats = {
			total: totalCount,
			upcoming: eventStats.upcoming,
			ongoing: eventStats.ongoing,
			past: eventStats.past,
			cancelled: eventStats.cancelled,
			myEvents: allEventsForStats.filter((e: any) =>
				(e.eventAttendees?.nodes || []).some((a: any) => a.employeeId === userId)
			).length,
			accepted: allEventsForStats.filter((e: any) =>
				(e.eventAttendees?.nodes || []).some(
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
			eventAttendees: e.eventAttendees?.nodes || [],
			attendees: e.eventAttendees?.nodes || []
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
