// src/adapters/graphql/GraphQLSkillAdapter.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLSkillAdapter } from './GraphQLSkillAdapter';
import type { GraphQLPort } from '$services/ports/GraphQLPort';
import {
	Skill,
	SkillName,
	ProficiencyLevel,
	SkillCategory,
	SkillNotFoundError
} from '$domain/Skill';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174000';

const validGraphQLSkill = {
	id: VALID_UUID,
	employeeId: VALID_EMPLOYEE_UUID,
	name: 'TypeScript',
	proficiencyLevel: 'advanced',
	category: 'technical',
	yearsOfExperience: 3,
	createdAt: '2023-01-01T00:00:00.000Z',
	updatedAt: '2023-06-01T00:00:00.000Z'
};

function createMockGraphQLPort(): GraphQLPort {
	return {
		query: vi.fn(),
		mutation: vi.fn()
	};
}

describe('GraphQLSkillAdapter', () => {
	let graphql: GraphQLPort;
	let adapter: GraphQLSkillAdapter;

	beforeEach(() => {
		graphql = createMockGraphQLPort();
		adapter = new GraphQLSkillAdapter(graphql);
	});

	describe('findById', () => {
		it('should return skill when found', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ skill: validGraphQLSkill });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value?.id).toBe(VALID_UUID);
			expect(result.value?.name.value).toBe('TypeScript');
			expect(result.value?.proficiencyLevel.value).toBe('advanced');
		});

		it('should return null when skill not found', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ skill: null });

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null when query throws', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Network error'));

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});

		it('should return null for invalid skill data', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skill: { ...validGraphQLSkill, proficiencyLevel: 'invalid-level' }
			});

			const result = await adapter.findById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toBeNull();
		});
	});

	describe('findByEmployeeId', () => {
		it('should return skills for employee', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skillsByEmployee: [validGraphQLSkill]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].name.value).toBe('TypeScript');
		});

		it('should return empty array when no skills', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ skillsByEmployee: [] });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should filter out invalid skills (resilient)', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skillsByEmployee: [validGraphQLSkill, { ...validGraphQLSkill, proficiencyLevel: 'invalid' }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when query throws', async () => {
			vi.mocked(graphql.query).mockRejectedValue(new Error('Network error'));

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isError).toBe(true);
		});

		it('should handle null/undefined response gracefully', async () => {
			vi.mocked(graphql.query).mockResolvedValue({ skillsByEmployee: null });

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});

	describe('create', () => {
		it('should create and return skill', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ createSkill: validGraphQLSkill });

			const skill = Skill.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: SkillName.create('TypeScript').value,
				proficiencyLevel: ProficiencyLevel.create('advanced').value,
				category: SkillCategory.create('technical').value,
				yearsOfExperience: 3,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2023-06-01')
			}).value;

			const result = await adapter.create(skill);

			expect(result.isOk).toBe(true);
			expect(result.value.name.value).toBe('TypeScript');
			expect(graphql.mutation).toHaveBeenCalled();
		});

		it('should return error when mutation returns null', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ createSkill: null });

			const skill = Skill.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: SkillName.create('TypeScript').value,
				proficiencyLevel: ProficiencyLevel.create('advanced').value,
				category: SkillCategory.create('technical').value,
				yearsOfExperience: 3,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2023-06-01')
			}).value;

			const result = await adapter.create(skill);

			expect(result.isError).toBe(true);
		});

		it('should return error when mutation throws', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Network error'));

			const skill = Skill.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: SkillName.create('TypeScript').value,
				proficiencyLevel: ProficiencyLevel.create('advanced').value,
				category: SkillCategory.create('technical').value,
				yearsOfExperience: 3,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2023-06-01')
			}).value;

			const result = await adapter.create(skill);

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update and return skill', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ updateSkill: validGraphQLSkill });

			const skill = Skill.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: SkillName.create('TypeScript').value,
				proficiencyLevel: ProficiencyLevel.create('advanced').value,
				category: SkillCategory.create('technical').value,
				yearsOfExperience: 3,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2023-06-01')
			}).value;

			const result = await adapter.update(skill);

			expect(result.isOk).toBe(true);
			expect(graphql.mutation).toHaveBeenCalled();
		});

		it('should return error when mutation returns null', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ updateSkill: null });

			const skill = Skill.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: SkillName.create('TypeScript').value,
				proficiencyLevel: ProficiencyLevel.create('advanced').value,
				category: SkillCategory.create('technical').value,
				yearsOfExperience: 3,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2023-06-01')
			}).value;

			const result = await adapter.update(skill);

			expect(result.isError).toBe(true);
		});

		it('should return error when mutation throws', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Network error'));

			const skill = Skill.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: SkillName.create('TypeScript').value,
				proficiencyLevel: ProficiencyLevel.create('advanced').value,
				category: SkillCategory.create('technical').value,
				yearsOfExperience: 3,
				createdAt: new Date('2023-01-01'),
				updatedAt: new Date('2023-06-01')
			}).value;

			const result = await adapter.update(skill);

			expect(result.isError).toBe(true);
		});
	});

	describe('delete', () => {
		it('should delete skill successfully', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ deleteSkill: true });

			const result = await adapter.delete(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(graphql.mutation).toHaveBeenCalled();
		});

		it('should return SkillNotFoundError when mutation returns false', async () => {
			vi.mocked(graphql.mutation).mockResolvedValue({ deleteSkill: false });

			const result = await adapter.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(SkillNotFoundError);
		});

		it('should return SkillNotFoundError when mutation throws', async () => {
			vi.mocked(graphql.mutation).mockRejectedValue(new Error('Network error'));

			const result = await adapter.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(SkillNotFoundError);
		});
	});

	describe('mapToEntity (via findByEmployeeId)', () => {
		it('should map all fields correctly', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skillsByEmployee: [validGraphQLSkill]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			const skill = result.value[0];
			expect(skill.id).toBe(VALID_UUID);
			expect(skill.employeeId).toBe(VALID_EMPLOYEE_UUID);
			expect(skill.name.value).toBe('TypeScript');
			expect(skill.proficiencyLevel.value).toBe('advanced');
			expect(skill.category.value).toBe('technical');
			expect(skill.yearsOfExperience).toBe(3);
		});

		it('should return null for invalid proficiency level', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skillsByEmployee: [{ ...validGraphQLSkill, proficiencyLevel: 'expert-invalid' }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return null for invalid category', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skillsByEmployee: [{ ...validGraphQLSkill, category: 'unknown-category' }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return null for invalid date', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skillsByEmployee: [{ ...validGraphQLSkill, createdAt: 'not-a-date' }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return null for invalid years of experience', async () => {
			vi.mocked(graphql.query).mockResolvedValue({
				skillsByEmployee: [{ ...validGraphQLSkill, yearsOfExperience: 100 }]
			});

			const result = await adapter.findByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});
	});
});
