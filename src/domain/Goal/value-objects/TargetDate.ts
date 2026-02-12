// src/domain/Goal/value-objects/TargetDate.ts
import { Result } from '$domain/Result';
import { TargetDateValidationError } from '../errors/GoalErrors';

const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

interface TargetDateProps {
	value: Date;
}

export class TargetDate {
	private constructor(private readonly props: TargetDateProps) {}

	static create(date: string | Date): Result<TargetDate, TargetDateValidationError> {
		let dateObj: Date;

		if (typeof date === 'string') {
			// Parse as UTC date to avoid timezone issues
			const parsed = new Date(date);
			if (isNaN(parsed.getTime())) {
				return Result.error(new TargetDateValidationError('Invalid target date'));
			}
			// Use UTC year for validation
			const year = parsed.getUTCFullYear();
			if (year < MIN_YEAR || year > MAX_YEAR) {
				return Result.error(
					new TargetDateValidationError(
						`Target date year must be between ${MIN_YEAR} and ${MAX_YEAR}`
					)
				);
			}
			dateObj = parsed;
		} else {
			dateObj = date;
			if (isNaN(dateObj.getTime())) {
				return Result.error(new TargetDateValidationError('Invalid target date'));
			}
			const year = dateObj.getFullYear();
			if (year < MIN_YEAR || year > MAX_YEAR) {
				return Result.error(
					new TargetDateValidationError(
						`Target date year must be between ${MIN_YEAR} and ${MAX_YEAR}`
					)
				);
			}
		}

		// Defensive copy
		return Result.ok(new TargetDate({ value: new Date(dateObj) }));
	}

	get value(): Date {
		// Defensive copy on output
		return new Date(this.props.value);
	}

	toISOString(): string {
		return this.props.value.toISOString().split('T')[0];
	}

	isOverdue(referenceDate: Date = new Date()): boolean {
		// Compare only dates, not times (use UTC to avoid timezone issues)
		const targetDate = new Date(this.props.value);
		targetDate.setUTCHours(0, 0, 0, 0);

		const refDate = new Date(referenceDate);
		refDate.setUTCHours(0, 0, 0, 0);

		return targetDate < refDate;
	}

	isPast(referenceDate: Date = new Date()): boolean {
		return this.props.value < referenceDate;
	}

	isFuture(referenceDate: Date = new Date()): boolean {
		return this.props.value > referenceDate;
	}

	daysUntil(referenceDate: Date = new Date()): number {
		// Use UTC to avoid timezone issues
		const targetDate = new Date(this.props.value);
		targetDate.setUTCHours(0, 0, 0, 0);

		const refDate = new Date(referenceDate);
		refDate.setUTCHours(0, 0, 0, 0);

		const diffMs = targetDate.getTime() - refDate.getTime();
		return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
	}

	equals(other: TargetDate): boolean {
		return this.props.value.getTime() === other.props.value.getTime();
	}

	toString(): string {
		return this.toISOString();
	}
}
