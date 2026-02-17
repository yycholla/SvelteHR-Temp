// src/adapters/graphql/GraphQLTrainingAdapter.ts
import { Result } from '$domain/Result';
import { Training } from '$domain/Training/Training';
import { TrainingContent } from '$domain/Training/TrainingContent';
import { TrainingProgress } from '$domain/Training/TrainingProgress';
import { TrainingTitle } from '$domain/Training/value-objects/TrainingTitle';
import { ContentType } from '$domain/Training/value-objects/ContentType';
import { ProgressStatus } from '$domain/Training/value-objects/ProgressStatus';
import {
	TrainingError,
	TrainingNotFoundError,
	InvalidTrainingError,
	ContentNotFoundError,
	AssignmentNotFoundError,
	InvalidAssignmentError
} from '$domain/Training/errors/TrainingErrors';
import type {
	TrainingRepository,
	CreateTrainingData,
	UpdateTrainingData,
	CreateContentData,
	UpdateContentData,
	UpdateProgressData,
	CreateAssignmentData,
	TrainingAssignment,
	TrainingFilter
} from '$services/ports/TrainingRepository';
import type { GraphQLPort } from '$services/ports/GraphQLPort';

// GraphQL query/mutation constants

const GET_TRAINING_QUERY = `
	query GetTraining($id: UUID!) {
		training(id: $id) {
			id
			title
			description
			startDate
			endDate
			tags
			authorId
		}
	}
`;

const GET_MY_TRAININGS_QUERY = `
	query GetMyTrainings {
		myTrainings {
			id
			title
			description
			startDate
			endDate
			tags
			authorId
		}
	}
`;

const CREATE_TRAINING_MUTATION = `
	mutation CreateTraining($input: CreateTrainingInput!) {
		training {
			createTraining(input: $input) {
				id
				title
				description
				startDate
				endDate
				tags
				authorId
			}
		}
	}
`;

const UPDATE_TRAINING_MUTATION = `
	mutation UpdateTraining($id: UUID!, $input: UpdateTrainingInput!) {
		training {
			updateTraining(id: $id, input: $input) {
				id
				title
				description
				startDate
				endDate
				tags
				authorId
			}
		}
	}
`;

const DELETE_TRAINING_MUTATION = `
	mutation DeleteTraining($id: UUID!) {
		training {
			deleteTraining(id: $id)
		}
	}
`;

const GET_TRAINING_CONTENTS_QUERY = `
	query GetTrainingContents($trainingId: UUID!) {
		trainingContents(trainingId: $trainingId) {
			id
			title
			type
			data
			sequenceOrder
		}
	}
`;

const CREATE_CONTENT_MUTATION = `
	mutation CreateTrainingContent($input: CreateTrainingContentInput!) {
		training {
			createTrainingContent(input: $input) {
				id
				title
				type
				data
				sequenceOrder
			}
		}
	}
`;

const UPDATE_CONTENT_MUTATION = `
	mutation UpdateTrainingContent($id: UUID!, $input: UpdateTrainingContentInput!) {
		training {
			updateTrainingContent(id: $id, input: $input) {
				id
				title
				type
				data
				sequenceOrder
			}
		}
	}
`;

const DELETE_CONTENT_MUTATION = `
	mutation DeleteTrainingContent($id: UUID!) {
		training {
			deleteTrainingContent(id: $id)
		}
	}
`;

const GET_PROGRESS_QUERY = `
	query GetTrainingProgress($trainingId: UUID!, $userId: UUID!) {
		trainingProgress(trainingId: $trainingId, userId: $userId) {
			id
			userId
			trainingContentId
			status
			completedAt
		}
	}
`;

const UPDATE_PROGRESS_MUTATION = `
	mutation UpdateTrainingProgress($contentId: UUID!, $input: UpdateProgressInput!) {
		training {
			updateProgress(contentId: $contentId, input: $input) {
				id
				userId
				trainingContentId
				status
				completedAt
			}
		}
	}
`;

const GET_ASSIGNMENTS_QUERY = `
	query GetTrainingAssignments($trainingId: UUID!) {
		trainingAssignments(trainingId: $trainingId) {
			id
			userId
			trainingId
		}
	}
`;

const CREATE_ASSIGNMENT_MUTATION = `
	mutation CreateTrainingAssignment($input: CreateTrainingAssignmentInput!) {
		training {
			assignTraining(input: $input) {
				id
				userId
				trainingId
			}
		}
	}
`;

const DELETE_ASSIGNMENT_MUTATION = `
	mutation DeleteTrainingAssignment($id: UUID!) {
		training {
			deleteTrainingAssignment(id: $id)
		}
	}
`;

// GraphQL response shape interfaces

interface GraphQLTraining {
	id: string;
	title: string;
	description: string | null;
	startDate: string | null;
	endDate: string | null;
	tags: string[];
	authorId: string;
}

interface GraphQLTrainingContent {
	id: string;
	title: string;
	type: string;
	data: string;
	sequenceOrder: number;
}

interface GraphQLTrainingProgress {
	id: string;
	userId: string;
	trainingContentId: string;
	status: string;
	completedAt: string | null;
}

interface GraphQLTrainingAssignment {
	id: string;
	userId: string;
	trainingId: string;
}

/**
 * GraphQLTrainingAdapter implements TrainingRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (skip invalid data, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLTrainingAdapter(graphqlPort);
 * const result = await adapter.findById('training-123');
 * if (result.isOk) {
 *   console.log(result.value.title.value);
 * }
 * ```
 */
export class GraphQLTrainingAdapter implements TrainingRepository {
	constructor(private readonly graphql: GraphQLPort) {}

	async findById(id: string): Promise<Result<Training, TrainingError>> {
		try {
			const result = await this.graphql.query<{ training: GraphQLTraining | null }>(
				GET_TRAINING_QUERY,
				{ id }
			);

			if (!result?.training) {
				return Result.error(new TrainingNotFoundError(id));
			}

			const training = this.mapToTraining(result.training);
			if (!training) {
				return Result.error(new TrainingNotFoundError(id));
			}

			return Result.ok(training);
		} catch {
			return Result.error(new TrainingNotFoundError(id));
		}
	}

	async findAll(filter?: TrainingFilter): Promise<Result<Training[], TrainingError>> {
		try {
			const result = await this.graphql.query<{ myTrainings: GraphQLTraining[] }>(
				GET_MY_TRAININGS_QUERY,
				(filter ?? {}) as Record<string, unknown>
			);

			const trainings = (result?.myTrainings ?? [])
				.map((t) => this.mapToTraining(t))
				.filter((t): t is Training => t !== null);

			return Result.ok(trainings);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to fetch trainings: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(data: CreateTrainingData): Promise<Result<Training, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { createTraining: GraphQLTraining };
			}>(CREATE_TRAINING_MUTATION, { input: data });

			if (!result?.training?.createTraining) {
				return Result.error(new InvalidTrainingError('Failed to create training'));
			}

			const training = this.mapToTraining(result.training.createTraining);
			if (!training) {
				return Result.error(new InvalidTrainingError('Invalid training data returned'));
			}

			return Result.ok(training);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to create training: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(id: string, data: UpdateTrainingData): Promise<Result<Training, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { updateTraining: GraphQLTraining | null };
			}>(UPDATE_TRAINING_MUTATION, { id, input: data });

			if (!result?.training?.updateTraining) {
				return Result.error(new TrainingNotFoundError(id));
			}

			const training = this.mapToTraining(result.training.updateTraining);
			if (!training) {
				return Result.error(new InvalidTrainingError('Invalid training data returned'));
			}

			return Result.ok(training);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to update training: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { deleteTraining: boolean };
			}>(DELETE_TRAINING_MUTATION, { id });

			if (!result?.training?.deleteTraining) {
				return Result.error(new TrainingNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new TrainingNotFoundError(id));
		}
	}

	async findContentByTrainingId(
		trainingId: string
	): Promise<Result<TrainingContent[], TrainingError>> {
		try {
			const result = await this.graphql.query<{
				trainingContents: GraphQLTrainingContent[];
			}>(GET_TRAINING_CONTENTS_QUERY, { trainingId });

			const contents = (result?.trainingContents ?? [])
				.map((c) => this.mapToContent(c, trainingId))
				.filter((c): c is TrainingContent => c !== null);

			return Result.ok(contents);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to fetch training content: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createContent(data: CreateContentData): Promise<Result<TrainingContent, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { createTrainingContent: GraphQLTrainingContent };
			}>(CREATE_CONTENT_MUTATION, { input: data });

			if (!result?.training?.createTrainingContent) {
				return Result.error(new InvalidTrainingError('Failed to create training content'));
			}

			const content = this.mapToContent(result.training.createTrainingContent, data.trainingId);
			if (!content) {
				return Result.error(new InvalidTrainingError('Invalid content data returned'));
			}

			return Result.ok(content);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to create training content: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateContent(
		id: string,
		data: UpdateContentData
	): Promise<Result<TrainingContent, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { updateTrainingContent: GraphQLTrainingContent | null };
			}>(UPDATE_CONTENT_MUTATION, { id, input: data });

			if (!result?.training?.updateTrainingContent) {
				return Result.error(new ContentNotFoundError(id));
			}

			// GraphQL response doesn't include trainingId for content.
			// Use a sentinel UUID to satisfy domain validation; callers that need the
			// full entity with a real trainingId should use findContentByTrainingId.
			const UNKNOWN_TRAINING_ID = '00000000-0000-0000-0000-000000000000';
			const content = this.mapToContent(result.training.updateTrainingContent, UNKNOWN_TRAINING_ID);
			if (!content) {
				return Result.error(new InvalidTrainingError('Invalid content data returned'));
			}

			return Result.ok(content);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to update training content: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteContent(id: string): Promise<Result<void, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { deleteTrainingContent: boolean };
			}>(DELETE_CONTENT_MUTATION, { id });

			if (!result?.training?.deleteTrainingContent) {
				return Result.error(new ContentNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new ContentNotFoundError(id));
		}
	}

	async findProgressByUserAndTraining(
		userId: string,
		trainingId: string
	): Promise<Result<TrainingProgress[], TrainingError>> {
		try {
			const result = await this.graphql.query<{
				trainingProgress: GraphQLTrainingProgress[];
			}>(GET_PROGRESS_QUERY, { trainingId, userId });

			const progressItems = (result?.trainingProgress ?? [])
				.map((p) => this.mapToProgress(p))
				.filter((p): p is TrainingProgress => p !== null);

			return Result.ok(progressItems);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch training progress: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateProgress(
		contentId: string,
		data: UpdateProgressData
	): Promise<Result<TrainingProgress, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { updateProgress: GraphQLTrainingProgress | null };
			}>(UPDATE_PROGRESS_MUTATION, { contentId, input: data });

			if (!result?.training?.updateProgress) {
				return Result.error(new InvalidAssignmentError('Failed to update training progress'));
			}

			const progress = this.mapToProgress(result.training.updateProgress);
			if (!progress) {
				return Result.error(new InvalidAssignmentError('Invalid progress data returned'));
			}

			return Result.ok(progress);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to update training progress: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async findAssignmentsByTrainingId(
		trainingId: string
	): Promise<Result<TrainingAssignment[], TrainingError>> {
		try {
			const result = await this.graphql.query<{
				trainingAssignments: GraphQLTrainingAssignment[];
			}>(GET_ASSIGNMENTS_QUERY, { trainingId });

			const assignments = result?.trainingAssignments ?? [];
			return Result.ok(assignments);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch training assignments: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createAssignment(
		data: CreateAssignmentData
	): Promise<Result<TrainingAssignment, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { assignTraining: GraphQLTrainingAssignment };
			}>(CREATE_ASSIGNMENT_MUTATION, { input: data });

			if (!result?.training?.assignTraining) {
				return Result.error(new InvalidAssignmentError('Failed to create training assignment'));
			}

			return Result.ok(result.training.assignTraining);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to create training assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteAssignment(id: string): Promise<Result<void, TrainingError>> {
		try {
			const result = await this.graphql.mutation<{
				training: { deleteTrainingAssignment: boolean };
			}>(DELETE_ASSIGNMENT_MUTATION, { id });

			if (!result?.training?.deleteTrainingAssignment) {
				return Result.error(new AssignmentNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch {
			return Result.error(new AssignmentNotFoundError(id));
		}
	}

	/**
	 * Map GraphQL training data to domain Training entity.
	 * @private
	 * @returns Training entity or null if data is invalid (resilient error handling)
	 */
	private mapToTraining(data: GraphQLTraining): Training | null {
		try {
			const titleResult = TrainingTitle.create(data.title);
			if (titleResult.isError) return null;

			const startDate = data.startDate ? new Date(data.startDate) : null;
			if (startDate !== null && isNaN(startDate.getTime())) return null;

			const endDate = data.endDate ? new Date(data.endDate) : null;
			if (endDate !== null && isNaN(endDate.getTime())) return null;

			const trainingResult = Training.create({
				id: data.id,
				title: titleResult.value,
				description: data.description,
				startDate,
				endDate,
				tags: data.tags ?? [],
				authorId: data.authorId
			});

			if (trainingResult.isError) return null;

			return trainingResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}

	/**
	 * Map GraphQL training content data to domain TrainingContent entity.
	 * @private
	 * @param data - Raw GraphQL content data (no trainingId in response)
	 * @param trainingId - The trainingId from the query context
	 * @returns TrainingContent entity or null if data is invalid (resilient error handling)
	 */
	private mapToContent(data: GraphQLTrainingContent, trainingId: string): TrainingContent | null {
		try {
			const contentResult = TrainingContent.create({
				id: data.id,
				trainingId,
				title: data.title,
				type: data.type,
				data: data.data,
				sequenceOrder: data.sequenceOrder
			});

			if (contentResult.isError) return null;

			return contentResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}

	/**
	 * Map GraphQL training progress data to domain TrainingProgress entity.
	 * @private
	 * @returns TrainingProgress entity or null if data is invalid (resilient error handling)
	 */
	private mapToProgress(data: GraphQLTrainingProgress): TrainingProgress | null {
		try {
			const statusResult = ProgressStatus.create(data.status);
			if (statusResult.isError) return null;

			const completedAt = data.completedAt ? new Date(data.completedAt) : null;
			if (completedAt !== null && isNaN(completedAt.getTime())) return null;

			const progressResult = TrainingProgress.create({
				id: data.id,
				userId: data.userId,
				trainingContentId: data.trainingContentId,
				status: statusResult.value,
				completedAt
			});

			if (progressResult.isError) return null;

			return progressResult.value;
		} catch {
			return null; // Resilient - return null for invalid data
		}
	}
}
