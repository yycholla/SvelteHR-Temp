// src/domain/Employee/HireDate.ts
import { Result } from '$domain/Result';
import { InvalidHireDateError } from '$domain/errors';

export class HireDate {
	private constructor(public readonly value: Date) {}

	static create(date: string | Date): Result<HireDate, InvalidHireDateError> {
		const hireDate = typeof date === 'string' ? new Date(date) : new Date(date);

		if (isNaN(hireDate.getTime())) {
			return Result.error(new InvalidHireDateError('Invalid date format'));
		}

		// Normalize to midnight for consistent behavior
		hireDate.setHours(0, 0, 0, 0);

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (hireDate > today) {
			return Result.error(new InvalidHireDateError('Hire date cannot be in the future'));
		}

		return Result.ok(new HireDate(hireDate));
	}

	isBefore(other: HireDate): boolean {
		return this.value < other.value;
	}

	getDaysEmployed(): number {
		const now = new Date();
		const diffMs = now.getTime() - this.value.getTime();
		return Math.floor(diffMs / (1000 * 60 * 60 * 24));
	}

	equals(other: HireDate): boolean {
		return this.value.getTime() === other.value.getTime();
	}
}
