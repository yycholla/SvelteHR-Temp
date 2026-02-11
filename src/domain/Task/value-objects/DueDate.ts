// src/domain/Task/value-objects/DueDate.ts
import { Result } from '$domain/Result';
import { TaskValidationError } from '../errors/TaskErrors';

interface DueDateProps {
	value: Date;
}

export class DueDate {
	private constructor(private readonly props: DueDateProps) {}

	static create(date: Date): Result<DueDate, TaskValidationError> {
		// Allow current time or future dates
		if (date.getTime() < Date.now()) {
			return Result.error(
				new TaskValidationError('Due date must be in the future or current time')
			);
		}

		// Create defensive copy
		return Result.ok(new DueDate({ value: new Date(date.getTime()) }));
	}

	get value(): Date {
		// Return defensive copy
		return new Date(this.props.value.getTime());
	}

	isOverdue(): boolean {
		return this.props.value.getTime() < Date.now();
	}

	daysUntilDue(): number {
		const msPerDay = 1000 * 60 * 60 * 24;
		const diffMs = this.props.value.getTime() - Date.now();
		return Math.floor(diffMs / msPerDay);
	}

	equals(other: DueDate): boolean {
		return this.props.value.getTime() === other.props.value.getTime();
	}
}
