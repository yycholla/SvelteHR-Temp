// src/domain/Training/Training.test.ts
import { describe, it, expect } from 'vitest';
import { Training } from './Training';
import { TrainingTitle } from './value-objects/TrainingTitle';
import { InvalidTrainingError } from './errors/TrainingErrors';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_AUTHOR_UUID = '123e4567-e89b-12d3-a456-426614174001';

function makeTitle(value = 'Introduction to TypeScript'): TrainingTitle {
	return TrainingTitle.create(value).value;
}

function makeValidTraining(overrides: Partial<{
	id: string;
	title: TrainingTitle;
	description: string | null;
	startDate: Date | null;
	endDate: Date | null;
	tags: string[];
	authorId: string;
}> = {}) {
	return Training.create({
		id: overrides.id ?? VALID_UUID,
		title: overrides.title ?? makeTitle(),
		description: overrides.description ?? null,
		startDate: overrides.startDate !== undefined ? overrides.startDate : null,
		endDate: overrides.endDate !== undefined ? overrides.endDate : null,
		tags: overrides.tags ?? [],
		authorId: overrides.authorId ?? VALID_AUTHOR_UUID
	});
}

describe('Training', () => {
	describe('create()', () => {
		it('should create a valid training with minimum fields', () => {
			const result = makeValidTraining();

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
			expect(result.value.title.value).toBe('Introduction to TypeScript');
			expect(result.value.description).toBeNull();
			expect(result.value.startDate).toBeNull();
			expect(result.value.endDate).toBeNull();
			expect(result.value.tags).toEqual([]);
			expect(result.value.authorId).toBe(VALID_AUTHOR_UUID);
		});

		it('should create a training with description and dates', () => {
			const start = new Date('2026-01-01T09:00:00Z');
			const end = new Date('2026-03-01T09:00:00Z');
			const result = makeValidTraining({
				description: 'A great training program',
				startDate: start,
				endDate: end,
				tags: ['typescript', 'advanced']
			});

			expect(result.isOk).toBe(true);
			expect(result.value.description).toBe('A great training program');
			expect(result.value.startDate).toEqual(start);
			expect(result.value.endDate).toEqual(end);
			expect(result.value.tags).toEqual(['typescript', 'advanced']);
		});

		it('should return error for invalid training ID', () => {
			const result = Training.create({
				id: 'not-a-uuid',
				title: makeTitle(),
				description: null,
				startDate: null,
				endDate: null,
				tags: [],
				authorId: VALID_AUTHOR_UUID
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('Invalid training ID format');
		});

		it('should return error for empty training ID', () => {
			const result = Training.create({
				id: '',
				title: makeTitle(),
				description: null,
				startDate: null,
				endDate: null,
				tags: [],
				authorId: VALID_AUTHOR_UUID
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error for invalid author ID', () => {
			const result = Training.create({
				id: VALID_UUID,
				title: makeTitle(),
				description: null,
				startDate: null,
				endDate: null,
				tags: [],
				authorId: 'not-a-uuid'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('Invalid author ID format');
		});

		it('should return error for empty author ID', () => {
			const result = Training.create({
				id: VALID_UUID,
				title: makeTitle(),
				description: null,
				startDate: null,
				endDate: null,
				tags: [],
				authorId: ''
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('date defensive copies', () => {
		it('should store defensive copies of startDate', () => {
			const start = new Date('2026-01-01T09:00:00Z');
			const result = makeValidTraining({ startDate: start });
			expect(result.isOk).toBe(true);

			// Mutating the original should not affect the stored value
			const originalTime = start.getTime();
			start.setFullYear(2000);
			expect(result.value.startDate?.getTime()).toBe(originalTime);
		});

		it('should store defensive copies of endDate', () => {
			const end = new Date('2026-03-01T09:00:00Z');
			const result = makeValidTraining({ endDate: end });
			expect(result.isOk).toBe(true);

			const originalTime = end.getTime();
			end.setFullYear(2000);
			expect(result.value.endDate?.getTime()).toBe(originalTime);
		});

		it('should return defensive copies from getters', () => {
			const start = new Date('2026-01-01T09:00:00Z');
			const result = makeValidTraining({ startDate: start });
			expect(result.isOk).toBe(true);

			const got1 = result.value.startDate;
			const got2 = result.value.startDate;
			// Should be equal in value but not reference
			expect(got1?.getTime()).toBe(got2?.getTime());
			expect(got1).not.toBe(got2);
		});
	});

	describe('isActive()', () => {
		it('should be active when both dates are null', () => {
			const result = makeValidTraining({ startDate: null, endDate: null });
			expect(result.value.isActive()).toBe(true);
		});

		it('should be active when startDate is past and endDate is null', () => {
			const past = new Date('2020-01-01T00:00:00Z');
			const result = makeValidTraining({ startDate: past, endDate: null });
			expect(result.value.isActive()).toBe(true);
		});

		it('should be active when startDate is null and endDate is future', () => {
			const future = new Date('2099-01-01T00:00:00Z');
			const result = makeValidTraining({ startDate: null, endDate: future });
			expect(result.value.isActive()).toBe(true);
		});

		it('should be active when current date is within range', () => {
			const past = new Date('2020-01-01T00:00:00Z');
			const future = new Date('2099-01-01T00:00:00Z');
			const result = makeValidTraining({ startDate: past, endDate: future });
			expect(result.value.isActive()).toBe(true);
		});

		it('should be inactive when startDate is in the future', () => {
			const future = new Date('2099-01-01T00:00:00Z');
			const result = makeValidTraining({ startDate: future, endDate: null });
			expect(result.value.isActive()).toBe(false);
		});

		it('should be inactive when endDate is in the past', () => {
			const past = new Date('2020-01-01T00:00:00Z');
			const result = makeValidTraining({ startDate: null, endDate: past });
			expect(result.value.isActive()).toBe(false);
		});
	});

	describe('addTag()', () => {
		it('should add a new tag and return new instance', () => {
			const training = makeValidTraining({ tags: ['existing'] }).value;
			const updated = training.addTag('new-tag');

			expect(updated.tags).toContain('new-tag');
			expect(updated.tags).toContain('existing');
			// Original should be unchanged
			expect(training.tags).not.toContain('new-tag');
		});

		it('should not duplicate an existing tag', () => {
			const training = makeValidTraining({ tags: ['existing'] }).value;
			const updated = training.addTag('existing');

			expect(updated.tags.length).toBe(1);
			expect(updated.tags).toEqual(['existing']);
		});

		it('should trim whitespace from tag before adding', () => {
			const training = makeValidTraining({ tags: [] }).value;
			const updated = training.addTag('  trimmed  ');

			expect(updated.tags).toContain('trimmed');
		});

		it('should not duplicate a tag that matches after trimming', () => {
			const training = makeValidTraining({ tags: ['existing'] }).value;
			const updated = training.addTag('  existing  ');

			expect(updated.tags.length).toBe(1);
		});
	});

	describe('removeTag()', () => {
		it('should remove an existing tag and return new instance', () => {
			const training = makeValidTraining({ tags: ['keep', 'remove'] }).value;
			const updated = training.removeTag('remove');

			expect(updated.tags).toContain('keep');
			expect(updated.tags).not.toContain('remove');
			// Original should be unchanged
			expect(training.tags).toContain('remove');
		});

		it('should return unchanged tags if tag does not exist', () => {
			const training = makeValidTraining({ tags: ['keep'] }).value;
			const updated = training.removeTag('nonexistent');

			expect(updated.tags).toEqual(['keep']);
		});

		it('should trim whitespace when removing', () => {
			const training = makeValidTraining({ tags: ['existing'] }).value;
			const updated = training.removeTag('  existing  ');

			expect(updated.tags).not.toContain('existing');
		});
	});
});
