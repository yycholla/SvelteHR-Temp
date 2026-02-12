// src/domain/PerformanceReview/entities/PerformanceReview.ts
import { Result } from '$domain/Result';
import { ReviewStatus } from '../value-objects/ReviewStatus';
import { Rating } from '../value-objects/Rating';
import { ReviewPeriod } from '../value-objects/ReviewPeriod';
import { ReviewDate } from '../value-objects/ReviewDate';
import {
	PerformanceReviewValidationError,
	InvalidStatusTransitionError
} from '../errors/PerformanceReviewErrors';

export interface PerformanceReviewProps {
	id: string;
	employeeId: string;
	reviewerId: string;
	reviewPeriod: ReviewPeriod;
	reviewDate: ReviewDate;
	status: ReviewStatus;
	overallRating: Rating;
	goalsAchievement: Rating;
	collaboration: Rating;
	communication: Rating;
	leadership: Rating;
	technicalSkills?: Rating;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	createdAt: Date;
	updatedAt: Date;
}

export class PerformanceReview {
	private constructor(private readonly props: PerformanceReviewProps) {}

	static create(
		props: PerformanceReviewProps
	): Result<PerformanceReview, PerformanceReviewValidationError> {
		// Validate required fields
		if (!props.id?.trim()) {
			return Result.error(new PerformanceReviewValidationError('ID is required'));
		}
		if (!props.employeeId?.trim()) {
			return Result.error(new PerformanceReviewValidationError('Employee ID is required'));
		}
		if (!props.reviewerId?.trim()) {
			return Result.error(new PerformanceReviewValidationError('Reviewer ID is required'));
		}
		if (!props.strengths?.trim()) {
			return Result.error(new PerformanceReviewValidationError('Strengths are required'));
		}
		if (!props.areasForImprovement?.trim()) {
			return Result.error(
				new PerformanceReviewValidationError('Areas for improvement are required')
			);
		}

		// Create defensive copies of dates
		const defensiveProps = {
			...props,
			createdAt: new Date(props.createdAt),
			updatedAt: new Date(props.updatedAt)
		};

		return Result.ok(new PerformanceReview(defensiveProps));
	}

	// Getters
	get id(): string {
		return this.props.id;
	}
	get employeeId(): string {
		return this.props.employeeId;
	}
	get reviewerId(): string {
		return this.props.reviewerId;
	}
	get reviewPeriod(): ReviewPeriod {
		return this.props.reviewPeriod;
	}
	get reviewDate(): ReviewDate {
		return this.props.reviewDate;
	}
	get status(): ReviewStatus {
		return this.props.status;
	}
	get overallRating(): Rating {
		return this.props.overallRating;
	}
	get goalsAchievement(): Rating {
		return this.props.goalsAchievement;
	}
	get collaboration(): Rating {
		return this.props.collaboration;
	}
	get communication(): Rating {
		return this.props.communication;
	}
	get leadership(): Rating {
		return this.props.leadership;
	}
	get technicalSkills(): Rating | undefined {
		return this.props.technicalSkills;
	}
	get strengths(): string {
		return this.props.strengths;
	}
	get areasForImprovement(): string {
		return this.props.areasForImprovement;
	}
	get comments(): string | undefined {
		return this.props.comments;
	}
	get createdAt(): Date {
		return new Date(this.props.createdAt);
	}
	get updatedAt(): Date {
		return new Date(this.props.updatedAt);
	}

	// Business logic methods
	updateStatus(newStatus: ReviewStatus): Result<PerformanceReview, InvalidStatusTransitionError> {
		if (!this.props.status.canTransitionTo(newStatus)) {
			return Result.error(
				new InvalidStatusTransitionError(this.props.status.value, newStatus.value)
			);
		}

		return Result.ok(
			new PerformanceReview({
				...this.props,
				status: newStatus,
				updatedAt: new Date()
			})
		);
	}

	updateRatings(ratings: {
		overallRating?: Rating;
		goalsAchievement?: Rating;
		collaboration?: Rating;
		communication?: Rating;
		leadership?: Rating;
		technicalSkills?: Rating;
	}): PerformanceReview {
		return new PerformanceReview({
			...this.props,
			overallRating: ratings.overallRating ?? this.props.overallRating,
			goalsAchievement: ratings.goalsAchievement ?? this.props.goalsAchievement,
			collaboration: ratings.collaboration ?? this.props.collaboration,
			communication: ratings.communication ?? this.props.communication,
			leadership: ratings.leadership ?? this.props.leadership,
			technicalSkills: ratings.technicalSkills ?? this.props.technicalSkills,
			updatedAt: new Date()
		});
	}

	getAverageRating(): number {
		const ratings = [
			this.props.overallRating.value,
			this.props.goalsAchievement.value,
			this.props.collaboration.value,
			this.props.communication.value,
			this.props.leadership.value
		];

		if (this.props.technicalSkills) {
			ratings.push(this.props.technicalSkills.value);
		}

		const sum = ratings.reduce((acc, rating) => acc + rating, 0);
		return Math.round((sum / ratings.length) * 100) / 100; // Round to 2 decimals
	}

	isComplete(): boolean {
		return this.props.status.isCompleted();
	}

	isOverdue(): boolean {
		if (this.isComplete()) return false;
		return this.props.reviewDate.isOverdue();
	}

	equals(other: PerformanceReview): boolean {
		return this.props.id === other.props.id;
	}
}
