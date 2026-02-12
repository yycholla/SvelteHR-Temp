// src/domain/PerformanceReview/value-objects/ReviewPeriod.ts
import { Result } from '$domain/Result';
import { ReviewPeriodValidationError } from '../errors/PerformanceReviewErrors';

interface ReviewPeriodProps {
	value: string;
	year: number;
	quarter?: number; // 1-4 for quarterly, undefined otherwise
	half?: number; // 1-2 for half-yearly, undefined otherwise
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

		// Try quarterly pattern
		const quarterlyMatch = QUARTERLY_PATTERN.exec(trimmed);
		if (quarterlyMatch) {
			const quarter = parseInt(quarterlyMatch[1]);
			const year = parseInt(quarterlyMatch[2]);

			if (year < 2000 || year > 2100) {
				return Result.error(new ReviewPeriodValidationError('Year must be between 2000 and 2100'));
			}

			return Result.ok(new ReviewPeriod({ value: trimmed, year, quarter }));
		}

		// Try half-yearly pattern
		const halfYearlyMatch = HALF_YEARLY_PATTERN.exec(trimmed);
		if (halfYearlyMatch) {
			const half = parseInt(halfYearlyMatch[1]);
			const year = parseInt(halfYearlyMatch[2]);

			if (year < 2000 || year > 2100) {
				return Result.error(new ReviewPeriodValidationError('Year must be between 2000 and 2100'));
			}

			return Result.ok(new ReviewPeriod({ value: trimmed, year, half }));
		}

		// Try annual pattern
		const annualMatch = ANNUAL_PATTERN.exec(trimmed);
		if (annualMatch) {
			const year = parseInt(annualMatch[1]);

			if (year < 2000 || year > 2100) {
				return Result.error(new ReviewPeriodValidationError('Year must be between 2000 and 2100'));
			}

			return Result.ok(new ReviewPeriod({ value: trimmed, year }));
		}

		// No pattern matched
		return Result.error(
			new ReviewPeriodValidationError(
				`Invalid review period format: ${period}. Expected formats: Q1-2025, H1-2025, or Annual-2025`
			)
		);
	}

	get value(): string {
		return this.props.value;
	}

	isQuarterly(): boolean {
		return this.props.quarter !== undefined;
	}

	isHalfYearly(): boolean {
		return this.props.half !== undefined;
	}

	isAnnual(): boolean {
		return this.props.quarter === undefined && this.props.half === undefined;
	}

	getYear(): number {
		return this.props.year;
	}

	getQuarter(): number | null {
		return this.props.quarter ?? null;
	}

	isPast(): boolean {
		const currentYear = new Date().getFullYear();
		return this.props.year < currentYear;
	}

	isCurrent(): boolean {
		const currentYear = new Date().getFullYear();
		const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

		if (this.props.year !== currentYear) return false;

		if (this.props.quarter !== undefined) {
			return this.props.quarter === currentQuarter;
		} else if (this.props.half !== undefined) {
			const half = currentQuarter <= 2 ? 1 : 2;
			return this.props.half === half;
		} else {
			return true; // Annual period matches current year
		}
	}

	equals(other: ReviewPeriod): boolean {
		return this.props.value === other.props.value;
	}
}
