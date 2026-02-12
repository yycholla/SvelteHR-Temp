// src/domain/Goal/errors/GoalErrors.ts
export class GoalError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GoalError';
	}
}

export class GoalValidationError extends GoalError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalValidationError';
	}
}

export class GoalStatusValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalStatusValidationError';
	}
}

export class GoalPriorityValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalPriorityValidationError';
	}
}

export class GoalTitleValidationError extends GoalValidationError {
	constructor(message: string) {
		super(message);
		this.name = 'GoalTitleValidationError';
	}
}

export class GoalNotFoundError extends GoalError {
	constructor(goalId: string) {
		super(`Goal not found: ${goalId}`);
		this.name = 'GoalNotFoundError';
	}
}

export class InvalidProgressError extends GoalError {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidProgressError';
	}
}
