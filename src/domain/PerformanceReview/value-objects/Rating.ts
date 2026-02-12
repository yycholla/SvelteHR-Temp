// src/domain/PerformanceReview/value-objects/Rating.ts
import { Result } from '$domain/Result';
import { RatingValidationError } from '../errors/PerformanceReviewErrors';

interface RatingProps {
	value: number;
}

const RATING_LABELS: Record<number, string> = {
	1: 'Needs Improvement',
	2: 'Below Expectations',
	3: 'Meets Expectations',
	4: 'Exceeds Expectations',
	5: 'Outstanding'
};

export class Rating {
	private constructor(private readonly props: RatingProps) {}

	static create(value: number): Result<Rating, RatingValidationError> {
		// Validate type
		if (typeof value !== 'number' || isNaN(value)) {
			return Result.error(new RatingValidationError('Rating must be a valid number'));
		}

		// Validate range
		if (value < 1 || value > 5) {
			return Result.error(new RatingValidationError('Rating must be between 1 and 5'));
		}

		// Validate whole number
		if (!Number.isInteger(value)) {
			return Result.error(new RatingValidationError('Rating must be a whole number (no decimals)'));
		}

		return Result.ok(new Rating({ value }));
	}

	get value(): number {
		return this.props.value;
	}

	get label(): string {
		return RATING_LABELS[this.props.value] || 'Unknown';
	}

	isHigh(): boolean {
		return this.props.value >= 4;
	}

	isLow(): boolean {
		return this.props.value <= 2;
	}

	isAverage(): boolean {
		return this.props.value === 3;
	}

	equals(other: Rating): boolean {
		return this.props.value === other.props.value;
	}
}
