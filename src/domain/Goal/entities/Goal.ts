// src/domain/Goal/entities/Goal.ts
import { Result } from '$domain/Result';
import { GoalStatus } from '../value-objects/GoalStatus';
import { GoalPriority } from '../value-objects/GoalPriority';
import { GoalTitle } from '../value-objects/GoalTitle';
import { GoalDescription } from '../value-objects/GoalDescription';
import { TargetDate } from '../value-objects/TargetDate';
import { Progress } from '../value-objects/Progress';
import { Quarter } from '../value-objects/Quarter';
import { GoalValidationError, InvalidStatusTransitionError, GoalError } from '../errors/GoalErrors';

export interface GoalProps {
	id: string;
	employeeId: string;
	title: GoalTitle;
	description: GoalDescription;
	targetDate: TargetDate;
	progress: Progress;
	status: GoalStatus;
	priority: GoalPriority;
	quarter?: Quarter;
	year?: number;
	createdBy: string;
	createdAt: Date;
	updatedAt: Date;
	completedAt?: Date;
}

export class Goal {
	private constructor(private readonly props: GoalProps) {}

	static create(props: GoalProps): Result<Goal, GoalValidationError> {
		// Validate required fields
		if (!props.id?.trim()) {
			return Result.error(new GoalValidationError('Goal ID is required'));
		}

		if (!props.employeeId?.trim()) {
			return Result.error(new GoalValidationError('Employee ID is required'));
		}

		if (!props.createdBy?.trim()) {
			return Result.error(new GoalValidationError('Created By is required'));
		}

		// Validate year if provided
		if (props.year !== undefined && (props.year < 2000 || props.year > 2100)) {
			return Result.error(new GoalValidationError('Year must be between 2000 and 2100'));
		}

		// Defensive copies for dates
		const defensiveProps: GoalProps = {
			...props,
			createdAt: new Date(props.createdAt),
			updatedAt: new Date(props.updatedAt),
			completedAt: props.completedAt ? new Date(props.completedAt) : undefined
		};

		return Result.ok(new Goal(defensiveProps));
	}

	// Getters with defensive copies for dates
	get id(): string {
		return this.props.id;
	}

	get employeeId(): string {
		return this.props.employeeId;
	}

	get title(): GoalTitle {
		return this.props.title;
	}

	get description(): GoalDescription {
		return this.props.description;
	}

	get targetDate(): TargetDate {
		return this.props.targetDate;
	}

	get progress(): Progress {
		return this.props.progress;
	}

	get status(): GoalStatus {
		return this.props.status;
	}

	get priority(): GoalPriority {
		return this.props.priority;
	}

	get quarter(): Quarter | undefined {
		return this.props.quarter;
	}

	get year(): number | undefined {
		return this.props.year;
	}

	get createdBy(): string {
		return this.props.createdBy;
	}

	get createdAt(): Date {
		return new Date(this.props.createdAt); // Defensive copy
	}

	get updatedAt(): Date {
		return new Date(this.props.updatedAt); // Defensive copy
	}

	get completedAt(): Date | undefined {
		return this.props.completedAt ? new Date(this.props.completedAt) : undefined; // Defensive copy
	}

	// Business logic methods
	updateStatus(newStatus: GoalStatus): Result<Goal, InvalidStatusTransitionError> {
		if (!this.props.status.canTransitionTo(newStatus)) {
			return Result.error(
				new InvalidStatusTransitionError(
					`Cannot transition from ${this.props.status.value} to ${newStatus.value}`
				)
			);
		}

		const completedAt = newStatus.isCompleted() ? new Date() : this.props.completedAt;

		return Result.ok(
			new Goal({
				...this.props,
				status: newStatus,
				updatedAt: new Date(),
				completedAt
			})
		);
	}

	updateProgress(newProgress: Progress): Result<Goal, GoalError> {
		// Auto-complete if progress reaches 100%
		const shouldComplete = newProgress.isComplete() && !this.props.status.isCompleted();
		const newStatus = shouldComplete ? GoalStatus.create('completed').value : this.props.status;
		const completedAt = shouldComplete ? new Date() : this.props.completedAt;

		return Result.ok(
			new Goal({
				...this.props,
				progress: newProgress,
				status: newStatus,
				updatedAt: new Date(),
				completedAt
			})
		);
	}

	updatePriority(newPriority: GoalPriority): Goal {
		return new Goal({
			...this.props,
			priority: newPriority,
			updatedAt: new Date()
		});
	}

	updateTargetDate(newTargetDate: TargetDate): Goal {
		return new Goal({
			...this.props,
			targetDate: newTargetDate,
			updatedAt: new Date()
		});
	}

	isComplete(): boolean {
		return this.props.status.isCompleted();
	}

	isOverdue(): boolean {
		if (this.props.status.isTerminal()) {
			return false;
		}
		return this.props.targetDate.isOverdue();
	}

	isActive(): boolean {
		return this.props.status.isActive();
	}

	equals(other: Goal): boolean {
		return this.props.id === other.props.id;
	}
}
