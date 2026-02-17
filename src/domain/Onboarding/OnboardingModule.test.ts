// src/domain/Onboarding/OnboardingModule.test.ts
import { describe, expect, it } from 'vitest';
import { OnboardingModule } from './OnboardingModule';
import { ModuleTitle } from './value-objects/ModuleTitle';
import { ModuleCategory } from './value-objects/ModuleCategory';
import { InvalidOnboardingModuleError } from './errors/OnboardingErrors';

describe('OnboardingModule', () => {
	const validData = () => ({
		id: '12345678-1234-1234-1234-123456789012',
		title: ModuleTitle.create('Company Overview').value,
		description: 'An introduction to the company',
		isActive: true,
		category: ModuleCategory.create('orientation').value,
		tags: ['beginner', 'required'],
		authorId: '87654321-4321-4321-4321-210987654321'
	});

	describe('create', () => {
		it('creates module with valid data', () => {
			const result = OnboardingModule.create(validData());

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('12345678-1234-1234-1234-123456789012');
			expect(result.value.title.value).toBe('Company Overview');
			expect(result.value.description).toBe('An introduction to the company');
			expect(result.value.isActive).toBe(true);
			expect(result.value.category.value).toBe('orientation');
			expect(result.value.tags).toEqual(['beginner', 'required']);
			expect(result.value.authorId).toBe('87654321-4321-4321-4321-210987654321');
		});

		it('rejects invalid id UUID', () => {
			const data = { ...validData(), id: 'not-a-uuid' };
			const result = OnboardingModule.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			expect(result.error.message).toContain('Invalid onboarding module ID format');
		});

		it('rejects empty id', () => {
			const data = { ...validData(), id: '' };
			const result = OnboardingModule.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
		});

		it('rejects invalid authorId UUID', () => {
			const data = { ...validData(), authorId: 'not-a-uuid' };
			const result = OnboardingModule.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
			expect(result.error.message).toContain('Invalid author ID format');
		});

		it('rejects empty authorId', () => {
			const data = { ...validData(), authorId: '' };
			const result = OnboardingModule.create(data);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidOnboardingModuleError);
		});

		it('allows description to be null', () => {
			const data = { ...validData(), description: null };
			const result = OnboardingModule.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBeNull();
		});

		it('creates module with empty tags array', () => {
			const data = { ...validData(), tags: [] };
			const result = OnboardingModule.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value.tags).toEqual([]);
		});
	});

	describe('activate', () => {
		it('returns new instance with isActive=true', () => {
			const module = OnboardingModule.create({ ...validData(), isActive: false }).value;
			const activated = module.activate();

			expect(activated.isActive).toBe(true);
			expect(module.isActive).toBe(false); // original unchanged
			expect(activated).not.toBe(module); // new instance
		});

		it('activate on already active module returns new instance still active', () => {
			const module = OnboardingModule.create({ ...validData(), isActive: true }).value;
			const activated = module.activate();

			expect(activated.isActive).toBe(true);
			expect(activated).not.toBe(module);
		});
	});

	describe('deactivate', () => {
		it('returns new instance with isActive=false', () => {
			const module = OnboardingModule.create({ ...validData(), isActive: true }).value;
			const deactivated = module.deactivate();

			expect(deactivated.isActive).toBe(false);
			expect(module.isActive).toBe(true); // original unchanged
			expect(deactivated).not.toBe(module); // new instance
		});

		it('deactivate on already inactive module returns new instance still inactive', () => {
			const module = OnboardingModule.create({ ...validData(), isActive: false }).value;
			const deactivated = module.deactivate();

			expect(deactivated.isActive).toBe(false);
			expect(deactivated).not.toBe(module);
		});
	});

	describe('addTag', () => {
		it('appends a new tag and returns new instance', () => {
			const module = OnboardingModule.create({ ...validData(), tags: ['beginner'] }).value;
			const updated = module.addTag('required');

			expect(updated.tags).toEqual(['beginner', 'required']);
			expect(module.tags).toEqual(['beginner']); // original unchanged
			expect(updated).not.toBe(module);
		});

		it('does not add duplicate tag', () => {
			const module = OnboardingModule.create({ ...validData(), tags: ['beginner'] }).value;
			const updated = module.addTag('beginner');

			expect(updated.tags).toEqual(['beginner']);
		});

		it('trims whitespace from tag before adding', () => {
			const module = OnboardingModule.create({ ...validData(), tags: [] }).value;
			const updated = module.addTag('  trimmed  ');

			expect(updated.tags).toEqual(['trimmed']);
		});
	});

	describe('removeTag', () => {
		it('removes existing tag and returns new instance', () => {
			const module = OnboardingModule.create({
				...validData(),
				tags: ['beginner', 'required']
			}).value;
			const updated = module.removeTag('beginner');

			expect(updated.tags).toEqual(['required']);
			expect(module.tags).toEqual(['beginner', 'required']); // original unchanged
			expect(updated).not.toBe(module);
		});

		it('is a no-op for non-existing tag', () => {
			const module = OnboardingModule.create({ ...validData(), tags: ['beginner'] }).value;
			const updated = module.removeTag('nonexistent');

			expect(updated.tags).toEqual(['beginner']);
		});
	});

	describe('tags defensive copy', () => {
		it('tags getter returns a copy, mutation does not affect object', () => {
			const module = OnboardingModule.create({ ...validData(), tags: ['beginner'] }).value;
			const tags1 = module.tags as string[];
			tags1.push('mutated');

			expect(module.tags).toEqual(['beginner']);
		});
	});
});
