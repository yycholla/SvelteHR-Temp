// src/services/ports/PerformanceReviewRepository.ts
import { Result } from '$domain/Result';
import {
	PerformanceReview,
	PerformanceReviewNotFoundError,
	PerformanceReviewValidationError,
	PerformanceReviewError
} from '$domain/PerformanceReview';

export interface PerformanceReviewFilter {
	employeeId?: string;
	reviewerId?: string;
	status?: string;
	reviewPeriod?: string;
	limit?: number;
	offset?: number;
}

export interface CreatePerformanceReviewData {
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	reviewDate: string;
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	status?: string;
}

export interface UpdatePerformanceReviewData {
	reviewPeriod?: string;
	reviewDate?: string;
	status?: string;
	overallRating?: number;
	goalsAchievement?: number;
	collaboration?: number;
	communication?: number;
	leadership?: number;
	technicalSkills?: number;
	strengths?: string;
	areasForImprovement?: string;
	comments?: string;
}

export interface PerformanceReviewRepository {
	/**
	 * Find a performance review by ID
	 * @returns Review if found, NotFoundError otherwise
	 */
	findById(id: string): Promise<Result<PerformanceReview, PerformanceReviewNotFoundError>>;

	/**
	 * Find all performance reviews with optional filtering
	 * @returns Array of reviews or error
	 */
	findAll(
		filter?: PerformanceReviewFilter
	): Promise<Result<PerformanceReview[], PerformanceReviewError>>;

	/**
	 * Create a new performance review
	 * @returns Created review or validation error
	 */
	create(
		data: CreatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewValidationError>>;

	/**
	 * Update an existing performance review
	 * @returns Updated review or error
	 */
	update(
		id: string,
		data: UpdatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>>;

	/**
	 * Delete a performance review
	 * @returns Success or not found error
	 */
	delete(id: string): Promise<Result<void, PerformanceReviewNotFoundError>>;

	/**
	 * Get performance reviews for an employee
	 * @returns Array of reviews for the employee
	 */
	getReviewsForEmployee(
		employeeId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>>;

	/**
	 * Get performance reviews by reviewer
	 * @returns Array of reviews conducted by the reviewer
	 */
	getReviewsByReviewer(
		reviewerId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>>;
}
