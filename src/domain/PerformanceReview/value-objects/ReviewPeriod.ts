// src/domain/PerformanceReview/value-objects/ReviewPeriod.ts
import { Result } from '$domain/Result';
import { ReviewPeriodValidationError } from '../errors/PerformanceReviewErrors';

interface ReviewPeriodProps {
	value: string;
}

// Valid formats: Q1-2025, Q2-2025, ..., Q4-2025, H1-2025, H2-2025, Annual-2025
const QUARTERLY_PATTERN = /^Q([1-4])-(\d{4})$/;
const HALF_YEARLY_PATTERN = /^H([1-2])-(\d{4})$/;
const ANNUAL_PATTERN = /^Annual-(\d{4})$/;

export class ReviewPeriod {
	private constructor(private readonly props: ReviewPeriodProps) {}

	static create(period: string): Result<ReviewPeriod, ReviewPeriodValidationError> {
		if (!period || typeof period !== 'string') {
			return Result.error(new ReviewPeriodValidationError('Review period cannot be empty'));
		}

		const trimmed = period.trim();

		// Validate format
		const isQuarterly = QUARTERLY_PATTERN.test(trimmed);
		const isHalfYearly = HALF_YEARLY_PATTERN.test(trimmed);
		const isAnnual = ANNUAL_PATTERN.test(trimmed);

		if (!isQuarterly && !isHalfYearly && !isAnnual) {
			return Result.error(
				new ReviewPeriodValidationError(
					`Invalid review period format: ${period}. Expected formats: Q1-2025, H1-2025, or Annual-2025`
				)
			);
		}

		// Validate year (must be 4 digits, reasonable range)
		let year: number;
		if (isQuarterly) {
			year = parseInt(QUARTERLY_PATTERN.exec(trimmed)![2]);
		} else if (isHalfYearly) {
			year = parseInt(HALF_YEARLY_PATTERN.exec(trimmed)![2]);
		} else {
			year = parseInt(ANNUAL_PATTERN.exec(trimmed)![1]);
		}

		if (year < 2000 || year > 2100) {
			return Result.error(new ReviewPeriodValidationError('Year must be between 2000 and 2100'));
		}

		return Result.ok(new ReviewPeriod({ value: trimmed }));
	}

	get value(): string {
		return this.props.value;
	}

	isQuarterly(): boolean {
		return QUARTERLY_PATTERN.test(this.props.value);
	}

	isHalfYearly(): boolean {
		return HALF_YEARLY_PATTERN.test(this.props.value);
	}

	isAnnual(): boolean {
		return ANNUAL_PATTERN.test(this.props.value);
	}

	getYear(): number {
		if (this.isQuarterly()) {
			return parseInt(QUARTERLY_PATTERN.exec(this.props.value)![2]);
		} else if (this.isHalfYearly()) {
			return parseInt(HALF_YEARLY_PATTERN.exec(this.props.value)![2]);
		} else {
			return parseInt(ANNUAL_PATTERN.exec(this.props.value)![1]);
		}
	}

	getQuarter(): number | null {
		if (!this.isQuarterly()) return null;
		return parseInt(QUARTERLY_PATTERN.exec(this.props.value)![1]);
	}

	isPast(): boolean {
		const currentYear = new Date().getFullYear();
		return this.getYear() < currentYear;
	}

	isCurrent(): boolean {
		const currentYear = new Date().getFullYear();
		const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

		if (this.getYear() !== currentYear) return false;

		if (this.isQuarterly()) {
			return this.getQuarter() === currentQuarter;
		} else if (this.isHalfYearly()) {
			const half = currentQuarter <= 2 ? 1 : 2;
			return this.props.value.includes(`H${half}`);
		} else {
			return true; // Annual period matches current year
		}
	}

	equals(other: ReviewPeriod): boolean {
		return this.props.value === other.props.value;
	}
}
