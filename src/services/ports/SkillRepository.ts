// src/services/ports/SkillRepository.ts
import type { Result } from '$domain/Result';
import type { Skill } from '$domain/Skill';
import type { SkillError } from '$domain/Skill';

/**
 * Port interface for skill data access.
 * Implementations should be in the adapters layer.
 */
export interface SkillRepository {
	/**
	 * Find skill by ID
	 */
	findById(id: string): Promise<Result<Skill | null, SkillError>>;

	/**
	 * Find all skills for an employee
	 */
	findByEmployeeId(employeeId: string): Promise<Result<Skill[], SkillError>>;

	/**
	 * Create a new skill
	 */
	create(skill: Skill): Promise<Result<Skill, SkillError>>;

	/**
	 * Update an existing skill
	 */
	update(skill: Skill): Promise<Result<Skill, SkillError>>;

	/**
	 * Delete a skill by ID
	 */
	delete(id: string): Promise<Result<void, SkillError>>;
}
