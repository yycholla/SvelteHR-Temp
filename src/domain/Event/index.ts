// Value Objects
export { EventStatus, type EventStatusValue } from './value-objects/EventStatus';
export { EventType, type EventTypeValue } from './value-objects/EventType';
export { EventTitle } from './value-objects/EventTitle';
export { EventDescription } from './value-objects/EventDescription';
export { EventTime } from './value-objects/EventTime';
export { Location } from './value-objects/Location';
export { RsvpStatus, type RsvpStatusValue } from './value-objects/RsvpStatus';
export { EventColor } from './value-objects/EventColor';

// Entities
export { EventAttendee, type EventAttendeeProps } from './entities/EventAttendee';
export { Event, type EventProps } from './entities/Event';

// Errors
export {
	EventError,
	EventValidationError,
	EventNotFoundError,
	EventStatusValidationError,
	EventTypeValidationError,
	EventTitleValidationError,
	EventDescriptionValidationError,
	EventTimeValidationError,
	LocationValidationError,
	RsvpStatusValidationError,
	EventColorValidationError,
	EventAttendeeValidationError
} from './errors/EventErrors';
