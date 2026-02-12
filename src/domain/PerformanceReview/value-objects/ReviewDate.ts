// src/domain/PerformanceReview/value-objects/ReviewDate.ts
import { Result } from '$domain/Result';
import { ReviewDateValidationError } from '../errors/PerformanceReviewErrors';

interface ReviewDateProps {
	value: Date;
}

export class ReviewDate {
	private constructor(private readonly props: ReviewDateProps) {}

	static create(date: string | Date): Result<ReviewDate, ReviewDateValidationError> {
		let dateObj: Date;

		if (date instanceof Date) {
			dateObj = date;
		} else if (typeof date === 'string') {
			if (!date.trim()) {
				return Result.error(new ReviewDateValidationError('Review date cannot be empty'));
			}
			dateObj = new Date(date);
		} else {
			return Result.error(
				new ReviewDateValidationError('Review date must be a string or Date object')
			);
		}

		// Validate date is valid
		if (isNaN(dateObj.getTime())) {
			return Result.error(new ReviewDateValidationError('Invalid date format'));
		}

		// Validate reasonable date range (2000-2050)
		const year = dateObj.getFullYear();
		if (year < 2000) {
			return Result.error(
				new ReviewDateValidationError('Review date is too far in the past (before 2000)')
			);
		}
		if (year > 2050) {
			return Result.error(
				new ReviewDateValidationError('Review date is too far in the future (after 2050)')
			);
		}

		// Create defensive copy
		return Result.ok(new ReviewDate({ value: new Date(dateObj) }));
	}

	get value(): Date {
		// Return defensive copy
		return new Date(this.props.value);
	}

	toISOString(): string {
		return this.props.value.toISOString();
	}

	toDisplayString(): string {
		return this.props.value.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	isOverdue(): boolean {
		const now = new Date();
		now.setHours(0, 0, 0, 0);

		const reviewDate = new Date(this.props.value);
		reviewDate.setHours(0, 0, 0, 0);

		return reviewDate < now;
	}

	getDaysOverdue(): number {
		if (!this.isOverdue()) return 0;

		const now = new Date();
		now.setHours(0, 0, 0, 0);

		const reviewDate = new Date(this.props.value);
		reviewDate.setHours(0, 0, 0, 0);

		const diffMs = now.getTime() - reviewDate.getTime();
		return Math.round(diffMs / (1000 * 60 * 60 * 24));
	}

	isPast(): boolean {
		return this.props.value < new Date();
	}

	isFuture(): boolean {
		return this.props.value > new Date();
	}

	equals(other: ReviewDate): boolean {
		return this.props.value.getTime() === other.props.value.getTime();
	}
}
