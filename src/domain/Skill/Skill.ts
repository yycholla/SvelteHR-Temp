// src/domain/Skill/Skill.ts
import { Result } from '$domain/Result';
import { SkillName } from './value-objects/SkillName';
import { ProficiencyLevel } from './value-objects/ProficiencyLevel';
import { SkillCategory } from './value-objects/SkillCategory';
import { SkillError, InvalidSkillError } from './errors/SkillErrors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
	return UUID_PATTERN.test(value);
}

export interface CreateSkillData {
	id: string;
	employeeId: string;
	name: SkillName;
	proficiencyLevel: ProficiencyLevel;
	category: SkillCategory;
	yearsOfExperience: number;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Skill aggregate root entity.
 *
 * Represents an employee skill with proficiency tracking.
 * Enforces business invariants:
 * - id and employeeId must be valid UUIDs
 * - yearsOfExperience must be 0-50 (integer)
 * - dates use defensive copies to prevent mutation
 *
 * @example
 * ```typescript
 * const nameResult = SkillName.create('TypeScript');
 * const levelResult = ProficiencyLevel.create('advanced');
 * const categoryResult = SkillCategory.create('technical');
 *
 * const skillResult = Skill.create({
 *   id: '123e4567-...',
 *   employeeId: '123e4567-...',
 *   name: nameResult.value,
 *   proficiencyLevel: levelResult.value,
 *   category: categoryResult.value,
 *   yearsOfExperience: 3,
 *   createdAt: new Date(),
 *   updatedAt: new Date()
 * });
 * ```
 */
export class Skill {
	private constructor(
		private readonly _id: string,
		private readonly _employeeId: string,
		private readonly _name: SkillName,
		private readonly _proficiencyLevel: ProficiencyLevel,
		private readonly _category: SkillCategory,
		private readonly _yearsOfExperience: number,
		private readonly _createdAt: Date,
		private readonly _updatedAt: Date
	) {}

	/**
	 * Create a Skill entity.
	 * @param data - Skill creation data with validated value objects
	 * @returns Result containing Skill or SkillError
	 */
	static create(data: CreateSkillData): Result<Skill, SkillError> {
		if (!isValidUUID(data.id)) {
			return Result.error(new InvalidSkillError(`Invalid skill ID: "${data.id}"`));
		}

		if (!isValidUUID(data.employeeId)) {
			return Result.error(new InvalidSkillError(`Invalid employee ID: "${data.employeeId}"`));
		}

		if (
			!Number.isInteger(data.yearsOfExperience) ||
			data.yearsOfExperience < 0 ||
			data.yearsOfExperience > 50
		) {
			return Result.error(
				new InvalidSkillError(
					`Years of experience must be an integer between 0 and 50, got ${data.yearsOfExperience}`
				)
			);
		}

		if (isNaN(data.createdAt.getTime())) {
			return Result.error(new InvalidSkillError('createdAt must be a valid date'));
		}

		if (isNaN(data.updatedAt.getTime())) {
			return Result.error(new InvalidSkillError('updatedAt must be a valid date'));
		}

		return Result.ok(
			new Skill(
				data.id,
				data.employeeId,
				data.name,
				data.proficiencyLevel,
				data.category,
				data.yearsOfExperience,
				new Date(data.createdAt), // defensive copy
				new Date(data.updatedAt) // defensive copy
			)
		);
	}

	get id(): string {
		return this._id;
	}

	get employeeId(): string {
		return this._employeeId;
	}

	get name(): SkillName {
		return this._name;
	}

	get proficiencyLevel(): ProficiencyLevel {
		return this._proficiencyLevel;
	}

	get category(): SkillCategory {
		return this._category;
	}

	get yearsOfExperience(): number {
		return this._yearsOfExperience;
	}

	/** Returns a defensive copy of the creation date */
	get createdAt(): Date {
		return new Date(this._createdAt);
	}

	/** Returns a defensive copy of the last updated date */
	get updatedAt(): Date {
		return new Date(this._updatedAt);
	}

	/**
	 * Update the skill's proficiency level and years of experience.
	 * Returns a new Skill instance with the updated values.
	 * @param level - New ProficiencyLevel value object
	 * @param years - New years of experience (0-50 integer)
	 * @returns New Skill instance with updated values
	 */
	updateProficiency(level: ProficiencyLevel, years: number): Skill {
		return new Skill(
			this._id,
			this._employeeId,
			this._name,
			level,
			this._category,
			years,
			new Date(this._createdAt),
			new Date() // updated timestamp
		);
	}
}
