// src/services/TrainingService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrainingService } from './TrainingService';
import type { TrainingRepository } from './ports/TrainingRepository';
import { Training } from '$domain/Training/Training';
import { TrainingContent } from '$domain/Training/TrainingContent';
import { TrainingProgress } from '$domain/Training/TrainingProgress';
import { TrainingTitle } from '$domain/Training/value-objects/TrainingTitle';
import { ContentType } from '$domain/Training/value-objects/ContentType';
import { ProgressStatus } from '$domain/Training/value-objects/ProgressStatus';
import {
	InvalidTrainingError,
	InvalidAssignmentError,
	TrainingNotFoundError
} from '$domain/Training/errors/TrainingErrors';
import { Result } from '$domain/Result';

// --- Test helpers ---

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const VALID_UUID_2 = '550e8400-e29b-41d4-a716-446655440001';
const VALID_UUID_3 = '550e8400-e29b-41d4-a716-446655440002';
const VALID_UUID_4 = '550e8400-e29b-41d4-a716-446655440003';

function createTestTraining(): Training {
	return Training.create({
		id: VALID_UUID,
		title: TrainingTitle.create('TypeScript Fundamentals').value,
		description: 'Learn the basics of TypeScript',
		startDate: null,
		endDate: null,
		tags: ['typescript', 'fundamentals'],
		authorId: VALID_UUID_2
	}).value;
}

function createTestContent(): TrainingContent {
	return TrainingContent.create({
		id: VALID_UUID_3,
		trainingId: VALID_UUID,
		title: 'Introduction Video',
		type: 'video',
		data: 'https://example.com/intro.mp4',
		sequenceOrder: 1
	}).value;
}

function createTestProgress(): TrainingProgress {
	return TrainingProgress.create({
		id: VALID_UUID_4,
		userId: VALID_UUID_2,
		trainingContentId: VALID_UUID_3,
		status: ProgressStatus.create('in_progress').value,
		completedAt: null
	}).value;
}

const testAssignment = {
	id: VALID_UUID_4,
	userId: VALID_UUID_2,
	trainingId: VALID_UUID
};

// --- Tests ---

describe('TrainingService', () => {
	let mockRepository: TrainingRepository;
	let service: TrainingService;
	let testTraining: Training;
	let testContent: TrainingContent;
	let testProgress: TrainingProgress;

	beforeEach(() => {
		testTraining = createTestTraining();
		testContent = createTestContent();
		testProgress = createTestProgress();

		mockRepository = {
			findById: vi.fn(),
			findAll: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			findContentByTrainingId: vi.fn(),
			createContent: vi.fn(),
			updateContent: vi.fn(),
			deleteContent: vi.fn(),
			findProgressByUserAndTraining: vi.fn(),
			updateProgress: vi.fn(),
			findAssignmentsByTrainingId: vi.fn(),
			createAssignment: vi.fn(),
			deleteAssignment: vi.fn()
		};

		service = new TrainingService(mockRepository);
	});

	// -------------------------------------------------------------------------
	// Training CRUD
	// -------------------------------------------------------------------------

	describe('getById', () => {
		it('should return training when found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(Result.ok(testTraining));

			const result = await service.getById(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_UUID);
			expect(mockRepository.findById).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should return error when training not found', async () => {
			vi.mocked(mockRepository.findById).mockResolvedValue(
				Result.error(new TrainingNotFoundError(VALID_UUID))
			);

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TrainingNotFoundError);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.findById).mockRejectedValue(new Error('DB connection lost'));

			const result = await service.getById(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
			expect(result.error.message).toContain('DB connection lost');
		});
	});

	describe('getAll', () => {
		it('should return all trainings', async () => {
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([testTraining]));

			const result = await service.getAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should pass filter to repository', async () => {
			vi.mocked(mockRepository.findAll).mockResolvedValue(Result.ok([]));
			const filter = { isActive: true, authorId: VALID_UUID_2 };

			await service.getAll(filter);

			expect(mockRepository.findAll).toHaveBeenCalledWith(filter);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.findAll).mockRejectedValue(new Error('Timeout'));

			const result = await service.getAll();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('create', () => {
		it('should create training and return it', async () => {
			vi.mocked(mockRepository.create).mockResolvedValue(Result.ok(testTraining));
			const data = {
				title: 'TypeScript Fundamentals',
				description: 'Learn TypeScript',
				authorId: VALID_UUID_2
			};

			const result = await service.create(data);

			expect(result.isOk).toBe(true);
			expect(result.value).toBe(testTraining);
			expect(mockRepository.create).toHaveBeenCalledWith(data);
		});

		it('should handle creation errors', async () => {
			vi.mocked(mockRepository.create).mockResolvedValue(
				Result.error(new InvalidTrainingError('Title too long'))
			);

			const result = await service.create({ title: 'A'.repeat(201), authorId: VALID_UUID_2 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.create).mockRejectedValue(new Error('DB write failed'));

			const result = await service.create({ title: 'Test', authorId: VALID_UUID_2 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('update', () => {
		it('should update and return the updated training', async () => {
			vi.mocked(mockRepository.update).mockResolvedValue(Result.ok(testTraining));

			const result = await service.update(VALID_UUID, { title: 'New Title' });

			expect(result.isOk).toBe(true);
			expect(mockRepository.update).toHaveBeenCalledWith(VALID_UUID, { title: 'New Title' });
		});

		it('should handle not found errors', async () => {
			vi.mocked(mockRepository.update).mockResolvedValue(
				Result.error(new TrainingNotFoundError(VALID_UUID))
			);

			const result = await service.update(VALID_UUID, {});

			expect(result.isError).toBe(true);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.update).mockRejectedValue(new Error('Network error'));

			const result = await service.update(VALID_UUID, {});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('delete', () => {
		it('should delete training successfully', async () => {
			vi.mocked(mockRepository.delete).mockResolvedValue(Result.ok(undefined));

			const result = await service.delete(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(mockRepository.delete).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.delete).mockRejectedValue(new Error('DB error'));

			const result = await service.delete(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// Content management
	// -------------------------------------------------------------------------

	describe('getContentByTrainingId', () => {
		it('should return content for a training', async () => {
			vi.mocked(mockRepository.findContentByTrainingId).mockResolvedValue(
				Result.ok([testContent])
			);

			const result = await service.getContentByTrainingId(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(mockRepository.findContentByTrainingId).toHaveBeenCalledWith(VALID_UUID);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.findContentByTrainingId).mockRejectedValue(new Error('Error'));

			const result = await service.getContentByTrainingId(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('createContent', () => {
		it('should create content successfully', async () => {
			vi.mocked(mockRepository.createContent).mockResolvedValue(Result.ok(testContent));
			const data = {
				trainingId: VALID_UUID,
				title: 'Introduction Video',
				type: 'video',
				data: 'https://example.com/video.mp4',
				sequenceOrder: 1
			};

			const result = await service.createContent(data);

			expect(result.isOk).toBe(true);
			expect(mockRepository.createContent).toHaveBeenCalledWith(data);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.createContent).mockRejectedValue(new Error('DB error'));

			const result = await service.createContent({
				trainingId: VALID_UUID,
				title: 'Lesson',
				type: 'text',
				data: 'Content here',
				sequenceOrder: 1
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('updateContent', () => {
		it('should update content successfully', async () => {
			vi.mocked(mockRepository.updateContent).mockResolvedValue(Result.ok(testContent));

			const result = await service.updateContent(VALID_UUID_3, { title: 'Updated Title' });

			expect(result.isOk).toBe(true);
			expect(mockRepository.updateContent).toHaveBeenCalledWith(VALID_UUID_3, {
				title: 'Updated Title'
			});
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.updateContent).mockRejectedValue(new Error('Error'));

			const result = await service.updateContent(VALID_UUID_3, {});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	describe('deleteContent', () => {
		it('should delete content successfully', async () => {
			vi.mocked(mockRepository.deleteContent).mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteContent(VALID_UUID_3);

			expect(result.isOk).toBe(true);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.deleteContent).mockRejectedValue(new Error('Error'));

			const result = await service.deleteContent(VALID_UUID_3);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// Progress tracking
	// -------------------------------------------------------------------------

	describe('getProgressByUserAndTraining', () => {
		it('should return progress for a user and training', async () => {
			vi.mocked(mockRepository.findProgressByUserAndTraining).mockResolvedValue(
				Result.ok([testProgress])
			);

			const result = await service.getProgressByUserAndTraining(VALID_UUID_2, VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(mockRepository.findProgressByUserAndTraining).toHaveBeenCalledWith(
				VALID_UUID_2,
				VALID_UUID
			);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.findProgressByUserAndTraining).mockRejectedValue(
				new Error('Error')
			);

			const result = await service.getProgressByUserAndTraining(VALID_UUID_2, VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	describe('updateProgress', () => {
		it('should update progress successfully', async () => {
			vi.mocked(mockRepository.updateProgress).mockResolvedValue(Result.ok(testProgress));

			const result = await service.updateProgress(VALID_UUID_3, { status: 'completed' });

			expect(result.isOk).toBe(true);
			expect(mockRepository.updateProgress).toHaveBeenCalledWith(VALID_UUID_3, {
				status: 'completed'
			});
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.updateProgress).mockRejectedValue(new Error('Error'));

			const result = await service.updateProgress(VALID_UUID_3, { status: 'completed' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	// -------------------------------------------------------------------------
	// Assignments
	// -------------------------------------------------------------------------

	describe('getAssignmentsByTrainingId', () => {
		it('should return assignments for a training', async () => {
			vi.mocked(mockRepository.findAssignmentsByTrainingId).mockResolvedValue(
				Result.ok([testAssignment])
			);

			const result = await service.getAssignmentsByTrainingId(VALID_UUID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].trainingId).toBe(VALID_UUID);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.findAssignmentsByTrainingId).mockRejectedValue(new Error('Error'));

			const result = await service.getAssignmentsByTrainingId(VALID_UUID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	describe('createAssignment', () => {
		it('should create assignment successfully', async () => {
			vi.mocked(mockRepository.createAssignment).mockResolvedValue(Result.ok(testAssignment));
			const data = { trainingId: VALID_UUID, userId: VALID_UUID_2 };

			const result = await service.createAssignment(data);

			expect(result.isOk).toBe(true);
			expect(result.value.trainingId).toBe(VALID_UUID);
			expect(mockRepository.createAssignment).toHaveBeenCalledWith(data);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.createAssignment).mockRejectedValue(new Error('Error'));

			const result = await service.createAssignment({
				trainingId: VALID_UUID,
				userId: VALID_UUID_2
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	describe('deleteAssignment', () => {
		it('should delete assignment successfully', async () => {
			vi.mocked(mockRepository.deleteAssignment).mockResolvedValue(Result.ok(undefined));

			const result = await service.deleteAssignment(VALID_UUID_4);

			expect(result.isOk).toBe(true);
			expect(mockRepository.deleteAssignment).toHaveBeenCalledWith(VALID_UUID_4);
		});

		it('should handle unexpected exceptions from repository', async () => {
			vi.mocked(mockRepository.deleteAssignment).mockRejectedValue(new Error('Error'));

			const result = await service.deleteAssignment(VALID_UUID_4);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});
});
