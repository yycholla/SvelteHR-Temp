// src/domain/Skill/value-objects/SkillCategory.ts
import { Result } from '$domain/Result';
import { InvalidSkillError } from '../errors/SkillErrors';

type SkillCategoryValue =
	| 'technical'
	| 'soft'
	| 'language'
	| 'management'
	| 'domain'
	| 'other';

const VALID_CATEGORIES: ReadonlySet<string> = new Set([
	'technical',
	'soft',
	'language',
	'management',
	'domain',
	'other'
]);

/**
 * Value object representing the category of a skill.
 *
 * Valid values: technical, soft, language, management, domain, other
 */
export class SkillCategory {
	private constructor(private readonly _value: SkillCategoryValue) {}

	/**
	 * Create a SkillCategory value object.
	 * @param value - Skill category string
	 * @returns Result containing SkillCategory or InvalidSkillError
	 */
	static create(value: string): Result<SkillCategory, InvalidSkillError> {
		if (!VALID_CATEGORIES.has(value)) {
			return Result.error(
				new InvalidSkillError(
					`Invalid skill category: "${value}". Must be one of: ${Array.from(VALID_CATEGORIES).join(', ')}`
				)
			);
		}

		return Result.ok(new SkillCategory(value as SkillCategoryValue));
	}

	/** The skill category value */
	get value(): SkillCategoryValue {
		return this._value;
	}

	/**
	 * Returns true if this is a technical skill (programming, tools, etc.).
	 */
	isTechnical(): boolean {
		return this._value === 'technical';
	}

	/**
	 * Returns true if this is a soft skill (communication, leadership, etc.).
	 */
	isSoft(): boolean {
		return this._value === 'soft';
	}

	equals(other: SkillCategory): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
