import { Result, DomainError } from '$domain';
import {
	InvalidDateError,
	InvalidDateRangeError,
	PastDateError,
	FutureDateError,
	ExcessiveLeaveDurationError
} from './errors';

export class LeaveDateRange {
	private constructor(
		public readonly startDate: Date,
		public readonly endDate: Date,
		public readonly businessDays: number
	) {}

	static create(startStr: string, endStr: string): Result<LeaveDateRange, DomainError> {
		const startDate = new Date(startStr);
		const endDate = new Date(endStr);

		// Business Rule: Valid dates
		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return Result.error(new InvalidDateError('Start and end dates must be valid'));
		}

		// Business Rule: End date after start date
		if (endDate <= startDate) {
			return Result.error(new InvalidDateRangeError('End date must be after start date'));
		}

		// Business Rule: Not in the past (allow today)
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const startDateOnly = new Date(startDate);
		startDateOnly.setHours(0, 0, 0, 0);

		if (startDateOnly < today) {
			return Result.error(new PastDateError('Cannot request leave in the past'));
		}

		// Business Rule: Max 1 year in advance
		const oneYearFromNow = new Date();
		oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
		if (startDate > oneYearFromNow) {
			return Result.error(new FutureDateError('Cannot request leave more than 1 year in advance'));
		}

		// Calculate business days
		const businessDays = this.calculateBusinessDays(startDate, endDate);

		// Business Rule: Max 30 consecutive business days
		if (businessDays > 30) {
			return Result.error(new ExcessiveLeaveDurationError(businessDays));
		}

		// Business Rule: At least 1 business day
		if (businessDays < 1) {
			return Result.error(
				new InvalidDateRangeError('Leave request must include at least 1 business day')
			);
		}

		return Result.ok(new LeaveDateRange(startDate, endDate, businessDays));
	}

	/**
	 * Check if this date range overlaps with another
	 */
	overlapsWith(other: LeaveDateRange): boolean {
		return !(this.endDate < other.startDate || this.startDate > other.endDate);
	}

	/**
	 * Calculate business days between start and end (inclusive)
	 * Excludes weekends (Saturday, Sunday)
	 * TODO: Exclude company holidays
	 */
	private static calculateBusinessDays(start: Date, end: Date): number {
		let count = 0;
		const current = new Date(start);

		while (current <= end) {
			const dayOfWeek = current.getDay();
			// Skip weekends (0 = Sunday, 6 = Saturday)
			if (dayOfWeek !== 0 && dayOfWeek !== 6) {
				count++;
			}
			current.setDate(current.getDate() + 1);
		}

		// TODO: Subtract company holidays (would need holiday repository)
		// For now, just return business days excluding weekends
		return count;
	}

	/**
	 * Get duration in calendar days
	 */
	getTotalDays(): number {
		const diff = this.endDate.getTime() - this.startDate.getTime();
		return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end
	}

	/**
	 * Format date range as string
	 */
	toString(): string {
		return `${this.startDate.toISOString().split('T')[0]} to ${this.endDate.toISOString().split('T')[0]}`;
	}
}
