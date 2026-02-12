// src/adapters/graphql/GraphQLPerformanceReviewAdapter.ts
import { Client } from '@urql/core';
import { Result } from '$domain/Result';
import {
	PerformanceReview,
	ReviewStatus,
	Rating,
	ReviewPeriod,
	ReviewDate,
	PerformanceReviewNotFoundError,
	PerformanceReviewValidationError,
	PerformanceReviewError
} from '$domain/PerformanceReview';
import type {
	PerformanceReviewRepository,
	PerformanceReviewFilter,
	CreatePerformanceReviewData,
	UpdatePerformanceReviewData
} from '$services/ports/PerformanceReviewRepository';

/**
 * GraphQL schema response shape
 */
interface GraphQLPerformanceReview {
	id: string;
	employeeId: string;
	reviewerId: string;
	reviewPeriod: string;
	reviewDate: string;
	status: string;
	overallRating: number;
	goalsAchievement: number;
	collaboration: number;
	communication: number;
	leadership: number;
	technicalSkills?: number;
	strengths: string;
	areasForImprovement: string;
	comments?: string;
	createdAt: string;
	updatedAt: string;
}

/**
 * GraphQLPerformanceReviewAdapter implements PerformanceReviewRepository port for GraphQL backend integration.
 *
 * Responsibilities:
 * - Translate between GraphQL API and domain entities
 * - Handle GraphQL errors and map to domain errors
 * - Resilient error handling (filter invalid reviews, don't throw)
 *
 * @example
 * ```typescript
 * const adapter = new GraphQLPerformanceReviewAdapter(urqlClient);
 * const result = await adapter.findById('review-123');
 * if (result.isOk) {
 *   console.log(result.value.overallRating);
 * }
 * ```
 */
export class GraphQLPerformanceReviewAdapter implements PerformanceReviewRepository {
	constructor(private readonly client: Client) {}

	async findById(id: string): Promise<Result<PerformanceReview, PerformanceReviewNotFoundError>> {
		try {
			const query = `
				query GetPerformanceReview($id: ID!) {
					performanceReview(id: $id) {
						id employeeId reviewerId reviewPeriod reviewDate status
						overallRating goalsAchievement collaboration communication leadership
						technicalSkills strengths areasForImprovement comments
						createdAt updatedAt
					}
				}
			`;

			const result = await this.client.query(query, { id }).toPromise();

			if (result.error) {
				return Result.error(new PerformanceReviewNotFoundError(id));
			}

			if (!result.data?.performanceReview) {
				return Result.error(new PerformanceReviewNotFoundError(id));
			}

			const domainResult = this.toDomain(result.data.performanceReview);
			if (domainResult.isError) {
				return Result.error(new PerformanceReviewNotFoundError(id));
			}

			return Result.ok(domainResult.value);
		} catch (error) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
	}

	async findAll(
		filter?: PerformanceReviewFilter
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		try {
			const query = `
				query GetPerformanceReviews($filter: PerformanceReviewFilter) {
					performanceReviews(filter: $filter) {
						id employeeId reviewerId reviewPeriod reviewDate status
						overallRating goalsAchievement collaboration communication leadership
						technicalSkills strengths areasForImprovement comments
						createdAt updatedAt
					}
				}
			`;

			const result = await this.client.query(query, { filter }).toPromise();

			if (result.error) {
				return Result.error(new PerformanceReviewError(result.error.message));
			}

			const reviews: PerformanceReview[] = [];
			const reviewsData = result.data?.performanceReviews ?? [];

			// Resilient error handling: skip invalid reviews instead of failing
			for (const reviewData of reviewsData) {
				const domainResult = this.toDomain(reviewData);
				if (domainResult.isOk) {
					reviews.push(domainResult.value);
				}
				// Skip invalid reviews (e.g., invalid ratings, dates)
			}

			return Result.ok(reviews);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async create(
		data: CreatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewValidationError>> {
		try {
			const mutation = `
				mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
					createPerformanceReview(input: $input) {
						id employeeId reviewerId reviewPeriod reviewDate status
						overallRating goalsAchievement collaboration communication leadership
						technicalSkills strengths areasForImprovement comments
						createdAt updatedAt
					}
				}
			`;

			const result = await this.client.mutation(mutation, { input: data }).toPromise();

			if (result.error) {
				return Result.error(new PerformanceReviewValidationError(result.error.message));
			}

			if (!result.data?.createPerformanceReview) {
				return Result.error(new PerformanceReviewValidationError('Failed to create review'));
			}

			const domainResult = this.toDomain(result.data.createPerformanceReview);
			if (domainResult.isError) {
				return Result.error(new PerformanceReviewValidationError(domainResult.error.message));
			}

			return Result.ok(domainResult.value);
		} catch (error) {
			return Result.error(
				new PerformanceReviewValidationError(
					`Failed to create review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async update(
		id: string,
		data: UpdatePerformanceReviewData
	): Promise<Result<PerformanceReview, PerformanceReviewError>> {
		try {
			const mutation = `
				mutation UpdatePerformanceReview($id: ID!, $input: UpdatePerformanceReviewInput!) {
					updatePerformanceReview(id: $id, input: $input) {
						id employeeId reviewerId reviewPeriod reviewDate status
						overallRating goalsAchievement collaboration communication leadership
						technicalSkills strengths areasForImprovement comments
						createdAt updatedAt
					}
				}
			`;

			const result = await this.client.mutation(mutation, { id, input: data }).toPromise();

			if (result.error) {
				return Result.error(new PerformanceReviewError(result.error.message));
			}

			if (!result.data?.updatePerformanceReview) {
				return Result.error(new PerformanceReviewError('Failed to update review'));
			}

			const domainResult = this.toDomain(result.data.updatePerformanceReview);
			if (domainResult.isError) {
				return Result.error(new PerformanceReviewError(domainResult.error.message));
			}

			return Result.ok(domainResult.value);
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Failed to update review: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}

	async delete(id: string): Promise<Result<void, PerformanceReviewNotFoundError>> {
		try {
			const mutation = `
				mutation DeletePerformanceReview($id: ID!) {
					deletePerformanceReview(id: $id)
				}
			`;

			const result = await this.client.mutation(mutation, { id }).toPromise();

			if (result.error) {
				return Result.error(new PerformanceReviewNotFoundError(id));
			}

			return Result.ok(undefined);
		} catch (error) {
			return Result.error(new PerformanceReviewNotFoundError(id));
		}
	}

	async getReviewsForEmployee(
		employeeId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		return this.findAll({ employeeId });
	}

	async getReviewsByReviewer(
		reviewerId: string
	): Promise<Result<PerformanceReview[], PerformanceReviewError>> {
		return this.findAll({ reviewerId });
	}

	/**
	 * Map GraphQL performance review data to domain PerformanceReview entity
	 * @private
	 */
	private toDomain(
		data: GraphQLPerformanceReview
	): Result<PerformanceReview, PerformanceReviewError> {
		try {
			// Validate and create status
			const statusResult = ReviewStatus.create(data.status);
			if (statusResult.isError) {
				return Result.error(statusResult.error);
			}

			// Validate and create review period
			const reviewPeriodResult = ReviewPeriod.create(data.reviewPeriod);
			if (reviewPeriodResult.isError) {
				return Result.error(reviewPeriodResult.error);
			}

			// Validate and create review date
			const reviewDateResult = ReviewDate.create(data.reviewDate);
			if (reviewDateResult.isError) {
				return Result.error(reviewDateResult.error);
			}

			// Validate and create all required ratings
			const overallRatingResult = Rating.create(data.overallRating);
			if (overallRatingResult.isError) {
				return Result.error(
					new PerformanceReviewError(`Invalid overall rating: ${overallRatingResult.error.message}`)
				);
			}

			const goalsAchievementResult = Rating.create(data.goalsAchievement);
			if (goalsAchievementResult.isError) {
				return Result.error(
					new PerformanceReviewError(
						`Invalid goals achievement rating: ${goalsAchievementResult.error.message}`
					)
				);
			}

			const collaborationResult = Rating.create(data.collaboration);
			if (collaborationResult.isError) {
				return Result.error(
					new PerformanceReviewError(
						`Invalid collaboration rating: ${collaborationResult.error.message}`
					)
				);
			}

			const communicationResult = Rating.create(data.communication);
			if (communicationResult.isError) {
				return Result.error(
					new PerformanceReviewError(
						`Invalid communication rating: ${communicationResult.error.message}`
					)
				);
			}

			const leadershipResult = Rating.create(data.leadership);
			if (leadershipResult.isError) {
				return Result.error(
					new PerformanceReviewError(`Invalid leadership rating: ${leadershipResult.error.message}`)
				);
			}

			// Handle optional technical skills rating
			let technicalSkills: Rating | undefined;
			if (data.technicalSkills !== undefined && data.technicalSkills !== null) {
				const technicalSkillsResult = Rating.create(data.technicalSkills);
				if (technicalSkillsResult.isError) {
					return Result.error(
						new PerformanceReviewError(
							`Invalid technical skills rating: ${technicalSkillsResult.error.message}`
						)
					);
				}
				technicalSkills = technicalSkillsResult.value;
			}

			// Create the PerformanceReview entity
			return PerformanceReview.create({
				id: data.id,
				employeeId: data.employeeId,
				reviewerId: data.reviewerId,
				reviewPeriod: reviewPeriodResult.value,
				reviewDate: reviewDateResult.value,
				status: statusResult.value,
				overallRating: overallRatingResult.value,
				goalsAchievement: goalsAchievementResult.value,
				collaboration: collaborationResult.value,
				communication: communicationResult.value,
				leadership: leadershipResult.value,
				technicalSkills,
				strengths: data.strengths,
				areasForImprovement: data.areasForImprovement,
				comments: data.comments,
				createdAt: new Date(data.createdAt),
				updatedAt: new Date(data.updatedAt)
			});
		} catch (error) {
			return Result.error(
				new PerformanceReviewError(
					`Domain transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
				)
			);
		}
	}
}
