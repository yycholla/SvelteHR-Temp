export class NotificationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationError';
	}
}

export class NotificationTypeValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationTypeValidationError';
	}
}

export class NotificationCategoryValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationCategoryValidationError';
	}
}

export class NotificationPriorityValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationPriorityValidationError';
	}
}

export class NotificationTitleValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationTitleValidationError';
	}
}

export class NotificationMessageValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationMessageValidationError';
	}
}

export class NotificationNotFoundError extends NotificationError {
	constructor(id: string) {
		super(`Notification not found: ${id}`);
		this.name = 'NotificationNotFoundError';
	}
}

export class NotificationValidationError extends NotificationError {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationValidationError';
	}
}
