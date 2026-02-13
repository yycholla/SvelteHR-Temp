import { Result } from '$domain/Result';
import { RsvpStatus } from '../value-objects/RsvpStatus';
import { EventAttendeeValidationError } from '../errors/EventErrors';

export interface EventAttendeeProps {
	id: string;
	eventId: string;
	employeeId: string;
	responseStatus: RsvpStatus;
	isRequired: boolean;
	isOrganizer: boolean;
	reminderTime: number | null; // Minutes before event
	createdAt: Date;
	updatedAt: Date;
}

export class EventAttendee {
	private constructor(private readonly props: EventAttendeeProps) {}

	static create(props: EventAttendeeProps): Result<EventAttendee, EventAttendeeValidationError> {
		// Validate required fields
		if (!props.id?.trim()) {
			return Result.error(new EventAttendeeValidationError('ID is required'));
		}

		if (!props.eventId?.trim()) {
			return Result.error(new EventAttendeeValidationError('Event ID is required'));
		}

		if (!props.employeeId?.trim()) {
			return Result.error(new EventAttendeeValidationError('Employee ID is required'));
		}

		// Defensive copies for dates
		const safeProps: EventAttendeeProps = {
			...props,
			createdAt: new Date(props.createdAt.getTime()),
			updatedAt: new Date(props.updatedAt.getTime())
		};

		return Result.ok(new EventAttendee(safeProps));
	}

	// Getters
	get id(): string {
		return this.props.id;
	}

	get eventId(): string {
		return this.props.eventId;
	}

	get employeeId(): string {
		return this.props.employeeId;
	}

	get responseStatus(): RsvpStatus {
		return this.props.responseStatus;
	}

	get isRequired(): boolean {
		return this.props.isRequired;
	}

	get isOrganizer(): boolean {
		return this.props.isOrganizer;
	}

	get reminderTime(): number | null {
		return this.props.reminderTime;
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
	updateResponse(newStatus: RsvpStatus): EventAttendee {
		// Returns new instance with updated status and updatedAt
		return new EventAttendee({
			...this.props,
			responseStatus: newStatus,
			updatedAt: new Date()
		});
	}

	setReminder(minutes: number | null): EventAttendee {
		// Returns new instance with updated reminder and updatedAt
		return new EventAttendee({
			...this.props,
			reminderTime: minutes,
			updatedAt: new Date()
		});
	}

	equals(other: EventAttendee): boolean {
		return this.props.id === other.props.id;
	}
}
