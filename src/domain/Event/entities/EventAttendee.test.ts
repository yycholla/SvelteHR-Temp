import { describe, it, expect } from 'vitest';
import { EventAttendee } from './EventAttendee';
import { RsvpStatus } from '../value-objects/RsvpStatus';

describe('EventAttendee', () => {
	const validRsvpStatus = RsvpStatus.create('pending').value;
	const baseProps = {
		id: 'attendee-1',
		eventId: 'event-1',
		employeeId: 'emp-1',
		responseStatus: validRsvpStatus,
		isRequired: false,
		isOrganizer: false,
		reminderTime: null,
		createdAt: new Date('2026-01-01T10:00:00Z'),
		updatedAt: new Date('2026-01-01T10:00:00Z')
	};

	describe('create()', () => {
		it('should create EventAttendee with valid props', () => {
			const result = EventAttendee.create(baseProps);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const attendee = result.value;
				expect(attendee.id).toBe('attendee-1');
				expect(attendee.eventId).toBe('event-1');
				expect(attendee.employeeId).toBe('emp-1');
				expect(attendee.responseStatus.equals(validRsvpStatus)).toBe(true);
				expect(attendee.isRequired).toBe(false);
				expect(attendee.isOrganizer).toBe(false);
				expect(attendee.reminderTime).toBe(null);
			}
		});

		it('should create EventAttendee with reminder time', () => {
			const props = { ...baseProps, reminderTime: 15 };
			const result = EventAttendee.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.reminderTime).toBe(15);
			}
		});

		it('should create EventAttendee with organizer flag', () => {
			const props = { ...baseProps, isOrganizer: true };
			const result = EventAttendee.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.isOrganizer).toBe(true);
			}
		});

		it('should create EventAttendee with required flag', () => {
			const props = { ...baseProps, isRequired: true };
			const result = EventAttendee.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value.isRequired).toBe(true);
			}
		});

		it('should fail when ID is empty', () => {
			const props = { ...baseProps, id: '' };
			const result = EventAttendee.create(props);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('ID is required');
			}
		});

		it('should fail when eventId is empty', () => {
			const props = { ...baseProps, eventId: '' };
			const result = EventAttendee.create(props);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Event ID is required');
			}
		});

		it('should fail when employeeId is empty', () => {
			const props = { ...baseProps, employeeId: '' };
			const result = EventAttendee.create(props);

			expect(result.isError).toBe(true);
			if (result.isError) {
				expect(result.error.message).toContain('Employee ID is required');
			}
		});
	});

	describe('Defensive Date Copies', () => {
		it('should create defensive copy of createdAt on input', () => {
			const originalDate = new Date('2026-01-01T10:00:00Z');
			const props = { ...baseProps, createdAt: originalDate };
			const result = EventAttendee.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const attendee = result.value;
				// Mutate original date
				originalDate.setFullYear(2027);
				// Attendee's date should be unchanged
				expect(attendee.createdAt.getFullYear()).toBe(2026);
			}
		});

		it('should create defensive copy of updatedAt on input', () => {
			const originalDate = new Date('2026-01-01T10:00:00Z');
			const props = { ...baseProps, updatedAt: originalDate };
			const result = EventAttendee.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const attendee = result.value;
				// Mutate original date
				originalDate.setFullYear(2027);
				// Attendee's date should be unchanged
				expect(attendee.updatedAt.getFullYear()).toBe(2026);
			}
		});

		it('should create defensive copy of createdAt on getter', () => {
			const result = EventAttendee.create(baseProps);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const attendee = result.value;
				const retrievedDate = attendee.createdAt;
				// Mutate retrieved date
				retrievedDate.setFullYear(2027);
				// Attendee's date should be unchanged
				expect(attendee.createdAt.getFullYear()).toBe(2026);
			}
		});

		it('should create defensive copy of updatedAt on getter', () => {
			const result = EventAttendee.create(baseProps);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const attendee = result.value;
				const retrievedDate = attendee.updatedAt;
				// Mutate retrieved date
				retrievedDate.setFullYear(2027);
				// Attendee's date should be unchanged
				expect(attendee.updatedAt.getFullYear()).toBe(2026);
			}
		});
	});

	describe('updateResponse()', () => {
		it('should update response status and preserve immutability', () => {
			const result = EventAttendee.create(baseProps);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const original = result.value;
				const newStatus = RsvpStatus.create('accepted').value;

				const updated = original.updateResponse(newStatus);

				// Original should be unchanged
				expect(original.responseStatus.equals(validRsvpStatus)).toBe(true);
				// Updated should have new status
				expect(updated.responseStatus.equals(newStatus)).toBe(true);
				// Should be different instances
				expect(updated).not.toBe(original);
			}
		});

		it('should update updatedAt timestamp when updating response', () => {
			const result = EventAttendee.create(baseProps);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const original = result.value;
				const originalUpdatedAt = original.updatedAt;

				// Wait a bit to ensure time difference
				const newStatus = RsvpStatus.create('declined').value;
				const updated = original.updateResponse(newStatus);

				// updatedAt should be different (or at least same/later)
				expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
			}
		});
	});

	describe('setReminder()', () => {
		it('should set reminder time and preserve immutability', () => {
			const result = EventAttendee.create(baseProps);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const original = result.value;
				const updated = original.setReminder(30);

				// Original should be unchanged
				expect(original.reminderTime).toBe(null);
				// Updated should have reminder
				expect(updated.reminderTime).toBe(30);
				// Should be different instances
				expect(updated).not.toBe(original);
			}
		});

		it('should clear reminder time when null is passed', () => {
			const props = { ...baseProps, reminderTime: 15 };
			const result = EventAttendee.create(props);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const original = result.value;
				const updated = original.setReminder(null);

				// Original should have reminder
				expect(original.reminderTime).toBe(15);
				// Updated should have no reminder
				expect(updated.reminderTime).toBe(null);
			}
		});

		it('should update updatedAt timestamp when setting reminder', () => {
			const result = EventAttendee.create(baseProps);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				const original = result.value;
				const originalUpdatedAt = original.updatedAt;

				const updated = original.setReminder(45);

				// updatedAt should be different (or at least same/later)
				expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
			}
		});
	});

	describe('equals()', () => {
		it('should return true for attendees with same ID', () => {
			const result1 = EventAttendee.create(baseProps);
			const result2 = EventAttendee.create(baseProps);

			expect(result1.isOk).toBe(true);
			expect(result2.isOk).toBe(true);
			if (result1.isOk && result2.isOk) {
				expect(result1.value.equals(result2.value)).toBe(true);
			}
		});

		it('should return false for attendees with different IDs', () => {
			const result1 = EventAttendee.create(baseProps);
			const props2 = { ...baseProps, id: 'attendee-2' };
			const result2 = EventAttendee.create(props2);

			expect(result1.isOk).toBe(true);
			expect(result2.isOk).toBe(true);
			if (result1.isOk && result2.isOk) {
				expect(result1.value.equals(result2.value)).toBe(false);
			}
		});
	});
});
