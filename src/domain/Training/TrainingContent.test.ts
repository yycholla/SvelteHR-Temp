// src/domain/Training/TrainingContent.test.ts
import { describe, it, expect } from 'vitest';
import { TrainingContent } from './TrainingContent';
import { InvalidTrainingError } from './errors/TrainingErrors';

const VALID_ID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_TRAINING_ID = '123e4567-e89b-12d3-a456-426614174001';

function makeValidContent(overrides: Partial<{
	id: string;
	trainingId: string;
	title: string;
	type: string;
	data: string;
	sequenceOrder: number;
}> = {}) {
	return TrainingContent.create({
		id: overrides.id ?? VALID_ID,
		trainingId: overrides.trainingId ?? VALID_TRAINING_ID,
		title: overrides.title ?? 'Introduction Lesson',
		type: overrides.type ?? 'video',
		data: overrides.data ?? 'https://example.com/video.mp4',
		sequenceOrder: overrides.sequenceOrder ?? 1
	});
}

describe('TrainingContent', () => {
	describe('create()', () => {
		it('should create valid content with all fields', () => {
			const result = makeValidContent();

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_ID);
			expect(result.value.trainingId).toBe(VALID_TRAINING_ID);
			expect(result.value.title.value).toBe('Introduction Lesson');
			expect(result.value.type.value).toBe('video');
			expect(result.value.data).toBe('https://example.com/video.mp4');
			expect(result.value.sequenceOrder).toBe(1);
		});

		it('should create content with different content types', () => {
			const types = ['text', 'video', 'quiz', 'document', 'interactive'] as const;
			for (const type of types) {
				const result = makeValidContent({ type });
				expect(result.isOk).toBe(true);
				expect(result.value.type.value).toBe(type);
			}
		});

		it('should return error for invalid content ID', () => {
			const result = makeValidContent({ id: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('Invalid content ID format');
		});

		it('should return error for empty content ID', () => {
			const result = makeValidContent({ id: '' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error for invalid training ID', () => {
			const result = makeValidContent({ trainingId: 'not-a-uuid' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('Invalid training ID format');
		});

		it('should return error for empty title', () => {
			const result = makeValidContent({ title: '' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error for title exceeding 200 chars', () => {
			const result = makeValidContent({ title: 'A'.repeat(201) });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error for invalid content type', () => {
			const result = makeValidContent({ type: 'unknown-type' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error for sequenceOrder of 0', () => {
			const result = makeValidContent({ sequenceOrder: 0 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('sequence order');
		});

		it('should return error for negative sequenceOrder', () => {
			const result = makeValidContent({ sequenceOrder: -1 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error for non-integer sequenceOrder', () => {
			const result = makeValidContent({ sequenceOrder: 1.5 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should allow higher sequence orders', () => {
			const result = makeValidContent({ sequenceOrder: 100 });

			expect(result.isOk).toBe(true);
			expect(result.value.sequenceOrder).toBe(100);
		});

		it('should allow text data for text content type', () => {
			const result = makeValidContent({ type: 'text', data: 'This is the lesson content.' });

			expect(result.isOk).toBe(true);
			expect(result.value.data).toBe('This is the lesson content.');
		});
	});
});
