export class EventError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EventError';
	}
}

export class EventStatusValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventStatusValidationError';
	}
}

export class EventTypeValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventTypeValidationError';
	}
}

export class EventTitleValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventTitleValidationError';
	}
}

export class EventDescriptionValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventDescriptionValidationError';
	}
}

export class LocationValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'LocationValidationError';
	}
}

export class RsvpStatusValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'RsvpStatusValidationError';
	}
}

export class EventTimeValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventTimeValidationError';
	}
}

export class EventColorValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventColorValidationError';
	}
}

export class EventAttendeeValidationError extends EventError {
	constructor(message: string) {
		super(message);
		this.name = 'EventAttendeeValidationError';
	}
}
