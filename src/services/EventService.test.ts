// src/services/EventService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventService } from './EventService';
import type { EventRepository } from './ports/EventRepository';
import { Result } from '$domain/Result';
import { Event, EventNotFoundError, EventValidationError, EventError } from '$domain/Event';

// Mock repository
class MockEventRepository implements EventRepository {
	findById = vi.fn();
	findAll = vi.fn();
	create = vi.fn();
	update = vi.fn();
	delete = vi.fn();
	addAttendee = vi.fn();
	updateAttendeeResponse = vi.fn();
	setAttendeeReminder = vi.fn();
}

describe('EventService', () => {
	let service: EventService;
	let repository: MockEventRepository;

	const createMockEvent = (id: string): Event => ({ id }) as unknown as Event;

	beforeEach(() => {
		repository = new MockEventRepository();
		service = new EventService(repository);
	});

	describe('getEventById', () => {
		it('should return event when found', async () => {
			const mockEvent = createMockEvent('evt-1');

			repository.findById.mockResolvedValue(Result.ok(mockEvent));

			const result = await service.getEventById('evt-1');

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockEvent);
			expect(repository.findById).toHaveBeenCalledWith('evt-1');
		});

		it('should return error when event not found', async () => {
			repository.findById.mockResolvedValue(Result.error(new EventNotFoundError('evt-1')));

			const result = await service.getEventById('evt-1');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventNotFoundError);
		});

		it('should handle repository errors gracefully', async () => {
			repository.findById.mockRejectedValue(new Error('Database connection failed'));

			const result = await service.getEventById('evt-1');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to fetch event');
		});
	});

	describe('getAllEvents', () => {
		it('should return all events without filter', async () => {
			const mockEvents = [createMockEvent('evt-1'), createMockEvent('evt-2')];

			repository.findAll.mockResolvedValue(Result.ok(mockEvents));

			const result = await service.getAllEvents();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(repository.findAll).toHaveBeenCalledWith(undefined);
		});

		it('should apply filter when provided', async () => {
			const filter = { type: 'meeting', status: 'scheduled', limit: 20 };
			repository.findAll.mockResolvedValue(Result.ok([]));

			await service.getAllEvents(filter);

			expect(repository.findAll).toHaveBeenCalledWith(filter);
		});

		it('should handle repository errors gracefully', async () => {
			repository.findAll.mockRejectedValue(new Error('Query timeout'));

			const result = await service.getAllEvents();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to fetch events');
		});
	});

	describe('createEvent', () => {
		it('should create event successfully', async () => {
			const data = {
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
			};

			const mockEvent = createMockEvent('evt-new');

			repository.create.mockResolvedValue(Result.ok(mockEvent));

			const result = await service.createEvent(data);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockEvent);
			expect(repository.create).toHaveBeenCalledWith(data);
		});

		it('should return validation error for invalid data', async () => {
			const data = {
				title: '',
				eventType: 'meeting',
				startTime: '2026-03-01T10:00:00Z',
				endTime: '2026-03-01T11:00:00Z',
				isAllDay: false,
				organizerId: 'org-1',
				isPublic: true,
				status: 'scheduled'
			};

			repository.create.mockResolvedValue(
				Result.error(new EventValidationError('Title cannot be empty'))
			);

			const result = await service.createEvent(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventValidationError);
		});

		it('should handle repository errors gracefully', async () => {
			const data = {
				title: 'Event',
				eventType: 'meeting',
				startTime: '2026-03-01T10:00:00Z',
				endTime: '2026-03-01T11:00:00Z',
				isAllDay: false,
				organizerId: 'org-1',
				isPublic: true,
				status: 'scheduled'
			};

			repository.create.mockRejectedValue(new Error('Insert failed'));

			const result = await service.createEvent(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventValidationError);
			expect(result.error.message).toContain('Failed to create event');
		});
	});

	describe('updateEvent', () => {
		it('should update event successfully', async () => {
			const data = {
				title: 'Updated Title',
				status: 'completed'
			};

			const mockEvent = createMockEvent('evt-1');

			repository.update.mockResolvedValue(Result.ok(mockEvent));

			const result = await service.updateEvent('evt-1', data);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(mockEvent);
			expect(repository.update).toHaveBeenCalledWith('evt-1', data);
		});

		it('should handle repository errors gracefully', async () => {
			repository.update.mockRejectedValue(new Error('Update failed'));

			const result = await service.updateEvent('evt-1', { title: 'New' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to update event');
		});
	});

	describe('deleteEvent', () => {
		it('should delete event successfully', async () => {
			repository.delete.mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteEvent('evt-1');

			expect(result.isOk).toBe(true);
			expect(repository.delete).toHaveBeenCalledWith('evt-1');
		});

		it('should return error when event not found', async () => {
			repository.delete.mockResolvedValue(Result.error(new EventNotFoundError('evt-1')));

			const result = await service.deleteEvent('evt-1');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventNotFoundError);
		});

		it('should handle repository errors gracefully', async () => {
			repository.delete.mockRejectedValue(new Error('Delete failed'));

			const result = await service.deleteEvent('evt-1');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to delete event');
		});
	});

	describe('addAttendee', () => {
		it('should add attendee successfully', async () => {
			const data = {
				eventId: 'evt-1',
				employeeId: 'emp-1',
				responseStatus: 'pending',
				isRequired: true
			};

			repository.addAttendee.mockResolvedValue(Result.ok(undefined));

			const result = await service.addAttendee(data);

			expect(result.isOk).toBe(true);
			expect(repository.addAttendee).toHaveBeenCalledWith(data);
		});

		it('should handle repository errors gracefully', async () => {
			const data = {
				eventId: 'evt-1',
				employeeId: 'emp-1',
				responseStatus: 'pending'
			};

			repository.addAttendee.mockRejectedValue(new Error('Insert failed'));

			const result = await service.addAttendee(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to add attendee');
		});
	});

	describe('updateRsvp', () => {
		it('should update RSVP successfully', async () => {
			const data = {
				attendeeId: 'att-1',
				responseStatus: 'accepted'
			};

			repository.updateAttendeeResponse.mockResolvedValue(Result.ok(undefined));

			const result = await service.updateRsvp(data);

			expect(result.isOk).toBe(true);
			expect(repository.updateAttendeeResponse).toHaveBeenCalledWith(data);
		});

		it('should handle repository errors gracefully', async () => {
			const data = {
				attendeeId: 'att-1',
				responseStatus: 'declined'
			};

			repository.updateAttendeeResponse.mockRejectedValue(new Error('Update failed'));

			const result = await service.updateRsvp(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to update RSVP');
		});
	});

	describe('setReminder', () => {
		it('should set reminder successfully', async () => {
			const data = {
				attendeeId: 'att-1',
				reminderTime: '2026-03-01T09:45:00Z'
			};

			repository.setAttendeeReminder.mockResolvedValue(Result.ok(undefined));

			const result = await service.setReminder(data);

			expect(result.isOk).toBe(true);
			expect(repository.setAttendeeReminder).toHaveBeenCalledWith(data);
		});

		it('should handle repository errors gracefully', async () => {
			const data = {
				attendeeId: 'att-1',
				reminderTime: '2026-03-01T09:45:00Z'
			};

			repository.setAttendeeReminder.mockRejectedValue(new Error('Update failed'));

			const result = await service.setReminder(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to set reminder');
		});
	});

	describe('getUpcomingEvents', () => {
		it('should return upcoming events with default limit', async () => {
			repository.findAll.mockResolvedValue(Result.ok([]));

			await service.getUpcomingEvents();

			expect(repository.findAll).toHaveBeenCalledWith({
				upcomingOnly: true,
				limit: 10
			});
		});

		it('should return upcoming events with custom limit', async () => {
			repository.findAll.mockResolvedValue(Result.ok([]));

			await service.getUpcomingEvents(20);

			expect(repository.findAll).toHaveBeenCalledWith({
				upcomingOnly: true,
				limit: 20
			});
		});

		it('should handle repository errors gracefully', async () => {
			repository.findAll.mockRejectedValue(new Error('Query failed'));

			const result = await service.getUpcomingEvents();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to fetch upcoming events');
		});
	});

	describe('getUserEvents', () => {
		it('should return user events with default limit', async () => {
			repository.findAll.mockResolvedValue(Result.ok([]));

			await service.getUserEvents('emp-1');

			expect(repository.findAll).toHaveBeenCalledWith({
				employeeId: 'emp-1',
				limit: 50
			});
		});

		it('should return user events with custom limit', async () => {
			repository.findAll.mockResolvedValue(Result.ok([]));

			await service.getUserEvents('emp-1', 100);

			expect(repository.findAll).toHaveBeenCalledWith({
				employeeId: 'emp-1',
				limit: 100
			});
		});

		it('should handle repository errors gracefully', async () => {
			repository.findAll.mockRejectedValue(new Error('Query failed'));

			const result = await service.getUserEvents('emp-1');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(EventError);
			expect(result.error.message).toContain('Failed to fetch user events');
		});
	});
});
