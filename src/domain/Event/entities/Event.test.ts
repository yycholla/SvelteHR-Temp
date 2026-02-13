import { describe, it, expect } from 'vitest';
import { Event, EventProps } from './Event';
import { EventStatus } from '../value-objects/EventStatus';
import { EventType } from '../value-objects/EventType';
import { EventTitle } from '../value-objects/EventTitle';
import { EventDescription } from '../value-objects/EventDescription';
import { EventTime } from '../value-objects/EventTime';
import { Location } from '../value-objects/Location';
import { EventColor } from '../value-objects/EventColor';
import { EventAttendee } from './EventAttendee';
import { RsvpStatus } from '../value-objects/RsvpStatus';

describe('Event Entity', () => {
	// Helper to create valid props
	const createValidProps = (): EventProps => {
		const status = EventStatus.create('scheduled').value;
		const eventType = EventType.create('meeting').value;
		const title = EventTitle.create('Team Standup').value;
		const description = EventDescription.create('Daily standup meeting').value;
		const eventTime = EventTime.create(
			new Date('2026-03-01T09:00:00Z'),
			new Date('2026-03-01T10:00:00Z')
		).value;
		const location = Location.create('Conference Room A').value;
		const color = EventColor.create('#3B82F6').value;

		return {
			id: 'evt-123',
			title,
			description,
			eventType,
			eventTime,
			location,
			organizerId: 'org-456',
			status,
			color,
			isPublic: true,
			isAllDay: false,
			attendees: [],
			createdAt: new Date('2026-02-01T00:00:00Z'),
			updatedAt: new Date('2026-02-01T00:00:00Z')
		};
	};

	const createAttendee = (id: string, employeeId: string): EventAttendee => {
		const rsvp = RsvpStatus.create('pending').value;
		return EventAttendee.create({
			id,
			eventId: 'evt-123',
			employeeId,
			responseStatus: rsvp,
			isRequired: false,
			isOrganizer: false,
			reminderTime: null,
			createdAt: new Date(),
			updatedAt: new Date()
		}).value;
	};

	describe('create()', () => {
		it('should create Event with valid props', () => {
			const props = createValidProps();
			const result = Event.create(props);

			expect(result.isOk).toBe(true);
			const event = result.value;
			expect(event.id).toBe('evt-123');
			expect(event.title.value).toBe('Team Standup');
			expect(event.organizerId).toBe('org-456');
		});

		it('should reject empty ID', () => {
			const props = createValidProps();
			props.id = '';
			const result = Event.create(props);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('ID is required');
		});

		it('should reject whitespace-only ID', () => {
			const props = createValidProps();
			props.id = '   ';
			const result = Event.create(props);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('ID is required');
		});

		it('should reject empty organizerId', () => {
			const props = createValidProps();
			props.organizerId = '';
			const result = Event.create(props);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Organizer ID is required');
		});

		it('should reject whitespace-only organizerId', () => {
			const props = createValidProps();
			props.organizerId = '   ';
			const result = Event.create(props);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Organizer ID is required');
		});

		it('should create defensive copies of input dates', () => {
			const props = createValidProps();
			const originalCreated = new Date(props.createdAt.getTime());
			const originalUpdated = new Date(props.updatedAt.getTime());

			const result = Event.create(props);
			expect(result.isOk).toBe(true);

			// Mutate original dates
			props.createdAt.setFullYear(2000);
			props.updatedAt.setFullYear(2000);

			// Event should have original values
			expect(result.value.createdAt).toEqual(originalCreated);
			expect(result.value.updatedAt).toEqual(originalUpdated);
		});

		it('should create defensive copies of attendees array', () => {
			const props = createValidProps();
			const attendee1 = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee1];

			const result = Event.create(props);
			expect(result.isOk).toBe(true);
			const event = result.value;

			// Mutate original array
			props.attendees.push(createAttendee('att-2', 'emp-2'));

			// Event should have original attendees
			expect(event.attendees.length).toBe(1);
		});
	});

	describe('Getters', () => {
		it('should expose all properties', () => {
			const props = createValidProps();
			const event = Event.create(props).value;

			expect(event.id).toBe('evt-123');
			expect(event.title.value).toBe('Team Standup');
			expect(event.description.value).toBe('Daily standup meeting');
			expect(event.eventType.value).toBe('meeting');
			expect(event.location.value).toBe('Conference Room A');
			expect(event.organizerId).toBe('org-456');
			expect(event.status.value).toBe('scheduled');
			expect(event.color.value).toBe('#3B82F6');
			expect(event.isPublic).toBe(true);
			expect(event.isAllDay).toBe(false);
			expect(event.attendees).toEqual([]);
		});

		it('should return defensive copies of createdAt', () => {
			const props = createValidProps();
			const event = Event.create(props).value;

			const date1 = event.createdAt;
			const date2 = event.createdAt;

			expect(date1).toEqual(date2);
			expect(date1).not.toBe(date2); // Different instances

			// Mutating returned date should not affect internal state
			date1.setFullYear(2000);
			expect(event.createdAt.getFullYear()).toBe(2026);
		});

		it('should return defensive copies of updatedAt', () => {
			const props = createValidProps();
			const event = Event.create(props).value;

			const date1 = event.updatedAt;
			const date2 = event.updatedAt;

			expect(date1).toEqual(date2);
			expect(date1).not.toBe(date2); // Different instances

			// Mutating returned date should not affect internal state
			date1.setFullYear(2000);
			expect(event.updatedAt.getFullYear()).toBe(2026);
		});

		it('should return defensive copies of attendees array', () => {
			const props = createValidProps();
			const attendee1 = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee1];
			const event = Event.create(props).value;

			const attendees1 = event.attendees;
			const attendees2 = event.attendees;

			expect(attendees1).toEqual(attendees2);
			expect(attendees1).not.toBe(attendees2); // Different array instances

			// Mutating returned array should not affect internal state
			attendees1.push(createAttendee('att-2', 'emp-2'));
			expect(event.attendees.length).toBe(1);
		});
	});

	describe('updateStatus()', () => {
		it('should update status and updatedAt timestamp', () => {
			const props = createValidProps();
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('ongoing').value;
			const result = event.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			const updated = result.value;
			expect(updated.status.value).toBe('ongoing');
			expect(updated.updatedAt.getTime()).toBeGreaterThan(event.updatedAt.getTime());
		});

		it('should allow valid transition from scheduled to ongoing', () => {
			const props = createValidProps();
			props.status = EventStatus.create('scheduled').value;
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('ongoing').value;
			const result = event.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('ongoing');
		});

		it('should allow valid transition from scheduled to cancelled', () => {
			const props = createValidProps();
			props.status = EventStatus.create('scheduled').value;
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('cancelled').value;
			const result = event.updateStatus(newStatus);

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('cancelled');
		});

		it('should reject invalid transition from completed to scheduled', () => {
			const props = createValidProps();
			props.status = EventStatus.create('completed').value;
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('scheduled').value;
			const result = event.updateStatus(newStatus);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Cannot transition from completed to scheduled');
		});

		it('should reject invalid transition from cancelled to ongoing', () => {
			const props = createValidProps();
			props.status = EventStatus.create('cancelled').value;
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('ongoing').value;
			const result = event.updateStatus(newStatus);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Cannot transition from cancelled to ongoing');
		});

		it('should preserve immutability (original unchanged)', () => {
			const props = createValidProps();
			const event = Event.create(props).value;
			const originalStatus = event.status.value;

			const newStatus = EventStatus.create('ongoing').value;
			event.updateStatus(newStatus);

			expect(event.status.value).toBe(originalStatus);
		});
	});

	describe('addAttendee()', () => {
		it('should add attendee to empty list', () => {
			const props = createValidProps();
			const event = Event.create(props).value;
			const attendee = createAttendee('att-1', 'emp-1');

			const result = event.addAttendee(attendee);

			expect(result.isOk).toBe(true);
			const updated = result.value;
			expect(updated.attendees.length).toBe(1);
			expect(updated.attendees[0].id).toBe('att-1');
		});

		it('should add attendee to existing list', () => {
			const props = createValidProps();
			const attendee1 = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee1];
			const event = Event.create(props).value;

			const attendee2 = createAttendee('att-2', 'emp-2');
			const result = event.addAttendee(attendee2);

			expect(result.isOk).toBe(true);
			const updated = result.value;
			expect(updated.attendees.length).toBe(2);
			expect(updated.attendees[1].id).toBe('att-2');
		});

		it('should update updatedAt timestamp', () => {
			const props = createValidProps();
			const event = Event.create(props).value;
			const attendee = createAttendee('att-1', 'emp-1');

			const result = event.addAttendee(attendee);

			expect(result.isOk).toBe(true);
			expect(result.value.updatedAt.getTime()).toBeGreaterThan(event.updatedAt.getTime());
		});

		it('should reject duplicate attendee by ID', () => {
			const props = createValidProps();
			const attendee1 = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee1];
			const event = Event.create(props).value;

			// Try to add attendee with same ID
			const duplicate = createAttendee('att-1', 'emp-999');
			const result = event.addAttendee(duplicate);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Attendee with ID att-1 already exists');
		});

		it('should preserve immutability (original unchanged)', () => {
			const props = createValidProps();
			const event = Event.create(props).value;
			const attendee = createAttendee('att-1', 'emp-1');

			event.addAttendee(attendee);

			expect(event.attendees.length).toBe(0);
		});
	});

	describe('removeAttendee()', () => {
		it('should remove attendee by ID', () => {
			const props = createValidProps();
			const attendee1 = createAttendee('att-1', 'emp-1');
			const attendee2 = createAttendee('att-2', 'emp-2');
			props.attendees = [attendee1, attendee2];
			const event = Event.create(props).value;

			const result = event.removeAttendee('att-1');

			expect(result.isOk).toBe(true);
			const updated = result.value;
			expect(updated.attendees.length).toBe(1);
			expect(updated.attendees[0].id).toBe('att-2');
		});

		it('should update updatedAt timestamp', () => {
			const props = createValidProps();
			const attendee = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee];
			const event = Event.create(props).value;

			const result = event.removeAttendee('att-1');

			expect(result.isOk).toBe(true);
			expect(result.value.updatedAt.getTime()).toBeGreaterThan(event.updatedAt.getTime());
		});

		it('should reject removing non-existent attendee', () => {
			const props = createValidProps();
			const attendee = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee];
			const event = Event.create(props).value;

			const result = event.removeAttendee('att-999');

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Attendee with ID att-999 not found');
		});

		it('should preserve immutability (original unchanged)', () => {
			const props = createValidProps();
			const attendee = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee];
			const event = Event.create(props).value;

			event.removeAttendee('att-1');

			expect(event.attendees.length).toBe(1);
		});
	});

	describe('equals()', () => {
		it('should return true for same ID', () => {
			const props1 = createValidProps();
			props1.id = 'evt-123';
			const event1 = Event.create(props1).value;

			const props2 = createValidProps();
			props2.id = 'evt-123';
			props2.title = EventTitle.create('Different Title').value;
			const event2 = Event.create(props2).value;

			expect(event1.equals(event2)).toBe(true);
		});

		it('should return false for different IDs', () => {
			const props1 = createValidProps();
			props1.id = 'evt-123';
			const event1 = Event.create(props1).value;

			const props2 = createValidProps();
			props2.id = 'evt-456';
			const event2 = Event.create(props2).value;

			expect(event1.equals(event2)).toBe(false);
		});
	});

	describe('toString()', () => {
		it('should format as "Event: {title} ({status})"', () => {
			const props = createValidProps();
			const event = Event.create(props).value;

			const str = event.toString();

			expect(str).toBe('Event: Team Standup (scheduled)');
		});

		it('should include updated status', () => {
			const props = createValidProps();
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('ongoing').value;
			const updated = event.updateStatus(newStatus).value;

			expect(updated.toString()).toBe('Event: Team Standup (ongoing)');
		});
	});

	describe('Immutability', () => {
		it('should return new instance from updateStatus', () => {
			const props = createValidProps();
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('ongoing').value;
			const updated = event.updateStatus(newStatus).value;

			expect(updated).not.toBe(event);
		});

		it('should return new instance from addAttendee', () => {
			const props = createValidProps();
			const event = Event.create(props).value;
			const attendee = createAttendee('att-1', 'emp-1');

			const updated = event.addAttendee(attendee).value;

			expect(updated).not.toBe(event);
		});

		it('should return new instance from removeAttendee', () => {
			const props = createValidProps();
			const attendee = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee];
			const event = Event.create(props).value;

			const updated = event.removeAttendee('att-1').value;

			expect(updated).not.toBe(event);
		});
	});

	describe('Edge Cases', () => {
		it('should handle multiple attendees correctly', () => {
			const props = createValidProps();
			const attendee1 = createAttendee('att-1', 'emp-1');
			const attendee2 = createAttendee('att-2', 'emp-2');
			const attendee3 = createAttendee('att-3', 'emp-3');
			props.attendees = [attendee1, attendee2, attendee3];
			const event = Event.create(props).value;

			expect(event.attendees.length).toBe(3);

			// Remove middle attendee
			const updated = event.removeAttendee('att-2').value;
			expect(updated.attendees.length).toBe(2);
			expect(updated.attendees[0].id).toBe('att-1');
			expect(updated.attendees[1].id).toBe('att-3');
		});

		it('should preserve all properties when updating status', () => {
			const props = createValidProps();
			const attendee = createAttendee('att-1', 'emp-1');
			props.attendees = [attendee];
			props.isPublic = false;
			props.isAllDay = true;
			const event = Event.create(props).value;

			const newStatus = EventStatus.create('ongoing').value;
			const updated = event.updateStatus(newStatus).value;

			// Status should change
			expect(updated.status.value).toBe('ongoing');

			// Other properties should be preserved
			expect(updated.id).toBe(event.id);
			expect(updated.title.value).toBe(event.title.value);
			expect(updated.organizerId).toBe(event.organizerId);
			expect(updated.isPublic).toBe(false);
			expect(updated.isAllDay).toBe(true);
			expect(updated.attendees.length).toBe(1);
			expect(updated.attendees[0].id).toBe('att-1');
		});
	});
});
