// src/domain/Skill/Skill.test.ts
import { describe, it, expect } from 'vitest';
import { Skill } from './Skill';
import { SkillName } from './value-objects/SkillName';
import { ProficiencyLevel } from './value-objects/ProficiencyLevel';
import { SkillCategory } from './value-objects/SkillCategory';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_EMPLOYEE_UUID = '223e4567-e89b-12d3-a456-426614174000';

function createValidSkillData() {
	const name = SkillName.create('TypeScript').value;
	const level = ProficiencyLevel.create('advanced').value;
	const category = SkillCategory.create('technical').value;

	return {
		id: VALID_UUID,
		employeeId: VALID_EMPLOYEE_UUID,
		name,
		proficiencyLevel: level,
		category,
		yearsOfExperience: 3,
		createdAt: new Date('2023-01-01'),
		updatedAt: new Date('2023-06-01')
	};
}

describe('Skill', () => {
	describe('create', () => {
		it('should create a valid skill', () => {
			const data = createValidSkillData();
			const result = Skill.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
			expect(result.value.employeeId).toBe(VALID_EMPLOYEE_UUID);
			expect(result.value.name.value).toBe('TypeScript');
			expect(result.value.proficiencyLevel.value).toBe('advanced');
			expect(result.value.category.value).toBe('technical');
			expect(result.value.yearsOfExperience).toBe(3);
		});

		it('should reject invalid skill ID', () => {
			const data = { ...createValidSkillData(), id: 'not-a-uuid' };
			const result = Skill.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid skill ID');
		});

		it('should reject invalid employee ID', () => {
			const data = { ...createValidSkillData(), employeeId: 'invalid' };
			const result = Skill.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Invalid employee ID');
		});

		it('should reject negative years of experience', () => {
			const data = { ...createValidSkillData(), yearsOfExperience: -1 };
			const result = Skill.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Years of experience');
		});

		it('should reject years of experience exceeding 50', () => {
			const data = { ...createValidSkillData(), yearsOfExperience: 51 };
			const result = Skill.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Years of experience');
		});

		it('should reject non-integer years of experience', () => {
			const data = { ...createValidSkillData(), yearsOfExperience: 2.5 };
			const result = Skill.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('Years of experience');
		});

		it('should accept 0 years of experience', () => {
			const data = { ...createValidSkillData(), yearsOfExperience: 0 };
			const result = Skill.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.yearsOfExperience).toBe(0);
		});

		it('should accept exactly 50 years of experience', () => {
			const data = { ...createValidSkillData(), yearsOfExperience: 50 };
			const result = Skill.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.yearsOfExperience).toBe(50);
		});

		it('should reject invalid createdAt date', () => {
			const data = { ...createValidSkillData(), createdAt: new Date('invalid') };
			const result = Skill.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('createdAt');
		});

		it('should reject invalid updatedAt date', () => {
			const data = { ...createValidSkillData(), updatedAt: new Date('invalid') };
			const result = Skill.create(data);

			expect(result.isError).toBe(true);
			expect(result.error.message).toContain('updatedAt');
		});

		it('should make defensive copies of dates', () => {
			const createdAt = new Date(2023, 0, 1); // local date to avoid UTC offset issues
			const updatedAt = new Date(2023, 5, 1);
			const data = { ...createValidSkillData(), createdAt, updatedAt };
			const skill = Skill.create(data).value;

			createdAt.setFullYear(2099);
			updatedAt.setFullYear(2099);

			expect(skill.createdAt.getFullYear()).toBe(2023);
			expect(skill.updatedAt.getFullYear()).toBe(2023);
		});

		it('should return defensive copies from getters', () => {
			const data = {
				...createValidSkillData(),
				createdAt: new Date(2023, 0, 1),
				updatedAt: new Date(2023, 5, 1)
			};
			const skill = Skill.create(data).value;
			const createdAt = skill.createdAt;
			createdAt.setFullYear(2099);

			expect(skill.createdAt.getFullYear()).toBe(2023);
		});
	});

	describe('updateProficiency', () => {
		it('should return a new skill instance with updated proficiency', () => {
			const skill = Skill.create(createValidSkillData()).value;
			const newLevel = ProficiencyLevel.create('expert').value;
			const updated = skill.updateProficiency(newLevel, 5);

			expect(updated).not.toBe(skill);
			expect(updated.proficiencyLevel.value).toBe('expert');
			expect(updated.yearsOfExperience).toBe(5);
		});

		it('should preserve other fields when updating proficiency', () => {
			const skill = Skill.create(createValidSkillData()).value;
			const newLevel = ProficiencyLevel.create('expert').value;
			const updated = skill.updateProficiency(newLevel, 5);

			expect(updated.id).toBe(skill.id);
			expect(updated.employeeId).toBe(skill.employeeId);
			expect(updated.name.value).toBe(skill.name.value);
			expect(updated.category.value).toBe(skill.category.value);
		});

		it('should update the updatedAt timestamp', () => {
			const skill = Skill.create(createValidSkillData()).value;
			const before = new Date();
			const newLevel = ProficiencyLevel.create('beginner').value;
			const updated = skill.updateProficiency(newLevel, 1);
			const after = new Date();

			expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});
});

describe('SkillName', () => {
	it('should create valid skill name', () => {
		const result = SkillName.create('TypeScript');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('TypeScript');
	});

	it('should trim whitespace', () => {
		const result = SkillName.create('  Python  ');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('Python');
	});

	it('should reject empty string', () => {
		const result = SkillName.create('');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('empty');
	});

	it('should reject whitespace-only string', () => {
		const result = SkillName.create('   ');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('empty');
	});

	it('should accept exactly 100 characters', () => {
		const name = 'a'.repeat(100);
		const result = SkillName.create(name);
		expect(result.isOk).toBe(true);
	});

	it('should reject name longer than 100 characters', () => {
		const name = 'a'.repeat(101);
		const result = SkillName.create(name);
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('100');
	});

	it('should support equals comparison', () => {
		const a = SkillName.create('React').value;
		const b = SkillName.create('React').value;
		const c = SkillName.create('Vue').value;

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});

	it('should have correct toString', () => {
		const name = SkillName.create('Node.js').value;
		expect(name.toString()).toBe('Node.js');
	});
});

describe('ProficiencyLevel', () => {
	it('should create beginner level', () => {
		const result = ProficiencyLevel.create('beginner');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('beginner');
		expect(result.value.rank).toBe(1);
	});

	it('should create intermediate level', () => {
		const result = ProficiencyLevel.create('intermediate');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('intermediate');
		expect(result.value.rank).toBe(2);
	});

	it('should create advanced level', () => {
		const result = ProficiencyLevel.create('advanced');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('advanced');
		expect(result.value.rank).toBe(3);
	});

	it('should create expert level', () => {
		const result = ProficiencyLevel.create('expert');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('expert');
		expect(result.value.rank).toBe(4);
	});

	it('should reject invalid proficiency level', () => {
		const result = ProficiencyLevel.create('novice');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('novice');
	});

	it('should reject empty string', () => {
		const result = ProficiencyLevel.create('');
		expect(result.isError).toBe(true);
	});

	it('isExpert should return true only for expert', () => {
		expect(ProficiencyLevel.create('expert').value.isExpert()).toBe(true);
		expect(ProficiencyLevel.create('advanced').value.isExpert()).toBe(false);
		expect(ProficiencyLevel.create('intermediate').value.isExpert()).toBe(false);
		expect(ProficiencyLevel.create('beginner').value.isExpert()).toBe(false);
	});

	it('isHigherThan should compare ranks correctly', () => {
		const expert = ProficiencyLevel.create('expert').value;
		const advanced = ProficiencyLevel.create('advanced').value;
		const beginner = ProficiencyLevel.create('beginner').value;

		expect(expert.isHigherThan(advanced)).toBe(true);
		expect(advanced.isHigherThan(expert)).toBe(false);
		expect(beginner.isHigherThan(beginner)).toBe(false);
	});

	it('should support equals comparison', () => {
		const a = ProficiencyLevel.create('advanced').value;
		const b = ProficiencyLevel.create('advanced').value;
		const c = ProficiencyLevel.create('expert').value;

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});

	it('should have correct toString', () => {
		const level = ProficiencyLevel.create('intermediate').value;
		expect(level.toString()).toBe('intermediate');
	});
});

describe('SkillCategory', () => {
	it('should create technical category', () => {
		const result = SkillCategory.create('technical');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('technical');
		expect(result.value.isTechnical()).toBe(true);
		expect(result.value.isSoft()).toBe(false);
	});

	it('should create soft category', () => {
		const result = SkillCategory.create('soft');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('soft');
		expect(result.value.isSoft()).toBe(true);
		expect(result.value.isTechnical()).toBe(false);
	});

	it('should create language category', () => {
		const result = SkillCategory.create('language');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('language');
	});

	it('should create management category', () => {
		const result = SkillCategory.create('management');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('management');
	});

	it('should create domain category', () => {
		const result = SkillCategory.create('domain');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('domain');
	});

	it('should create other category', () => {
		const result = SkillCategory.create('other');
		expect(result.isOk).toBe(true);
		expect(result.value.value).toBe('other');
	});

	it('should reject invalid category', () => {
		const result = SkillCategory.create('unknown');
		expect(result.isError).toBe(true);
		expect(result.error.message).toContain('unknown');
	});

	it('should support equals comparison', () => {
		const a = SkillCategory.create('technical').value;
		const b = SkillCategory.create('technical').value;
		const c = SkillCategory.create('soft').value;

		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});

	it('should have correct toString', () => {
		const cat = SkillCategory.create('management').value;
		expect(cat.toString()).toBe('management');
	});
});
