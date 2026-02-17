// src/services/SkillService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SkillService } from './SkillService';
import { Result } from '$domain/Result';
import { Skill, SkillName, ProficiencyLevel, SkillCategory, SkillNotFoundError } from '$domain/Skill';
import type { SkillRepository } from './ports/SkillRepository';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174000';

function createMockSkill(): Skill {
	const name = SkillName.create('TypeScript').value;
	const level = ProficiencyLevel.create('advanced').value;
	const category = SkillCategory.create('technical').value;

	return Skill.create({
		id: VALID_UUID,
		employeeId: VALID_EMPLOYEE_UUID,
		name,
		proficiencyLevel: level,
		category,
		yearsOfExperience: 3,
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-06-01')
	}).value;
}

function createMockRepository(): SkillRepository {
	return {
		findById: vi.fn(),
		findByEmployeeId: vi.fn(),
		create: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	};
}

describe('SkillService', () => {
	let repository: SkillRepository;
	let service: SkillService;
	let mockSkill: Skill;

	beforeEach(() => {
		repository = createMockRepository();
		service = new SkillService(repository);
		mockSkill = createMockSkill();
	});

	describe('getById', () => {
		it('should return skill when found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockSkill));

			const result = await service.getById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
			expect(repository.findById).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return SkillNotFoundError when not found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(null));

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(SkillNotFoundError);
		});

		it('should propagate repository errors', async () => {
			vi.mocked(repository.findById).mockResolvedValue(
				Result.error(new SkillNotFoundError(VALID_UUID))
			);

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(SkillNotFoundError);
		});

		it('should handle thrown exceptions', async () => {
			vi.mocked(repository.findById).mockRejectedValue(new Error('DB error'));

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
		});
	});

	describe('getByEmployeeId', () => {
		it('should return all skills for an employee', async () => {
			vi.mocked(repository.findByEmployeeId).mockResolvedValue(Result.ok([mockSkill]));

			const result = await service.getByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe(VALID_UUID);
		});

		it('should return empty array when no skills', async () => {
			vi.mocked(repository.findByEmployeeId).mockResolvedValue(Result.ok([]));

			const result = await service.getByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should handle thrown exceptions', async () => {
			vi.mocked(repository.findByEmployeeId).mockRejectedValue(new Error('DB error'));

			const result = await service.getByEmployeeId(VALID_EMPLOYEE_UUID);

			expect(result.isError).toBe(true);
		});
	});

	describe('create', () => {
		it('should create a valid skill', async () => {
			vi.mocked(repository.create).mockResolvedValue(Result.ok(mockSkill));

			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'TypeScript',
				proficiencyLevel: 'advanced',
				category: 'technical',
				yearsOfExperience: 3
			});

			expect(result.isOk).toBe(true);
			expect(repository.create).toHaveBeenCalled();
		});

		it('should return error for invalid skill name', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: '',
				proficiencyLevel: 'advanced',
				category: 'technical',
				yearsOfExperience: 3
			});

			expect(result.isError).toBe(true);
			expect(repository.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid proficiency level', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'TypeScript',
				proficiencyLevel: 'novice',
				category: 'technical',
				yearsOfExperience: 3
			});

			expect(result.isError).toBe(true);
			expect(repository.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid category', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'TypeScript',
				proficiencyLevel: 'advanced',
				category: 'invalid',
				yearsOfExperience: 3
			});

			expect(result.isError).toBe(true);
			expect(repository.create).not.toHaveBeenCalled();
		});

		it('should return error for invalid years of experience', async () => {
			const result = await service.create({
				id: VALID_UUID,
				employeeId: VALID_EMPLOYEE_UUID,
				name: 'TypeScript',
				proficiencyLevel: 'advanced',
				category: 'technical',
				yearsOfExperience: -1
			});

			expect(result.isError).toBe(true);
		});
	});

	describe('update', () => {
		it('should update skill proficiency', async () => {
			const updatedSkill = mockSkill.updateProficiency(
				ProficiencyLevel.create('expert').value,
				5
			);
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockSkill));
			vi.mocked(repository.update).mockResolvedValue(Result.ok(updatedSkill));

			const result = await service.update(VALID_UUID, {
				proficiencyLevel: 'expert',
				yearsOfExperience: 5
			});

			expect(result.isOk).toBe(true);
			expect(result.value.proficiencyLevel.value).toBe('expert');
		});

		it('should return SkillNotFoundError when skill not found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(null));

			const result = await service.update(VALID_UUID, {
				proficiencyLevel: 'expert',
				yearsOfExperience: 5
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(SkillNotFoundError);
		});

		it('should return error for invalid proficiency level', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockSkill));

			const result = await service.update(VALID_UUID, {
				proficiencyLevel: 'invalid',
				yearsOfExperience: 5
			});

			expect(result.isError).toBe(true);
			expect(repository.update).not.toHaveBeenCalled();
		});
	});

	describe('delete', () => {
		it('should delete a skill', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockSkill));
			vi.mocked(repository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.delete(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(repository.delete).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return SkillNotFoundError when skill not found', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(null));

			const result = await service.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(SkillNotFoundError);
			expect(repository.delete).not.toHaveBeenCalled();
		});

		it('should handle repository errors', async () => {
			vi.mocked(repository.findById).mockResolvedValue(Result.ok(mockSkill));
			vi.mocked(repository.delete).mockResolvedValue(
				Result.error(new SkillNotFoundError(VALID_UUID))
			);

			const result = await service.delete(VALID_UUID);

			expect(result.isError).toBe(true);
		});
	});
});
