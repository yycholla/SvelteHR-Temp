/**
 * GraphQL Mocking Utilities
 * Utilities for mocking urql GraphQL client in tests
 */

import { vi } from 'vitest';

/**
 * Create a mock urql client with configurable responses
 * @param mockResponses - Object mapping query/mutation names to their responses
 * @returns Mock urql client instance
 */
export function createMockUrqlClient(mockResponses: Record<string, any> = {}) {
	return {
		query: vi.fn((query: any, variables?: any) => ({
			toPromise: () => {
				const queryName = query.definitions?.[0]?.name?.value || 'unknown';
				const response = mockResponses[queryName] || { data: null };
				return Promise.resolve(response);
			}
		})),
		mutation: vi.fn((mutation: any, variables?: any) => ({
			toPromise: () => {
				const mutationName = mutation.definitions?.[0]?.name?.value || 'unknown';
				const response = mockResponses[mutationName] || {
					data: { success: true }
				};
				return Promise.resolve(response);
			}
		})),
		subscription: vi.fn((subscription: any) => ({
			subscribe: vi.fn((handlers: any) => {
				const subscriptionName = subscription.query?.definitions?.[0]?.name?.value || 'unknown';
				const mockData = mockResponses[subscriptionName];

				if (mockData && handlers.next) {
					// Simulate subscription data delivery
					setTimeout(() => handlers.next({ data: mockData }), 0);
				}

				return {
					unsubscribe: vi.fn()
				};
			})
		}))
	};
}

/**
 * Mock successful query response
 */
export function createMockQueryResponse<T>(data: T) {
	return {
		data,
		error: null,
		fetching: false,
		stale: false
	};
}

/**
 * Mock error query response
 */
export function createMockErrorResponse(message: string = 'GraphQL Error') {
	return {
		data: null,
		error: {
			name: 'CombinedError',
			message,
			graphQLErrors: [{ message }]
		},
		fetching: false,
		stale: false
	};
}

/**
 * Mock events query response for calendar
 */
export const mockEventsQuery = {
	events: {
		nodes: [
			{
				id: '1',
				title: 'Team Meeting',
				startTime: '2025-10-15T10:00:00',
				endTime: '2025-10-15T11:00:00',
				allDay: false,
				type: 'meeting',
				visibility: 'public',
				isRecurring: false,
				rrule: null,
				capacity: null,
				attendeeCount: 5,
				waitlistCount: 0,
				userRsvpStatus: 'pending'
			},
			{
				id: '2',
				title: 'Code Review',
				startTime: '2025-10-20T14:00:00',
				endTime: '2025-10-20T15:00:00',
				allDay: false,
				type: 'meeting',
				visibility: 'public',
				isRecurring: false,
				rrule: null,
				capacity: null,
				attendeeCount: 3,
				waitlistCount: 0,
				userRsvpStatus: 'accepted'
			}
		],
		totalCount: 2
	}
};

/**
 * Mock tasks query response
 */
export const mockTasksQuery = {
	tasks: {
		nodes: [
			{
				id: 'task-1',
				title: 'Implement Feature',
				description: 'Add new feature to the app',
				status: 'TODO',
				priority: 'HIGH',
				dueDate: '2025-12-31',
				assigneeId: 'user-1',
				createdAt: '2025-10-01T08:00:00'
			},
			{
				id: 'task-2',
				title: 'Fix Bug',
				description: 'Fix critical bug',
				status: 'IN_PROGRESS',
				priority: 'CRITICAL',
				dueDate: '2025-10-20',
				assigneeId: 'user-2',
				createdAt: '2025-10-05T09:00:00'
			}
		],
		totalCount: 2
	}
};

/**
 * Mock employees query response
 */
export const mockEmployeesQuery = {
	employees: {
		nodes: [
			{
				id: 'user-1',
				displayName: 'John Doe',
				email: 'john@example.com',
				department: 'Engineering',
				role: 'Developer'
			},
			{
				id: 'user-2',
				displayName: 'Jane Smith',
				email: 'jane@example.com',
				department: 'Engineering',
				role: 'Manager'
			}
		],
		totalCount: 2
	}
};

/**
 * Mock departments query response
 */
export const mockDepartmentsQuery = {
	departments: {
		nodes: [
			{
				id: 'dept-1',
				name: 'Engineering',
				description: 'Engineering department',
				employeeCount: 10
			},
			{
				id: 'dept-2',
				name: 'Marketing',
				description: 'Marketing department',
				employeeCount: 5
			}
		],
		totalCount: 2
	}
};

/**
 * Mock create event mutation response
 */
export const mockCreateEventMutation = {
	createEvent: {
		event: {
			id: 'new-event-1',
			title: 'New Event',
			startTime: '2025-10-25T10:00:00',
			endTime: '2025-10-25T11:00:00',
			allDay: false,
			type: 'meeting',
			visibility: 'public'
		}
	}
};

/**
 * Mock update RSVP mutation response
 */
export const mockUpdateRsvpMutation = {
	updateRsvp: {
		rsvp: {
			eventId: 'event-1',
			userId: 'user-1',
			status: 'accepted',
			updatedAt: new Date().toISOString()
		}
	}
};

/**
 * Mock create task mutation response
 */
export const mockCreateTaskMutation = {
	createTask: {
		task: {
			id: 'new-task-1',
			title: 'New Task',
			description: 'Task description',
			status: 'TODO',
			priority: 'MEDIUM',
			assigneeId: 'user-1'
		}
	}
};

/**
 * Create a mock urql client that rejects all operations (for error testing)
 */
export function createFailingMockUrqlClient(errorMessage: string = 'Network Error') {
	return {
		query: vi.fn(() => ({
			toPromise: () => Promise.reject(new Error(errorMessage))
		})),
		mutation: vi.fn(() => ({
			toPromise: () => Promise.reject(new Error(errorMessage))
		})),
		subscription: vi.fn(() => ({
			subscribe: vi.fn((handlers: any) => {
				if (handlers.error) {
					setTimeout(() => handlers.error(new Error(errorMessage)), 0);
				}
				return { unsubscribe: vi.fn() };
			})
		}))
	};
}

/**
 * Create a mock urql client with delayed responses (for loading state testing)
 */
export function createDelayedMockUrqlClient(
	delay: number = 1000,
	responses: Record<string, any> = {}
) {
	return {
		query: vi.fn((query: any) => ({
			toPromise: () => {
				const queryName = query.definitions?.[0]?.name?.value || 'unknown';
				const response = responses[queryName] || { data: null };
				return new Promise((resolve) => setTimeout(() => resolve(response), delay));
			}
		})),
		mutation: vi.fn((mutation: any) => ({
			toPromise: () => {
				const mutationName = mutation.definitions?.[0]?.name?.value || 'unknown';
				const response = responses[mutationName] || { data: { success: true } };
				return new Promise((resolve) => setTimeout(() => resolve(response), delay));
			}
		})),
		subscription: vi.fn(() => ({
			subscribe: vi.fn()
		}))
	};
}
