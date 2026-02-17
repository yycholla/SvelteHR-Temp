export class TrainingError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'TrainingError';
	}
}

export class TrainingNotFoundError extends TrainingError {
	constructor(id: string) {
		super(`Training not found: ${id}`, 'TRAINING_NOT_FOUND');
		this.name = 'TrainingNotFoundError';
	}
}

export class InvalidTrainingError extends TrainingError {
	constructor(message: string) {
		super(message, 'INVALID_TRAINING');
		this.name = 'InvalidTrainingError';
	}
}

export class AssignmentNotFoundError extends TrainingError {
	constructor(id: string) {
		super(`Training assignment not found: ${id}`, 'TRAINING_ASSIGNMENT_NOT_FOUND');
		this.name = 'AssignmentNotFoundError';
	}
}

export class InvalidAssignmentError extends TrainingError {
	constructor(message: string) {
		super(message, 'INVALID_TRAINING_ASSIGNMENT');
		this.name = 'InvalidAssignmentError';
	}
}

export class ContentNotFoundError extends TrainingError {
	constructor(id: string) {
		super(`Training content not found: ${id}`, 'TRAINING_CONTENT_NOT_FOUND');
		this.name = 'ContentNotFoundError';
	}
}
