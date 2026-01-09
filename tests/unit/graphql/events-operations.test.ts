import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsOperations } from '$lib/graphql/events/service';
import { GET_ALL_EVENTS } from '$lib/graphql/events/queries';
import { CREATE_EVENT } from '$lib/graphql/events/mutations';
import { Client } from '@urql/core';

// Mock urql Client
const mockQuery = vi.fn();
const mockMutation = vi.fn();

const mockClient = {
	query: mockQuery,
	mutation: mockMutation
} as unknown as Client;

describe('EventsOperations', () => {
	let service: EventsOperations;
	const userCredentials = {
		userId: '123',
		roles: ['user'],
		permissions: [],
		isAuthenticated: true
	} as any;

	beforeEach(() => {
		service = new EventsOperations(mockClient);
		vi.clearAllMocks();
	});

	describe('getAllEvents', () => {
		it('should fetch events successfully', async () => {
			const mockEvents = [{ id: '1', title: 'Test Event' }];
			mockQuery.mockReturnValue({
				toPromise: () => Promise.resolve({ data: { events: mockEvents }, error: undefined })
			});

			const result = await service.getAllEvents({ userCredentials });

			expect(result.events).toEqual(mockEvents);
			expect(result.totalCount).toBe(1);
			expect(mockQuery).toHaveBeenCalled();
		});

		it('should handle errors', async () => {
			mockQuery.mockReturnValue({
				toPromise: () => Promise.resolve({ data: null, error: new Error('GraphQL Error') })
			});

			await expect(service.getAllEvents({ userCredentials })).rejects.toThrow();
		});
	});

	describe('createEvent', () => {
		it('should create event successfully', async () => {
			const input = {
				title: 'New Event',
				description: 'Desc',
				eventType: 'meeting',
				startTime: '2023-01-01T10:00:00Z',
				endTime: '2023-01-01T11:00:00Z',
				isAllDay: false,
				organizerId: '123',
				isPublic: true,
				status: 'scheduled' as const
			};
			const mockEvent = { id: '1', ...input };

			mockMutation.mockReturnValue({
				toPromise: () => Promise.resolve({ data: { createEvent: mockEvent }, error: undefined })
			});

			const result = await service.createEvent({ input, userCredentials });

			expect(result).toEqual(mockEvent);
			expect(mockMutation).toHaveBeenCalled();
		});

		it('should validate input', async () => {
			const input = {
				title: '', // Invalid
				description: 'Desc',
				eventType: 'meeting',
				startTime: '2023-01-01T10:00:00Z',
				endTime: '2023-01-01T11:00:00Z',
				isAllDay: false,
				organizerId: '123',
				isPublic: true,
				status: 'scheduled' as const
			};

			await expect(service.createEvent({ input, userCredentials })).rejects.toThrow();
			expect(mockMutation).not.toHaveBeenCalled();
		});
	});
});
