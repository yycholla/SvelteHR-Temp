// src/domain/Compliance/value-objects/ComplianceScore.ts
import { Result } from '$domain/Result';
import { InvalidComplianceError } from '../errors/ComplianceErrors';

const MIN_SCORE = 0;
const MAX_SCORE = 100;
const PASSING_THRESHOLD = 70;

type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Value object representing a compliance score (0-100 integer).
 *
 * Provides business logic via:
 * - grade getter: letter grade ('A' >= 90, 'B' >= 80, 'C' >= 70, 'D' >= 60, 'F' < 60)
 * - isPassingScore(): returns true if score >= 70
 */
export class ComplianceScore {
	private constructor(private readonly _value: number) {}

	/**
	 * Create a ComplianceScore value object.
	 * @param value - Integer score between 0 and 100 (inclusive)
	 * @returns Result containing ComplianceScore or InvalidComplianceError
	 */
	static create(value: number): Result<ComplianceScore, InvalidComplianceError> {
		if (!Number.isFinite(value)) {
			return Result.error(
				new InvalidComplianceError('Compliance score must be a finite number')
			);
		}

		if (!Number.isInteger(value)) {
			return Result.error(
				new InvalidComplianceError(
					`Compliance score must be an integer, got: ${value}`
				)
			);
		}

		if (value < MIN_SCORE || value > MAX_SCORE) {
			return Result.error(
				new InvalidComplianceError(
					`Compliance score must be between ${MIN_SCORE} and ${MAX_SCORE}, got: ${value}`
				)
			);
		}

		return Result.ok(new ComplianceScore(value));
	}

	/** The numeric score value */
	get value(): number {
		return this._value;
	}

	/**
	 * Letter grade based on score:
	 * - A: 90-100
	 * - B: 80-89
	 * - C: 70-79
	 * - D: 60-69
	 * - F: <60
	 */
	get grade(): Grade {
		if (this._value >= 90) return 'A';
		if (this._value >= 80) return 'B';
		if (this._value >= 70) return 'C';
		if (this._value >= 60) return 'D';
		return 'F';
	}

	/**
	 * Returns true if score is at or above the passing threshold (70).
	 */
	isPassingScore(): boolean {
		return this._value >= PASSING_THRESHOLD;
	}

	equals(other: ComplianceScore): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value.toString();
	}
}
