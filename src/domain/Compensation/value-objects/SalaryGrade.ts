// src/domain/Compensation/value-objects/SalaryGrade.ts
import { Result } from '$domain/Result';
import { InvalidCompensationError } from '../errors';

export type SalaryGradeValue = 'entry' | 'mid' | 'senior' | 'lead' | 'principal';

const VALID_GRADES: ReadonlySet<SalaryGradeValue> = new Set([
	'entry',
	'mid',
	'senior',
	'lead',
	'principal'
]);

const GRADE_ORDER: ReadonlyMap<SalaryGradeValue, number> = new Map([
	['entry', 0],
	['mid', 1],
	['senior', 2],
	['lead', 3],
	['principal', 4]
]);

/**
 * SalaryGrade value object representing employee seniority level.
 * Provides ordering and promotion detection capabilities.
 */
export class SalaryGrade {
	private constructor(private readonly _value: SalaryGradeValue) {}

	static create(grade: string): Result<SalaryGrade, InvalidCompensationError> {
		const normalizedGrade = grade.trim().toLowerCase() as SalaryGradeValue;

		if (!VALID_GRADES.has(normalizedGrade)) {
			return Result.error(
				new InvalidCompensationError(
					`Invalid salary grade: ${grade}. Must be one of: entry, mid, senior, lead, principal`,
					grade
				)
			);
		}

		return Result.ok(new SalaryGrade(normalizedGrade));
	}

	get value(): SalaryGradeValue {
		return this._value;
	}

	equals(other: SalaryGrade): boolean {
		return this._value === other._value;
	}

	/**
	 * Compares two salary grades.
	 * @returns negative if this < other, 0 if equal, positive if this > other
	 */
	compareTo(other: SalaryGrade): number {
		const thisOrder = GRADE_ORDER.get(this._value);
		const otherOrder = GRADE_ORDER.get(other._value);
		return thisOrder! - otherOrder!;
	}

	/**
	 * Checks if this grade represents a promotion from another grade.
	 */
	isPromotion(fromGrade: SalaryGrade): boolean {
		return this.compareTo(fromGrade) > 0;
	}
}
