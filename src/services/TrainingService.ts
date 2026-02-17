// src/services/TrainingService.ts
import { Result } from '$domain/Result';
import type { Training } from '$domain/Training/Training';
import type { TrainingContent } from '$domain/Training/TrainingContent';
import type { TrainingProgress } from '$domain/Training/TrainingProgress';
import { InvalidTrainingError, InvalidAssignmentError } from '$domain/Training/errors/TrainingErrors';
import type { TrainingError } from '$domain/Training/errors/TrainingErrors';
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
} from './ports/TrainingRepository';

/**
 * Application service for managing trainings, content, progress, and assignments.
 * Orchestrates domain logic and repository operations.
 * All methods wrap repository calls in try-catch for resilient error handling.
 */
export class TrainingService {
	constructor(private readonly repository: TrainingRepository) {}

	/**
	 * Get a training by ID
	 * @param id - The training ID
	 * @returns Result containing the training or an error
	 */
	async getById(id: string): Promise<Result<Training, TrainingError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to fetch training: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all trainings with optional filtering
	 * @param filter - Optional filters for the query
	 * @returns Result containing array of trainings or an error
	 */
	async getAll(filter?: TrainingFilter): Promise<Result<Training[], TrainingError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to fetch trainings: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new training
	 * @param data - The training data
	 * @returns Result containing the created training or an error
	 */
	async create(data: CreateTrainingData): Promise<Result<Training, TrainingError>> {
		try {
			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to create training: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update an existing training
	 * @param id - The training ID
	 * @param data - The fields to update
	 * @returns Result containing the updated training or an error
	 */
	async update(id: string, data: UpdateTrainingData): Promise<Result<Training, TrainingError>> {
		try {
			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to update training: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete a training
	 * @param id - The training ID
	 * @returns Result indicating success or an error
	 */
	async delete(id: string): Promise<Result<void, TrainingError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to delete training: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all content for a training
	 * @param trainingId - The training ID
	 * @returns Result containing array of content items or an error
	 */
	async getContentByTrainingId(
		trainingId: string
	): Promise<Result<TrainingContent[], TrainingError>> {
		try {
			return await this.repository.findContentByTrainingId(trainingId);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to fetch training content: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new content item for a training
	 * @param data - The content data
	 * @returns Result containing the created content or an error
	 */
	async createContent(data: CreateContentData): Promise<Result<TrainingContent, TrainingError>> {
		try {
			return await this.repository.createContent(data);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to create training content: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update an existing content item
	 * @param id - The content ID
	 * @param data - The fields to update
	 * @returns Result containing the updated content or an error
	 */
	async updateContent(
		id: string,
		data: UpdateContentData
	): Promise<Result<TrainingContent, TrainingError>> {
		try {
			return await this.repository.updateContent(id, data);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to update training content: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete a content item
	 * @param id - The content ID
	 * @returns Result indicating success or an error
	 */
	async deleteContent(id: string): Promise<Result<void, TrainingError>> {
		try {
			return await this.repository.deleteContent(id);
		} catch (error) {
			return Result.error(
				new InvalidTrainingError(
					`Failed to delete training content: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get progress for a user's training
	 * @param userId - The user ID
	 * @param trainingId - The training ID
	 * @returns Result containing array of progress items or an error
	 */
	async getProgressByUserAndTraining(
		userId: string,
		trainingId: string
	): Promise<Result<TrainingProgress[], TrainingError>> {
		try {
			return await this.repository.findProgressByUserAndTraining(userId, trainingId);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch training progress: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Update progress for a content block
	 * @param contentId - The content ID
	 * @param data - The progress update data
	 * @returns Result containing the updated progress or an error
	 */
	async updateProgress(
		contentId: string,
		data: UpdateProgressData
	): Promise<Result<TrainingProgress, TrainingError>> {
		try {
			return await this.repository.updateProgress(contentId, data);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to update training progress: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Get all assignments for a training
	 * @param trainingId - The training ID
	 * @returns Result containing array of assignments or an error
	 */
	async getAssignmentsByTrainingId(
		trainingId: string
	): Promise<Result<TrainingAssignment[], TrainingError>> {
		try {
			return await this.repository.findAssignmentsByTrainingId(trainingId);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to fetch training assignments: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Create a new training assignment
	 * @param data - The assignment data
	 * @returns Result containing the created assignment or an error
	 */
	async createAssignment(
		data: CreateAssignmentData
	): Promise<Result<TrainingAssignment, TrainingError>> {
		try {
			return await this.repository.createAssignment(data);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to create training assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Delete a training assignment
	 * @param id - The assignment ID
	 * @returns Result indicating success or an error
	 */
	async deleteAssignment(id: string): Promise<Result<void, TrainingError>> {
		try {
			return await this.repository.deleteAssignment(id);
		} catch (error) {
			return Result.error(
				new InvalidAssignmentError(
					`Failed to delete training assignment: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
