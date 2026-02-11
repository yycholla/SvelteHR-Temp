// src/domain/Task/value-objects/TaskDescription.ts
import { Result } from '$domain/Result';
import { TaskValidationError } from '../errors/TaskErrors';

interface TaskDescriptionProps {
	value: string;
}

export class TaskDescription {
	private constructor(private readonly props: TaskDescriptionProps) {}

	static create(
		description: string | null | undefined
	): Result<TaskDescription, TaskValidationError> {
		const trimmed = (description ?? '').trim();
		return Result.ok(new TaskDescription({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	isEmpty(): boolean {
		return this.props.value.length === 0;
	}

	equals(other: TaskDescription): boolean {
		return this.props.value === other.props.value;
	}
}
