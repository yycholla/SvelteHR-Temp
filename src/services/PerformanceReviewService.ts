// src/services/PerformanceReviewService.ts
import { Result } from '$domain/Result';
import {
	PerformanceReview,
	PerformanceReviewNotFoundError,
	PerformanceReviewError
} from '$domain/PerformanceReview';
import type {
	PerformanceReviewRepository,
	CreatePerformanceReviewData,
	UpdatePerformanceReviewData,
	PerformanceReviewFilter
} from './ports/PerformanceReviewRepository';

export class PerformanceReviewService {
	constructor(private readonly repository: PerformanceReviewRepository) {}

	async getReviewById(
		id: string
	): Promise<Result<PerformanceReview, PerformanceReviewNotFoundError>> {
		try {
			return await this.repository.findById(id);
		} catch (error) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
	}

	async getAllReviews(
		filter?: PerformanceReviewFilter
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		try {
			return await this.repository.findAll(filter);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async createReview(
		data: CreatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>> {
		try {
			return await this.repository.create(data);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to create review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async updateReview(
		id: string,
		data: UpdatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>> {
		try {
			return await this.repository.update(id, data);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to update review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async deleteReview(id: string): Promise<Result<void, PerformanceReviewNotFoundError>> {
		try {
			return await this.repository.delete(id);
		} catch (error) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
	}

	async getEmployeeReviews(
		employeeId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		try {
			return await this.repository.getReviewsForEmployee(employeeId);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to fetch employee reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async getReviewerReviews(
		reviewerId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		try {
			return await this.repository.getReviewsByReviewer(reviewerId);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to fetch reviewer reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	/**
	 * Business logic: Calculate statistics for a set of reviews
	 */
	calculateStatistics(reviews: PerformanceReview[]): {
		totalReviews: number;
		completed: number;
		inProgress: number;
		overdue: number;
		averageRating: number;
	} {
		const completed = reviews.filter((r) => r.isComplete()).length;
		const inProgress = reviews.filter((r) => r.status.isInProgress()).length;
		const overdue = reviews.filter((r) => r.isOverdue()).length;

		const avgRating =
			reviews.length > 0
				? reviews.reduce((sum, r) => sum + r.getAverageRating(), 0) / reviews.length
				: 0;

		return {
			totalReviews: reviews.length,
			completed,
			inProgress,
			overdue,
			averageRating: Math.round(avgRating * 10) / 10
		};
	}
}
