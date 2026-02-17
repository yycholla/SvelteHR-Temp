// src/services/ports/TrainingRepository.ts
import type { Result } from '$domain/Result';
import type { Training } from '$domain/Training/Training';
import type { TrainingContent } from '$domain/Training/TrainingContent';
import type { TrainingProgress } from '$domain/Training/TrainingProgress';
import type { TrainingError } from '$domain/Training/errors/TrainingErrors';

export interface CreateTrainingData {
	title: string;
	description?: string | null;
	startDate?: string | null; // ISO date
	endDate?: string | null; // ISO date
	tags?: string[];
	authorId: string;
}

export interface UpdateTrainingData {
	title?: string;
	description?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	tags?: string[];
}

export interface CreateContentData {
	trainingId: string;
	title: string;
	type: string;
	data: string;
	sequenceOrder: number;
}

export interface UpdateContentData {
	title?: string;
	type?: string;
	data?: string;
	sequenceOrder?: number;
}

export interface UpdateProgressData {
	status: string;
}

export interface CreateAssignmentData {
	trainingId: string;
	userId: string;
}

export interface TrainingAssignment {
	id: string;
	userId: string;
	trainingId: string;
}

export interface TrainingFilter {
	isActive?: boolean;
	authorId?: string;
}

/**
 * Port interface for training data access.
 * Implemented by adapters (GraphQL, REST, etc.).
 */
export interface TrainingRepository {
	// Training CRUD
	findById(id: string): Promise<Result<Training, TrainingError>>;
	findAll(filter?: TrainingFilter): Promise<Result<Training[], TrainingError>>;
	create(data: CreateTrainingData): Promise<Result<Training, TrainingError>>;
	update(id: string, data: UpdateTrainingData): Promise<Result<Training, TrainingError>>;
	delete(id: string): Promise<Result<void, TrainingError>>;

	// Content management
	findContentByTrainingId(trainingId: string): Promise<Result<TrainingContent[], TrainingError>>;
	createContent(data: CreateContentData): Promise<Result<TrainingContent, TrainingError>>;
	updateContent(id: string, data: UpdateContentData): Promise<Result<TrainingContent, TrainingError>>;
	deleteContent(id: string): Promise<Result<void, TrainingError>>;

	// Progress tracking
	findProgressByUserAndTraining(
		userId: string,
		trainingId: string
	): Promise<Result<TrainingProgress[], TrainingError>>;
	updateProgress(
		contentId: string,
		data: UpdateProgressData
	): Promise<Result<TrainingProgress, TrainingError>>;

	// Assignments
	findAssignmentsByTrainingId(
		trainingId: string
	): Promise<Result<TrainingAssignment[], TrainingError>>;
	createAssignment(data: CreateAssignmentData): Promise<Result<TrainingAssignment, TrainingError>>;
	deleteAssignment(id: string): Promise<Result<void, TrainingError>>;
}
