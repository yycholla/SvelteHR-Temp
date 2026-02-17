// src/adapters/graphql/GraphQLSkillAdapter.ts
import { gql } from '@urql/core';
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
import type { SkillRepository } from '$services/ports/SkillRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

/**
 * GraphQL schema response shape for skill
 */
interface GraphQLSkill {
	id: string;
	employeeId: string;
	name: string;
	proficiencyLevel: string;
	category: string;
	yearsOfExperience: number;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLSkillAdapter implements SkillRepository port for GraphQL backend.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLSkillAdapter(graphqlPort);
 * const result = await adapter.findByEmployeeId('employee-uuid');
 * if (result.isOk) {
 *   console.log(result.value); // Skill[]
 * }
 * ```
 */
export class GraphQLSkillAdapter implements SkillRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<Skill | null, SkillError>> {
		const query = gql`
			query GetSkill($id: UUID!) {
				skill(id: $id) {
					id
					employeeId
					name
					proficiencyLevel
					category
					yearsOfExperience
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ skill: GraphQLSkill | null }>(query, { id });

			if (!result?.skill) {
				return Result.ok(null);
			}

			const skill = this.mapToEntity(result.skill);
			return Result.ok(skill);
		} catch {
			return Result.ok(null);
		}
	}

	async findByEmployeeId(employeeId: string): Promise<Result<Skill[], SkillError>> {
		const query = gql`
			query GetSkillsByEmployee($employeeId: UUID!) {
				skillsByEmployee(employeeId: $employeeId) {
					id
					employeeId
					name
					proficiencyLevel
					category
					yearsOfExperience
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const result = await this.graphql.query<{ skillsByEmployee: GraphQLSkill[] }>(query, {
				employeeId
			});

			const skills = (result?.skillsByEmployee ?? [])
				.map((s) => this.mapToEntity(s))
				.filter((s): s is Skill => s !== null);

			return Result.ok(skills);
		} catch (error) {
			return Result.error(
				new InvalidSkillError(
					`Failed to fetch skills: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(skill: Skill): Promise<Result<Skill, SkillError>> {
		const mutation = gql`
			mutation CreateSkill($input: CreateSkillInput!) {
				createSkill(input: $input) {
					id
					employeeId
					name
					proficiencyLevel
					category
					yearsOfExperience
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				id: skill.id,
				employeeId: skill.employeeId,
				name: skill.name.value,
				proficiencyLevel: skill.proficiencyLevel.value,
				category: skill.category.value,
				yearsOfExperience: skill.yearsOfExperience
			};

			const result = await this.graphql.mutation<{ createSkill: GraphQLSkill }>(mutation, {
				input
			});

			if (!result?.createSkill) {
				return Result.error(new InvalidSkillError('Failed to create skill'));
			}

			const created = this.mapToEntity(result.createSkill);
			if (!created) {
				return Result.error(new InvalidSkillError('Invalid skill data returned from create'));
			}

			return Result.ok(created);
		} catch (error) {
			return Result.error(
				new InvalidSkillError(
					`Failed to create skill: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(skill: Skill): Promise<Result<Skill, SkillError>> {
		const mutation = gql`
			mutation UpdateSkill($id: UUID!, $input: UpdateSkillInput!) {
				updateSkill(id: $id, input: $input) {
					id
					employeeId
					name
					proficiencyLevel
					category
					yearsOfExperience
					createdAt
					updatedAt
				}
			}
		`;

		try {
			const input = {
				proficiencyLevel: skill.proficiencyLevel.value,
				yearsOfExperience: skill.yearsOfExperience
			};

			const result = await this.graphql.mutation<{ updateSkill: GraphQLSkill }>(mutation, {
				id: skill.id,
				input
			});

			if (!result?.updateSkill) {
				return Result.error(new InvalidSkillError('Failed to update skill'));
			}

			const updated = this.mapToEntity(result.updateSkill);
			if (!updated) {
				return Result.error(new InvalidSkillError('Invalid skill data returned from update'));
			}

			return Result.ok(updated);
		} catch (error) {
			return Result.error(
				new InvalidSkillError(
					`Failed to update skill: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, SkillError>> {
		const mutation = gql`
			mutation DeleteSkill($id: UUID!) {
				deleteSkill(id: $id)
			}
		`;

		try {
			const result = await this.graphql.mutation<{ deleteSkill: boolean }>(mutation, { id });

			if (!result?.deleteSkill) {
				return Result.error(new SkillNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new SkillNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL skill data to domain Skill entity.
	 * @private
	 * @returns Skill entity or null if data is invalid (resilient error handling)
	 */
	private mapToEntity(data: GraphQLSkill): Skill | null {
		try {
			const nameResult = SkillName.create(data.name);
			if (nameResult.isError) return null;

			const levelResult = ProficiencyLevel.create(data.proficiencyLevel);
			if (levelResult.isError) return null;

			const categoryResult = SkillCategory.create(data.category);
			if (categoryResult.isError) return null;

			const createdAt = new Date(data.createdAt);
			const updatedAt = new Date(data.updatedAt);

			if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) return null;

			const skillResult = Skill.create({
				id: data.id,
				employeeId: data.employeeId,
				name: nameResult.value,
				proficiencyLevel: levelResult.value,
				category: categoryResult.value,
				yearsOfExperience: data.yearsOfExperience,
				createdAt,
				updatedAt
			});

			if (skillResult.isError) return null;

			return skillResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}
}
