// src/domain/Onboarding/OnboardingAssignment.ts
import { Result } from '$domain/Result';
import { type OnboardingStatusValue } from './value-objects/OnboardingStatus';
import { InvalidAssignmentError } from './errors/OnboardingErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OnboardingAssignmentProps {
	id: string;
	userId: string;
	onboardingModuleId: string;
	assignedById: string;
	assignedAt: Date;
	dueDate: Date | null;
	completedAt: Date | null;
}

export interface CreateOnboardingAssignmentData {
	id: string;
	userId: string;
	onboardingModuleId: string;
	assignedById: string;
	assignedAt: Date;
	dueDate: Date | null;
	completedAt: Date | null;
}

export class OnboardingAssignment {
	private constructor(private readonly props: OnboardingAssignmentProps) {}

	static create(
		data: CreateOnboardingAssignmentData
	): Result<OnboardingAssignment, InvalidAssignmentError> {
		if (!data.id || !UUID_REGEX.test(data.id)) {
			return Result.error(new InvalidAssignmentError(`Invalid assignment ID format: "${data.id}"`));
		}

		if (!data.userId || !UUID_REGEX.test(data.userId)) {
			return Result.error(new InvalidAssignmentError(`Invalid user ID format: "${data.userId}"`));
		}

		if (!data.onboardingModuleId || !UUID_REGEX.test(data.onboardingModuleId)) {
			return Result.error(
				new InvalidAssignmentError(
					`Invalid onboarding module ID format: "${data.onboardingModuleId}"`
				)
			);
		}

		if (!data.assignedById || !UUID_REGEX.test(data.assignedById)) {
			return Result.error(
				new InvalidAssignmentError(`Invalid assignedById format: "${data.assignedById}"`)
			);
		}

		return Result.ok(
			new OnboardingAssignment({
				id: data.id,
				userId: data.userId,
				onboardingModuleId: data.onboardingModuleId,
				assignedById: data.assignedById,
				assignedAt: new Date(data.assignedAt.getTime()),
				dueDate: data.dueDate !== null ? new Date(data.dueDate.getTime()) : null,
				completedAt: data.completedAt !== null ? new Date(data.completedAt.getTime()) : null
			})
		);
	}

	get id(): string {
		return this.props.id;
	}

	get userId(): string {
		return this.props.userId;
	}

	get onboardingModuleId(): string {
		return this.props.onboardingModuleId;
	}

	get assignedById(): string {
		return this.props.assignedById;
	}

	get assignedAt(): Date {
		return new Date(this.props.assignedAt.getTime());
	}

	get dueDate(): Date | null {
		return this.props.dueDate !== null ? new Date(this.props.dueDate.getTime()) : null;
	}

	get completedAt(): Date | null {
		return this.props.completedAt !== null ? new Date(this.props.completedAt.getTime()) : null;
	}

	/**
	 * Derives the current status from the assignment state:
	 * - 'completed' if completedAt is set
	 * - 'overdue' if dueDate is in the past and not completed
	 * - 'in_progress' if assignedAt is set and not completed or overdue
	 * - 'pending' otherwise
	 */
	get status(): OnboardingStatusValue {
		if (this.props.completedAt !== null) {
			return 'completed';
		}

		if (this.props.dueDate !== null && this.props.dueDate < new Date()) {
			return 'overdue';
		}

		if (this.props.assignedAt) {
			return 'in_progress';
		}

		return 'pending';
	}

	isCompleted(): boolean {
		return this.props.completedAt !== null;
	}

	isOverdue(): boolean {
		return this.props.dueDate !== null && !this.isCompleted() && this.props.dueDate < new Date();
	}

	/**
	 * Marks the assignment as completed.
	 * Returns a new instance with completedAt set.
	 * Defaults to current time if no date provided.
	 */
	complete(completedAt?: Date): OnboardingAssignment {
		const completionTime = completedAt ?? new Date();
		return new OnboardingAssignment({
			...this.props,
			assignedAt: new Date(this.props.assignedAt.getTime()),
			dueDate: this.props.dueDate !== null ? new Date(this.props.dueDate.getTime()) : null,
			completedAt: completionTime
		});
	}
}
