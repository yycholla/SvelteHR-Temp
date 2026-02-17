// src/domain/Skill/value-objects/ProficiencyLevel.ts
import { Result } from '$domain/Result';
import { InvalidSkillError } from '../errors/SkillErrors';

type ProficiencyLevelValue = 'beginner' | 'intermediate' | 'advanced' | 'expert';

const VALID_LEVELS: ReadonlySet<string> = new Set([
	'beginner',
	'intermediate',
	'advanced',
	'expert'
]);

const LEVEL_RANKS: Readonly<Record<ProficiencyLevelValue, number>> = {
	beginner: 1,
	intermediate: 2,
	advanced: 3,
	expert: 4
};

/**
 * Value object representing the proficiency level of an employee skill.
 *
 * Valid values: beginner, intermediate, advanced, expert
 *
 * Provides business logic:
 * - rank getter returns numeric value (1-4) for comparison
 * - isExpert() returns true only for 'expert' level
 */
export class ProficiencyLevel {
	private constructor(private readonly _value: ProficiencyLevelValue) {}

	/**
	 * Create a ProficiencyLevel value object.
	 * @param value - Proficiency level string
	 * @returns Result containing ProficiencyLevel or InvalidSkillError
	 */
	static create(value: string): Result<ProficiencyLevel, InvalidSkillError> {
		if (!VALID_LEVELS.has(value)) {
			return Result.error(
				new InvalidSkillError(
					`Invalid proficiency level: "${value}". Must be one of: ${Array.from(VALID_LEVELS).join(', ')}`
				)
			);
		}

		return Result.ok(new ProficiencyLevel(value as ProficiencyLevelValue));
	}

	/** The proficiency level value */
	get value(): ProficiencyLevelValue {
		return this._value;
	}

	/**
	 * Returns numeric rank for the level (1=beginner, 4=expert).
	 * Useful for comparison and sorting.
	 */
	get rank(): number {
		return LEVEL_RANKS[this._value];
	}

	/**
	 * Returns true if this is expert level proficiency.
	 */
	isExpert(): boolean {
		return this._value === 'expert';
	}

	/**
	 * Returns true if this level is higher than the other.
	 */
	isHigherThan(other: ProficiencyLevel): boolean {
		return this.rank > other.rank;
	}

	equals(other: ProficiencyLevel): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
