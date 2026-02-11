// src/domain/Task/entities/Task.ts
import { Result } from '$domain/Result';
import { TaskTitle } from '../value-objects/TaskTitle';
import { TaskDescription } from '../value-objects/TaskDescription';
import { DueDate } from '../value-objects/DueDate';
import { TaskStatus, canTransition } from '../enums/TaskStatus';
import { TaskPriority } from '../enums/TaskPriority';
import { InvalidStatusTransitionError, TaskValidationError } from '../errors/TaskErrors';

interface TaskProps {
	id: string;
	title: TaskTitle;
	description: TaskDescription;
	status: TaskStatus;
	priority: TaskPriority;
	createdBy: string;
	assigneeId?: string;
	dueDate?: DueDate;
	parentTaskId?: string;
	completedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
	archived?: boolean;
	archivedAt?: Date;
	archivedBy?: string;
}

export class Task {
	private constructor(private readonly props: TaskProps) {}

	static create(props: TaskProps): Result<Task, TaskValidationError> {
		return Result.ok(new Task(props));
	}

	get id(): string {
		return this.props.id;
	}

	get title(): TaskTitle {
		return this.props.title;
	}

	get description(): TaskDescription {
		return this.props.description;
	}

	get status(): TaskStatus {
		return this.props.status;
	}

	get priority(): TaskPriority {
		return this.props.priority;
	}

	get createdBy(): string {
		return this.props.createdBy;
	}

	get assigneeId(): string | undefined {
		return this.props.assigneeId;
	}

	get dueDate(): DueDate | undefined {
		return this.props.dueDate;
	}

	get parentTaskId(): string | undefined {
		return this.props.parentTaskId;
	}

	get completedAt(): Date | undefined {
		return this.props.completedAt;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}

	get updatedAt(): Date {
		return this.props.updatedAt;
	}

	get archived(): boolean {
		return this.props.archived ?? false;
	}

	changeStatus(newStatus: TaskStatus): Result<Task, InvalidStatusTransitionError> {
		if (!canTransition(this.props.status, newStatus)) {
			return Result.error(new InvalidStatusTransitionError(this.props.status, newStatus));
		}

		const completedAt =
			newStatus === TaskStatus.DONE && !this.props.completedAt
				? new Date()
				: this.props.completedAt;

		return Result.ok(
			new Task({
				...this.props,
				status: newStatus,
				completedAt,
				updatedAt: new Date()
			})
		);
	}

	reassign(assigneeId: string | undefined): Task {
		return new Task({
			...this.props,
			assigneeId,
			updatedAt: new Date()
		});
	}

	isOverdue(): boolean {
		// Not overdue if no due date
		if (!this.props.dueDate) {
			return false;
		}

		// Not overdue if completed
		if (this.props.completedAt) {
			return false;
		}

		return this.props.dueDate.isOverdue();
	}

	isCompleted(): boolean {
		return this.props.status === TaskStatus.DONE;
	}

	equals(other: Task): boolean {
		return this.props.id === other.props.id;
	}
}
