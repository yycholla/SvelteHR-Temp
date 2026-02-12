// src/domain/PerformanceReview/value-objects/ReviewStatus.ts
import { Result } from '$domain/Result';
import { ReviewStatusValidationError } from '../errors/PerformanceReviewErrors';

type ReviewStatusValue = 'draft' | 'in_progress' | 'completed' | 'overdue';

const VALID_STATUSES: readonly ReviewStatusValue[] = [
	'draft',
	'in_progress',
	'completed',
	'overdue'
] as const;

interface ReviewStatusProps {
	value: ReviewStatusValue;
}

export class ReviewStatus {
	private constructor(private readonly props: ReviewStatusProps) {}

	static create(status: string): Result<ReviewStatus, ReviewStatusValidationError> {
		if (!status || typeof status !== 'string') {
			return Result.error(new ReviewStatusValidationError('Status cannot be empty'));
		}

		const normalized = status.trim().toLowerCase();

		if (!(VALID_STATUSES as readonly string[]).includes(normalized)) {
			return Result.error(
				new ReviewStatusValidationError(
					`Invalid review status: ${status}. Must be one of: ${VALID_STATUSES.join(', ')}`
				)
			);
		}

		return Result.ok(new ReviewStatus({ value: normalized as ReviewStatusValue }));
	}

	get value(): ReviewStatusValue {
		return this.props.value;
	}

	isDraft(): boolean {
		return this.props.value === 'draft';
	}

	isInProgress(): boolean {
		return this.props.value === 'in_progress';
	}

	isCompleted(): boolean {
		return this.props.value === 'completed';
	}

	isOverdue(): boolean {
		return this.props.value === 'overdue';
	}

	canTransitionTo(newStatus: ReviewStatus): boolean {
		const current = this.props.value;
		const next = newStatus.value;

		// Valid transitions
		const validTransitions: Record<ReviewStatusValue, ReviewStatusValue[]> = {
			draft: ['in_progress', 'overdue'],
			in_progress: ['completed', 'overdue'],
			completed: ['overdue'], // Can mark as overdue if reopened
			overdue: ['in_progress', 'completed'] // Can recover from overdue
		};

		return validTransitions[current].includes(next);
	}

	equals(other: ReviewStatus): boolean {
		return this.props.value === other.props.value;
	}
}
