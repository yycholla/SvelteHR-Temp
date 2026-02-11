// src/domain/Task/value-objects/TaskTitle.ts
import { Result } from '$domain/Result';
import { TaskValidationError } from '../errors/TaskErrors';

interface TaskTitleProps {
	value: string;
}

export class TaskTitle {
	private constructor(private readonly props: TaskTitleProps) {}

	static create(title: string): Result<TaskTitle, TaskValidationError> {
		const trimmed = title.trim();

		if (trimmed.length === 0) {
			return Result.error(new TaskValidationError('Title cannot be empty'));
		}

		if (trimmed.length > 255) {
			return Result.error(new TaskValidationError('Title must be 255 characters or less'));
		}

		return Result.ok(new TaskTitle({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	toString(): string {
		return this.props.value;
	}

	equals(other: TaskTitle): boolean {
		return this.props.value === other.props.value;
	}
}
