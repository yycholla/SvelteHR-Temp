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
