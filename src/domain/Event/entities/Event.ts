import { Result } from '$domain/Result';
import { EventStatus } from '../value-objects/EventStatus';
import { EventType } from '../value-objects/EventType';
import { EventTitle } from '../value-objects/EventTitle';
import { EventDescription } from '../value-objects/EventDescription';
import { EventTime } from '../value-objects/EventTime';
import { Location } from '../value-objects/Location';
import { EventColor } from '../value-objects/EventColor';
import { EventAttendee } from './EventAttendee';
import { EventValidationError } from '../errors/EventErrors';

export interface EventProps {
	id: string;
	title: EventTitle;
	description: EventDescription;
	eventType: EventType;
	eventTime: EventTime;
	location: Location;
	organizerId: string;
	status: EventStatus;
	color: EventColor;
	isPublic: boolean;
	isAllDay: boolean;
	attendees: EventAttendee[];
	createdAt: Date;
	updatedAt: Date;
}

export class Event {
	private constructor(private readonly props: EventProps) {}

	static create(props: EventProps): Result<Event, EventValidationError> {
		// Validate required fields
		if (!props.id?.trim()) {
			return Result.error(new EventValidationError('ID is required'));
		}

		if (!props.organizerId?.trim()) {
			return Result.error(new EventValidationError('Organizer ID is required'));
		}

		// Defensive copies for dates and arrays
		const safeProps: EventProps = {
			...props,
			createdAt: new Date(props.createdAt.getTime()),
			updatedAt: new Date(props.updatedAt.getTime()),
			attendees: [...props.attendees]
		};

		return Result.ok(new Event(safeProps));
	}

	// Getters with defensive copies where needed
	get id(): string {
		return this.props.id;
	}

	get title(): EventTitle {
		return this.props.title;
	}

	get description(): EventDescription {
		return this.props.description;
	}

	get eventType(): EventType {
		return this.props.eventType;
	}

	get eventTime(): EventTime {
		return this.props.eventTime;
	}

	get location(): Location {
		return this.props.location;
	}

	get organizerId(): string {
		return this.props.organizerId;
	}

	get status(): EventStatus {
		return this.props.status;
	}

	get color(): EventColor {
		return this.props.color;
	}

	get isPublic(): boolean {
		return this.props.isPublic;
	}

	get isAllDay(): boolean {
		return this.props.isAllDay;
	}

	get attendees(): EventAttendee[] {
		// Defensive copy of attendees array
		return [...this.props.attendees];
	}

	get createdAt(): Date {
		// Defensive copy on output
		return new Date(this.props.createdAt.getTime());
	}

	get updatedAt(): Date {
		// Defensive copy on output
		return new Date(this.props.updatedAt.getTime());
	}

	// Business logic methods
	updateStatus(newStatus: EventStatus): Result<Event, EventValidationError> {
		// Validate transition using EventStatus.canTransitionTo()
		if (!this.props.status.canTransitionTo(newStatus.value)) {
			return Result.error(
				new EventValidationError(
					`Cannot transition from ${this.props.status.value} to ${newStatus.value}`
				)
			);
		}

		// Return new instance with updated status and timestamp
		return Result.ok(
			new Event({
				...this.props,
				status: newStatus,
				updatedAt: new Date()
			})
		);
	}

	addAttendee(attendee: EventAttendee): Result<Event, EventValidationError> {
		// Check for duplicate by ID
		const exists = this.props.attendees.some((a) => a.id === attendee.id);
		if (exists) {
			return Result.error(
				new EventValidationError(`Attendee with ID ${attendee.id} already exists`)
			);
		}

		// Return new instance with updated attendees and timestamp
		return Result.ok(
			new Event({
				...this.props,
				attendees: [...this.props.attendees, attendee],
				updatedAt: new Date()
			})
		);
	}

	removeAttendee(attendeeId: string): Result<Event, EventValidationError> {
		// Check if attendee exists
		const exists = this.props.attendees.some((a) => a.id === attendeeId);
		if (!exists) {
			return Result.error(new EventValidationError(`Attendee with ID ${attendeeId} not found`));
		}

		// Return new instance with filtered attendees and timestamp
		return Result.ok(
			new Event({
				...this.props,
				attendees: this.props.attendees.filter((a) => a.id !== attendeeId),
				updatedAt: new Date()
			})
		);
	}

	equals(other: Event): boolean {
		return this.props.id === other.props.id;
	}

	toString(): string {
		return `Event: ${this.props.title.value} (${this.props.status.value})`;
	}
}
