// src/adapters/graphql/GraphQLEventAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLEventAdapter } from './GraphQLEventAdapter';
import { EventNotFoundError } from '$domain/Event';
import { Client } from '@urql/core';

// Mock URQL client
function createMockClient(responses: Record<string, unknown>): Client {
	return {
		query: (query: unknown, variables: unknown) => ({
			toPromise: async () => responses['query'] ?? { data: null, error: null }
		}),
		mutation: (mutation: unknown, variables: unknown) => ({
			toPromise: async () => responses['mutation'] ?? { data: null, error: null }
		})
	} as unknown as Client;
}

describe('GraphQLEventAdapter', () => {
	describe('findById', () => {
		it('should return event when found', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						event: {
							id: 'evt-123',
							title: 'Team Meeting',
							description: 'Weekly sync',
							eventType: 'meeting',
							startTime: '2026-03-01T10:00:00Z',
							endTime: '2026-03-01T11:00:00Z',
							isAllDay: false,
							location: 'Conference Room A',
							organizerId: 'org-1',
							isPublic: true,
							status: 'scheduled',
							color: '#3b82f6',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z',
							attendees: []
						}
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.findById('evt-123');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('evt-123');
			expect(result.value.title.value).toBe('Team Meeting');
			expect(result.value.location?.value).toBe('Conference Room A');
		});

		it('should return error when event not found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { event: null }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventNotFoundError);
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Network error' }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.findById('evt-123');

			expect(result.isError).toBe(true);
		});
	});

	describe('findAll', () => {
		it('should return all events', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						events: [
							{
								id: 'evt-1',
								title: 'Event 1',
								description: 'Description 1',
								eventType: 'meeting',
								startTime: '2026-03-01T10:00:00Z',
								endTime: '2026-03-01T11:00:00Z',
								isAllDay: false,
								location: 'Room A',
								organizerId: 'org-1',
								isPublic: true,
								status: 'scheduled',
								color: '#3b82f6',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								attendees: []
							},
							{
								id: 'evt-2',
								title: 'Event 2',
								description: 'Description 2',
								eventType: 'training',
								startTime: '2026-03-02T14:00:00Z',
								endTime: '2026-03-02T16:00:00Z',
								isAllDay: false,
								location: 'Room B',
								organizerId: 'org-2',
								isPublic: false,
								status: 'scheduled',
								color: '#10b981',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								attendees: []
							}
						]
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0].title.value).toBe('Event 1');
			expect(result.value[1].title.value).toBe('Event 2');
		});

		it('should filter by employeeId', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						events: [
							{
								id: 'evt-1',
								title: 'Event 1',
								eventType: 'meeting',
								startTime: '2026-03-01T10:00:00Z',
								endTime: '2026-03-01T11:00:00Z',
								isAllDay: false,
								organizerId: 'org-1',
								isPublic: true,
								status: 'scheduled',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								attendees: [{ id: 'att-1', employeeId: 'emp-1', responseStatus: 'accepted' }]
							},
							{
								id: 'evt-2',
								title: 'Event 2',
								eventType: 'training',
								startTime: '2026-03-02T14:00:00Z',
								endTime: '2026-03-02T16:00:00Z',
								isAllDay: false,
								organizerId: 'org-2',
								isPublic: false,
								status: 'scheduled',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								attendees: [{ id: 'att-2', employeeId: 'emp-2', responseStatus: 'pending' }]
							}
						]
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.findAll({ employeeId: 'emp-1' });

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe('evt-1');
		});

		it('should return empty array when no events found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { events: [] }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should skip invalid events', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						events: [
							{
								id: 'evt-1',
								title: 'Valid Event',
								eventType: 'meeting',
								startTime: '2026-03-01T10:00:00Z',
								endTime: '2026-03-01T11:00:00Z',
								isAllDay: false,
								organizerId: 'org-1',
								isPublic: true,
								status: 'scheduled',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								attendees: []
							},
							{
								id: 'evt-2',
								title: '', // Invalid - empty title
								eventType: 'meeting',
								startTime: '2026-03-01T10:00:00Z',
								endTime: '2026-03-01T11:00:00Z',
								isAllDay: false,
								organizerId: 'org-1',
								isPublic: true,
								status: 'scheduled',
								createdAt: '2026-02-11T10:00:00Z',
								updatedAt: '2026-02-11T10:00:00Z',
								attendees: []
							}
						]
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1); // Only valid event
			expect(result.value[0].title.value).toBe('Valid Event');
		});
	});

	describe('create', () => {
		it('should create event', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						createEvent: {
							id: 'evt-new',
							title: 'New Event',
							description: 'Description',
							eventType: 'meeting',
							startTime: '2026-03-01T10:00:00Z',
							endTime: '2026-03-01T11:00:00Z',
							isAllDay: false,
							location: 'Room A',
							organizerId: 'org-1',
							isPublic: true,
							status: 'scheduled',
							color: '#3b82f6',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-11T10:00:00Z',
							attendees: []
						}
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.create({
				title: 'New Event',
				description: 'Description',
				eventType: 'meeting',
				startTime: '2026-03-01T10:00:00Z',
				endTime: '2026-03-01T11:00:00Z',
				isAllDay: false,
				location: 'Room A',
				organizerId: 'org-1',
				isPublic: true,
				status: 'scheduled',
				color: '#3b82f6'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('New Event');
		});

		it('should handle creation errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Validation error' }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.create({
				title: 'Event',
				eventType: 'meeting',
				startTime: '2026-03-01T10:00:00Z',
				endTime: '2026-03-01T11:00:00Z',
				isAllDay: false,
				organizerId: 'org-1',
				isPublic: true,
				status: 'scheduled'
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update event', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						updateEvent: {
							id: 'evt-1',
							title: 'Updated Title',
							eventType: 'meeting',
							startTime: '2026-03-01T10:00:00Z',
							endTime: '2026-03-01T11:00:00Z',
							isAllDay: false,
							organizerId: 'org-1',
							isPublic: true,
							status: 'completed',
							createdAt: '2026-02-11T10:00:00Z',
							updatedAt: '2026-02-13T10:00:00Z',
							attendees: []
						}
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.update('evt-1', {
				title: 'Updated Title',
				status: 'completed'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated Title');
			expect(result.value.status.value).toBe('completed');
		});

		it('should handle update errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Not found' }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.update('evt-1', { title: 'New' });

			expect(result.isError).toBe(true);
		});
	});

	describe('delete', () => {
		it('should delete event', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: { deleteEvent: true }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.delete('evt-1');

			expect(result.isOk).toBe(true);
		});

		it('should handle deletion errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Not found' }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.delete('evt-1');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventNotFoundError);
		});
	});

	describe('addAttendee', () => {
		it('should add attendee', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						createEventAttendee: {
							id: 'att-1',
							eventId: 'evt-1',
							employeeId: 'emp-1',
							responseStatus: 'pending',
							isRequired: true
						}
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.addAttendee({
				eventId: 'evt-1',
				employeeId: 'emp-1',
				responseStatus: 'pending',
				isRequired: true
			});

			expect(result.isOk).toBe(true);
		});

		it('should handle add attendee errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Invalid employee' }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.addAttendee({
				eventId: 'evt-1',
				employeeId: 'emp-1',
				responseStatus: 'pending'
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('updateAttendeeResponse', () => {
		it('should update RSVP', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						updateEventAttendee: {
							id: 'att-1',
							responseStatus: 'accepted'
						}
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.updateAttendeeResponse({
				attendeeId: 'att-1',
				responseStatus: 'accepted'
			});

			expect(result.isOk).toBe(true);
		});

		it('should handle update errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Not found' }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.updateAttendeeResponse({
				attendeeId: 'att-1',
				responseStatus: 'declined'
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('setAttendeeReminder', () => {
		it('should set reminder', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: {
						updateEventAttendee: {
							id: 'att-1',
							reminderTime: '2026-03-01T09:45:00Z'
						}
					}
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.setAttendeeReminder({
				attendeeId: 'att-1',
				reminderTime: '2026-03-01T09:45:00Z'
			});

			expect(result.isOk).toBe(true);
		});

		it('should handle set reminder errors', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Not found' }
				}
			});

			const adapter = new GraphQLEventAdapter(mockClient);
			const result = await adapter.setAttendeeReminder({
				attendeeId: 'att-1',
				reminderTime: '2026-03-01T09:45:00Z'
			});

			expect(result.isError).toBe(true);
		});
	});
});
