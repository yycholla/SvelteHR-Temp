// src/adapters/graphql/GraphQLTrainingAdapter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { GraphQLTrainingAdapter } from './GraphQLTrainingAdapter';
import {
	TrainingNotFoundError,
	InvalidTrainingError,
	ContentNotFoundError,
	AssignmentNotFoundError,
	InvalidAssignmentError
} from '$domain/Training/errors/TrainingErrors';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// --- Mock GraphQLPort ---

class MockGraphQLPort implements GraphQLPort {
	private mockData: Record<string, unknown> = {};
	private shouldThrow = false;

	setMockData(data: Record<string, unknown>) {
		this.mockData = data;
		this.shouldThrow = false;
	}

	setShouldThrow(shouldThrow: boolean) {
		this.shouldThrow = shouldThrow;
	}

	async query<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL query failed');
		}
		return this.mockData as T;
	}

	async mutation<T>(_operation: string, _variables?: unknown): Promise<T> {
		if (this.shouldThrow) {
			throw new Error('GraphQL mutation failed');
		}
		return this.mockData as T;
	}
}

// --- Helper data factories ---

const VALID_TRAINING_ID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_AUTHOR_ID = '123e4567-e89b-12d3-a456-426614174001';
const VALID_CONTENT_ID = '123e4567-e89b-12d3-a456-426614174002';
const VALID_USER_ID = '123e4567-e89b-12d3-a456-426614174003';
const VALID_PROGRESS_ID = '123e4567-e89b-12d3-a456-426614174004';
const VALID_ASSIGNMENT_ID = '123e4567-e89b-12d3-a456-426614174005';

function createGraphQLTraining(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_TRAINING_ID,
		title: 'TypeScript Fundamentals',
		description: 'Learn TypeScript',
		startDate: null,
		endDate: null,
		tags: ['typescript'],
		authorId: VALID_AUTHOR_ID,
		...overrides
	};
}

function createGraphQLContent(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_CONTENT_ID,
		title: 'Introduction Video',
		type: 'video',
		data: 'https://example.com/intro.mp4',
		sequenceOrder: 1,
		...overrides
	};
}

function createGraphQLProgress(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_PROGRESS_ID,
		userId: VALID_USER_ID,
		trainingContentId: VALID_CONTENT_ID,
		status: 'in_progress',
		completedAt: null,
		...overrides
	};
}

function createGraphQLAssignment(overrides: Record<string, unknown> = {}) {
	return {
		id: VALID_ASSIGNMENT_ID,
		userId: VALID_USER_ID,
		trainingId: VALID_TRAINING_ID,
		...overrides
	};
}

// --- Tests ---

describe('GraphQLTrainingAdapter', () => {
	let adapter: GraphQLTrainingAdapter;
	let mockGraphQL: MockGraphQLPort;

	beforeEach(() => {
		mockGraphQL = new MockGraphQLPort();
		adapter = new GraphQLTrainingAdapter(mockGraphQL);
	});

	// -------------------------------------------------------------------------
	// findById
	// -------------------------------------------------------------------------

	describe('findById', () => {
		it('should return training when found', async () => {
			mockGraphQL.setMockData({ training: createGraphQLTraining() });

			const result = await adapter.findById(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_TRAINING_ID);
			expect(result.value.title.value).toBe('TypeScript Fundamentals');
			expect(result.value.description).toBe('Learn TypeScript');
			expect(result.value.tags).toEqual(['typescript']);
		});

		it('should return training with dates', async () => {
			mockGraphQL.setMockData({
				training: createGraphQLTraining({
					startDate: '2026-01-01T00:00:00Z',
					endDate: '2026-12-31T00:00:00Z'
				})
			});

			const result = await adapter.findById(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value.startDate).toBeInstanceOf(Date);
			expect(result.value.endDate).toBeInstanceOf(Date);
		});

		it('should return error when training is null', async () => {
			mockGraphQL.setMockData({ training: null });

			const result = await adapter.findById(VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TrainingNotFoundError);
		});

		it('should return error when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findById(VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TrainingNotFoundError);
		});

		it('should return error for invalid training data (bad UUID)', async () => {
			mockGraphQL.setMockData({
				training: createGraphQLTraining({ id: 'not-a-uuid' })
			});

			const result = await adapter.findById('not-a-uuid');

			expect(result.isError).toBe(true);
		});

		it('should return error for empty title', async () => {
			mockGraphQL.setMockData({
				training: createGraphQLTraining({ title: '' })
			});

			const result = await adapter.findById(VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// findAll
	// -------------------------------------------------------------------------

	describe('findAll', () => {
		it('should return all trainings', async () => {
			mockGraphQL.setMockData({ myTrainings: [createGraphQLTraining()] });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe(VALID_TRAINING_ID);
		});

		it('should return empty array when no trainings', async () => {
			mockGraphQL.setMockData({ myTrainings: [] });

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should skip invalid trainings (resilient)', async () => {
			mockGraphQL.setMockData({
				myTrainings: [
					createGraphQLTraining(),
					createGraphQLTraining({ id: 'not-a-uuid' }) // invalid
				]
			});

			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// create
	// -------------------------------------------------------------------------

	describe('create', () => {
		it('should create and return training', async () => {
			mockGraphQL.setMockData({
				training: { createTraining: createGraphQLTraining() }
			});

			const result = await adapter.create({
				title: 'TypeScript Fundamentals',
				authorId: VALID_AUTHOR_ID
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_TRAINING_ID);
		});

		it('should return error when create response is null', async () => {
			mockGraphQL.setMockData({ training: { createTraining: null } });

			const result = await adapter.create({ title: 'Test', authorId: VALID_AUTHOR_ID });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.create({ title: 'Test', authorId: VALID_AUTHOR_ID });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// update
	// -------------------------------------------------------------------------

	describe('update', () => {
		it('should update and return training', async () => {
			mockGraphQL.setMockData({
				training: {
					updateTraining: createGraphQLTraining({ title: 'Updated Title' })
				}
			});

			const result = await adapter.update(VALID_TRAINING_ID, { title: 'Updated Title' });

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated Title');
		});

		it('should return error when update response is null', async () => {
			mockGraphQL.setMockData({ training: { updateTraining: null } });

			const result = await adapter.update(VALID_TRAINING_ID, {});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TrainingNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.update(VALID_TRAINING_ID, {});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// delete
	// -------------------------------------------------------------------------

	describe('delete', () => {
		it('should delete training successfully', async () => {
			mockGraphQL.setMockData({ training: { deleteTraining: true } });

			const result = await adapter.delete(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
		});

		it('should return error when delete response is false', async () => {
			mockGraphQL.setMockData({ training: { deleteTraining: false } });

			const result = await adapter.delete(VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TrainingNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.delete(VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(TrainingNotFoundError);
		});
	});

	// -------------------------------------------------------------------------
	// findContentByTrainingId
	// -------------------------------------------------------------------------

	describe('findContentByTrainingId', () => {
		it('should return content for a training', async () => {
			mockGraphQL.setMockData({ trainingContents: [createGraphQLContent()] });

			const result = await adapter.findContentByTrainingId(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].id).toBe(VALID_CONTENT_ID);
			expect(result.value[0].trainingId).toBe(VALID_TRAINING_ID);
		});

		it('should return empty array when no content', async () => {
			mockGraphQL.setMockData({ trainingContents: [] });

			const result = await adapter.findContentByTrainingId(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should skip invalid content (resilient)', async () => {
			mockGraphQL.setMockData({
				trainingContents: [
					createGraphQLContent(),
					createGraphQLContent({ type: 'invalid-type' }) // invalid
				]
			});

			const result = await adapter.findContentByTrainingId(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findContentByTrainingId(VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// createContent
	// -------------------------------------------------------------------------

	describe('createContent', () => {
		it('should create content successfully', async () => {
			mockGraphQL.setMockData({
				training: { createTrainingContent: createGraphQLContent() }
			});

			const result = await adapter.createContent({
				trainingId: VALID_TRAINING_ID,
				title: 'Introduction Video',
				type: 'video',
				data: 'https://example.com/intro.mp4',
				sequenceOrder: 1
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_CONTENT_ID);
			expect(result.value.trainingId).toBe(VALID_TRAINING_ID);
		});

		it('should return error when mutation response is null', async () => {
			mockGraphQL.setMockData({ training: { createTrainingContent: null } });

			const result = await adapter.createContent({
				trainingId: VALID_TRAINING_ID,
				title: 'Test',
				type: 'text',
				data: 'Content',
				sequenceOrder: 1
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.createContent({
				trainingId: VALID_TRAINING_ID,
				title: 'Test',
				type: 'text',
				data: 'Content',
				sequenceOrder: 1
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// updateContent
	// -------------------------------------------------------------------------

	describe('updateContent', () => {
		it('should update content and return it', async () => {
			mockGraphQL.setMockData({
				training: { updateTrainingContent: createGraphQLContent({ title: 'Updated' }) }
			});

			const result = await adapter.updateContent(VALID_CONTENT_ID, { title: 'Updated' });

			expect(result.isOk).toBe(true);
			expect(result.value.title.value).toBe('Updated');
		});

		it('should return error when response is null', async () => {
			mockGraphQL.setMockData({ training: { updateTrainingContent: null } });

			const result = await adapter.updateContent(VALID_CONTENT_ID, {});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ContentNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.updateContent(VALID_CONTENT_ID, {});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidTrainingError);
		});
	});

	// -------------------------------------------------------------------------
	// deleteContent
	// -------------------------------------------------------------------------

	describe('deleteContent', () => {
		it('should delete content successfully', async () => {
			mockGraphQL.setMockData({ training: { deleteTrainingContent: true } });

			const result = await adapter.deleteContent(VALID_CONTENT_ID);

			expect(result.isOk).toBe(true);
		});

		it('should return error when response is false', async () => {
			mockGraphQL.setMockData({ training: { deleteTrainingContent: false } });

			const result = await adapter.deleteContent(VALID_CONTENT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ContentNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.deleteContent(VALID_CONTENT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(ContentNotFoundError);
		});
	});

	// -------------------------------------------------------------------------
	// findProgressByUserAndTraining
	// -------------------------------------------------------------------------

	describe('findProgressByUserAndTraining', () => {
		it('should return progress items', async () => {
			mockGraphQL.setMockData({ trainingProgress: [createGraphQLProgress()] });

			const result = await adapter.findProgressByUserAndTraining(VALID_USER_ID, VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].userId).toBe(VALID_USER_ID);
			expect(result.value[0].status.value).toBe('in_progress');
		});

		it('should return completed progress with completedAt date', async () => {
			mockGraphQL.setMockData({
				trainingProgress: [
					createGraphQLProgress({
						status: 'completed',
						completedAt: '2026-01-15T10:00:00Z'
					})
				]
			});

			const result = await adapter.findProgressByUserAndTraining(VALID_USER_ID, VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value[0].isCompleted()).toBe(true);
			expect(result.value[0].completedAt).toBeInstanceOf(Date);
		});

		it('should skip invalid progress items (resilient)', async () => {
			mockGraphQL.setMockData({
				trainingProgress: [
					createGraphQLProgress(),
					createGraphQLProgress({ status: 'invalid-status' }) // invalid
				]
			});

			const result = await adapter.findProgressByUserAndTraining(VALID_USER_ID, VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
		});

		it('should return error when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findProgressByUserAndTraining(VALID_USER_ID, VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	// -------------------------------------------------------------------------
	// updateProgress
	// -------------------------------------------------------------------------

	describe('updateProgress', () => {
		it('should update progress successfully', async () => {
			mockGraphQL.setMockData({
				training: {
					updateProgress: createGraphQLProgress({
						status: 'completed',
						completedAt: '2026-01-15T10:00:00Z'
					})
				}
			});

			const result = await adapter.updateProgress(VALID_CONTENT_ID, { status: 'completed' });

			expect(result.isOk).toBe(true);
			expect(result.value.status.value).toBe('completed');
		});

		it('should return error when response is null', async () => {
			mockGraphQL.setMockData({ training: { updateProgress: null } });

			const result = await adapter.updateProgress(VALID_CONTENT_ID, { status: 'completed' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.updateProgress(VALID_CONTENT_ID, { status: 'completed' });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	// -------------------------------------------------------------------------
	// findAssignmentsByTrainingId
	// -------------------------------------------------------------------------

	describe('findAssignmentsByTrainingId', () => {
		it('should return assignments for a training', async () => {
			mockGraphQL.setMockData({ trainingAssignments: [createGraphQLAssignment()] });

			const result = await adapter.findAssignmentsByTrainingId(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].trainingId).toBe(VALID_TRAINING_ID);
			expect(result.value[0].userId).toBe(VALID_USER_ID);
		});

		it('should return empty array when no assignments', async () => {
			mockGraphQL.setMockData({ trainingAssignments: [] });

			const result = await adapter.findAssignmentsByTrainingId(VALID_TRAINING_ID);

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(0);
		});

		it('should return error when query throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.findAssignmentsByTrainingId(VALID_TRAINING_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	// -------------------------------------------------------------------------
	// createAssignment
	// -------------------------------------------------------------------------

	describe('createAssignment', () => {
		it('should create assignment successfully', async () => {
			mockGraphQL.setMockData({
				training: { assignTraining: createGraphQLAssignment() }
			});

			const result = await adapter.createAssignment({
				trainingId: VALID_TRAINING_ID,
				userId: VALID_USER_ID
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe(VALID_ASSIGNMENT_ID);
			expect(result.value.userId).toBe(VALID_USER_ID);
			expect(result.value.trainingId).toBe(VALID_TRAINING_ID);
		});

		it('should return error when response is null', async () => {
			mockGraphQL.setMockData({ training: { assignTraining: null } });

			const result = await adapter.createAssignment({
				trainingId: VALID_TRAINING_ID,
				userId: VALID_USER_ID
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.createAssignment({
				trainingId: VALID_TRAINING_ID,
				userId: VALID_USER_ID
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(InvalidAssignmentError);
		});
	});

	// -------------------------------------------------------------------------
	// deleteAssignment
	// -------------------------------------------------------------------------

	describe('deleteAssignment', () => {
		it('should delete assignment successfully', async () => {
			mockGraphQL.setMockData({
				training: { deleteTrainingAssignment: true }
			});

			const result = await adapter.deleteAssignment(VALID_ASSIGNMENT_ID);

			expect(result.isOk).toBe(true);
		});

		it('should return error when response is false', async () => {
			mockGraphQL.setMockData({ training: { deleteTrainingAssignment: false } });

			const result = await adapter.deleteAssignment(VALID_ASSIGNMENT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
		});

		it('should return error when mutation throws', async () => {
			mockGraphQL.setShouldThrow(true);

			const result = await adapter.deleteAssignment(VALID_ASSIGNMENT_ID);

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(AssignmentNotFoundError);
		});
	});
});
