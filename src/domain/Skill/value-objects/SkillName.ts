// src/domain/Skill/value-objects/SkillName.ts
import { Result } from '$domain/Result';
import { InvalidSkillError } from '../errors/SkillErrors';

/**
 * Value object representing the name of a skill.
 *
 * Rules:
 * - Must be 1-100 characters long
 * - Trimmed of leading/trailing whitespace
 * - Must not be empty after trimming
 */
export class SkillName {
	private constructor(private readonly _value: string) {}

	/**
	 * Create a SkillName value object.
	 * @param value - The raw skill name string
	 * @returns Result containing SkillName or InvalidSkillError
	 */
	static create(value: string): Result<SkillName, InvalidSkillError> {
		if (typeof value !== 'string') {
			return Result.error(new InvalidSkillError('Skill name must be a string'));
		}

		const trimmed = value.trim();

		if (trimmed.length === 0) {
			return Result.error(new InvalidSkillError('Skill name must not be empty'));
		}

		if (trimmed.length > 100) {
			return Result.error(
				new InvalidSkillError(
					`Skill name must not exceed 100 characters, got ${trimmed.length}`
				)
			);
		}

		return Result.ok(new SkillName(trimmed));
	}

	/** The skill name value */
	get value(): string {
		return this._value;
	}

	equals(other: SkillName): boolean {
		return this._value === other._value;
	}

	toString(): string {
		return this._value;
	}
}
