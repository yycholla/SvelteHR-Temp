// src/domain/Training/TrainingProgress.ts
import { Result } from '$domain/Result';
import { ProgressStatus } from './value-objects/ProgressStatus';
import { InvalidAssignmentError } from './errors/TrainingErrors';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface TrainingProgressProps {
	id: string;
	userId: string;
	trainingContentId: string;
	status: ProgressStatus;
	completedAt: Date | null;
}

export interface CreateTrainingProgressData {
	id: string;
	userId: string;
	trainingContentId: string;
	status: ProgressStatus;
	completedAt: Date | null;
}

/**
 * TrainingProgress entity.
 * Tracks a user's progress through a single training content block.
 * Immutable - business methods return new instances.
 */
export class TrainingProgress {
	private constructor(private readonly props: TrainingProgressProps) {}

	/**
	 * Create a TrainingProgress entity with validation.
	 * Validates UUID formats and creates defensive Date copies.
	 */
	static create(
		data: CreateTrainingProgressData
	): Result<TrainingProgress, InvalidAssignmentError> {
		if (!data.id || !UUID_REGEX.test(data.id)) {
			return Result.error(
				new InvalidAssignmentError(`Invalid progress ID format: "${data.id}"`)
			);
		}

		if (!data.userId || !UUID_REGEX.test(data.userId)) {
			return Result.error(
				new InvalidAssignmentError(`Invalid user ID format: "${data.userId}"`)
			);
		}

		if (!data.trainingContentId || !UUID_REGEX.test(data.trainingContentId)) {
			return Result.error(
				new InvalidAssignmentError(
					`Invalid training content ID format: "${data.trainingContentId}"`
				)
			);
		}

		return Result.ok(
			new TrainingProgress({
				id: data.id,
				userId: data.userId,
				trainingContentId: data.trainingContentId,
				status: data.status,
				completedAt:
					data.completedAt !== null ? new Date(data.completedAt.getTime()) : null
			})
		);
	}

	get id(): string {
		return this.props.id;
	}

	get userId(): string {
		return this.props.userId;
	}

	get trainingContentId(): string {
		return this.props.trainingContentId;
	}

	get status(): ProgressStatus {
		return this.props.status;
	}

	get completedAt(): Date | null {
		return this.props.completedAt !== null ? new Date(this.props.completedAt.getTime()) : null;
	}

	/**
	 * Whether the user has completed this content block.
	 */
	isCompleted(): boolean {
		return this.props.status.isCompleted();
	}

	/**
	 * Mark this content block as completed, returning a new instance.
	 * Sets status to 'completed' and records the completion time.
	 * Defaults to current time if no date is provided.
	 */
	complete(completedAt?: Date): TrainingProgress {
		const completedStatus = ProgressStatus.create('completed').value;
		const completionTime = completedAt ?? new Date();
		return new TrainingProgress({
			...this.props,
			status: completedStatus,
			completedAt: completionTime
		});
	}
}
