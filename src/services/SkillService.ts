// src/services/SkillService.ts
import { Result } from '$domain/Result';
import {
	Skill,
	SkillName,
	ProficiencyLevel,
	SkillCategory,
	SkillNotFoundError,
	InvalidSkillError
} from '$domain/Skill';
import type { SkillError } from '$domain/Skill';
import type { SkillRepository } from './ports/SkillRepository';

export interface CreateSkillInput {
	id: string;
	employeeId: string;
	name: string;
	proficiencyLevel: string;
	category: string;
	yearsOfExperience: number;
}

export interface UpdateSkillInput {
	proficiencyLevel: string;
	yearsOfExperience: number;
}

/**
 * Service for employee skill business operations.
 *
 * Orchestrates skill CRUD operations and business rules,
 * delegating data access to the SkillRepository port.
 *
 * @example
 * ```typescript
 * const service = createSkillService(event);
 * const result = await service.getByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // Skill[]
 * }
 * ```
 */
export class SkillService {
	constructor(private readonly repository: SkillRepository) {}

	/**
	 * Get a skill by ID.
	 * Returns SkillNotFoundError if not found.
	 */
	async getById(id: string): Promise<Result<Skill, SkillError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new SkillNotFoundError(id));
			}

			return Result.ok(findResult.value);
		} catch {
			return Result.error(new SkillNotFoundError(id));
		}
	}

	/**
	 * Get all skills for an employee.
	 */
	async getByEmployeeId(employeeId: string): Promise<Result<Skill[], SkillError>> {
		try {
			return await this.repository.findByEmployeeId(employeeId);
		} catch {
			return Result.error(new SkillNotFoundError(employeeId));
		}
	}

	/**
	 * Create a new skill for an employee.
	 * Validates all input data and creates domain entity before persisting.
	 */
	async create(input: CreateSkillInput): Promise<Result<Skill, SkillError>> {
		try {
			const nameResult = SkillName.create(input.name);
			if (nameResult.isError) return Result.error(nameResult.error);

			const levelResult = ProficiencyLevel.create(input.proficiencyLevel);
			if (levelResult.isError) return Result.error(levelResult.error);

			const categoryResult = SkillCategory.create(input.category);
			if (categoryResult.isError) return Result.error(categoryResult.error);

			const now = new Date();
			const skillResult = Skill.create({
				id: input.id,
				employeeId: input.employeeId,
				name: nameResult.value,
				proficiencyLevel: levelResult.value,
				category: categoryResult.value,
				yearsOfExperience: input.yearsOfExperience,
				createdAt: now,
				updatedAt: now
			});

			if (skillResult.isError) return Result.error(skillResult.error);

			return await this.repository.create(skillResult.value);
		} catch {
			return Result.error(new InvalidSkillError('Failed to create skill'));
		}
	}

	/**
	 * Update an existing skill's proficiency level and years of experience.
	 */
	async update(id: string, input: UpdateSkillInput): Promise<Result<Skill, SkillError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new SkillNotFoundError(id));
			}

			const levelResult = ProficiencyLevel.create(input.proficiencyLevel);
			if (levelResult.isError) return Result.error(levelResult.error);

			const updated = findResult.value.updateProficiency(
				levelResult.value,
				input.yearsOfExperience
			);

			return await this.repository.update(updated);
		} catch {
			return Result.error(new SkillNotFoundError(id));
		}
	}

	/**
	 * Delete a skill by ID.
	 */
	async delete(id: string): Promise<Result<void, SkillError>> {
		try {
			const findResult = await this.repository.findById(id);
			if (findResult.isError) return Result.error(findResult.error);

			if (!findResult.value) {
				return Result.error(new SkillNotFoundError(id));
			}

			return await this.repository.delete(id);
		} catch {
			return Result.error(new SkillNotFoundError(id));
		}
	}
}
