// src/domain/Skill/errors/SkillErrors.ts

/**
 * Base error class for all skill domain errors.
 */
export class SkillError extends Error {
	constructor(
		message: string,
		public readonly code: string
	) {
		super(message);
		this.name = 'SkillError';
	}
}

/**
 * Error thrown when a skill cannot be found by the given ID.
 */
export class SkillNotFoundError extends SkillError {
	constructor(id: string) {
		super(`Skill not found: ${id}`, 'SKILL_NOT_FOUND');
		this.name = 'SkillNotFoundError';
	}
}

/**
 * Error thrown when skill data is invalid.
 */
export class InvalidSkillError extends SkillError {
	constructor(message: string) {
		super(message, 'INVALID_SKILL');
		this.name = 'InvalidSkillError';
	}
}
