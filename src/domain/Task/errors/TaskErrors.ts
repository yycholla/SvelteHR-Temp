// src/domain/Task/errors/TaskErrors.ts
export class TaskError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TaskError';
	}
}

export class TaskValidationError extends TaskError {
	constructor(message: string) {
		super(message);
		this.name = 'TaskValidationError';
	}
}

export class TaskNotFoundError extends TaskError {
	constructor(taskId: string) {
		super(`Task not found: ${taskId}`);
		this.name = 'TaskNotFoundError';
	}
}

export class CircularDependencyError extends TaskError {
	constructor(taskId: string, dependencyId: string) {
		super(`Circular dependency detected: ${taskId} depends on ${dependencyId}`);
		this.name = 'CircularDependencyError';
	}
}

export class InvalidStatusTransitionError extends TaskError {
	constructor(from: string, to: string) {
		super(`Invalid status transition: ${from} → ${to}`);
		this.name = 'InvalidStatusTransitionError';
	}
}

export class SubtaskBlocksParentError extends TaskError {
	constructor(parentId: string, subtaskId: string) {
		super(`Subtask ${subtaskId} blocks completion of parent ${parentId}`);
		this.name = 'SubtaskBlocksParentError';
	}
}
