// src/adapters/graphql/GraphQLPerformanceReviewAdapter.test.ts
import { describe, it, expect } from 'vitest';
import { GraphQLPerformanceReviewAdapter } from './GraphQLPerformanceReviewAdapter';
import {
	PerformanceReviewNotFoundError,
	PerformanceReviewValidationError,
	PerformanceReviewError
} from '$domain/PerformanceReview';
import { Client } from '@urql/core';

// Mock URQL client
function createMockClient(responses: Record<string, unknown>): Client {
	return {
		query: (query: unknown, variables: unknown) => ({
			toPromise: async () => responses['query'] ?? { data: null, error: null }
		}),
		mutation: (mutation: unknown, variables: unknown) => ({
			toPromise: async () => responses['mutation'] ?? { data: null, error: null }
		})
	} as unknown as Client;
}

describe('GraphQLPerformanceReviewAdapter', () => {
	const mockReviewData = {
		id: 'review-123',
		employeeId: 'emp-456',
		reviewerId: 'mgr-789',
		reviewPeriod: 'Q1-2026',
		reviewDate: '2026-03-31',
		status: 'draft',
		overallRating: 4,
		goalsAchievement: 4,
		collaboration: 5,
		communication: 4,
		leadership: 3,
		technicalSkills: 5,
		strengths: 'Excellent technical skills and team collaboration',
		areasForImprovement: 'Could improve leadership presence',
		comments: 'Great performance this quarter',
		createdAt: '2026-02-11T10:00:00Z',
		updatedAt: '2026-02-11T10:00:00Z'
	};

	describe('findById', () => {
		it('should return review when found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { performanceReview: mockReviewData }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findById('review-123');

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('review-123');
			expect(result.value.employeeId).toBe('emp-456');
			expect(result.value.overallRating.value).toBe(4);
		});

		it('should return error when review not found', async () => {
			const mockClient = createMockClient({
				query: {
					data: { performanceReview: null }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findById('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewNotFoundError);
			expect(result.error.message).toContain('nonexistent');
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Network error' }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findById('review-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewNotFoundError);
		});

		it('should handle invalid domain data gracefully', async () => {
			const invalidData = {
				...mockReviewData,
				overallRating: 10 // Invalid rating (must be 1-5)
			};

			const mockClient = createMockClient({
				query: {
					data: { performanceReview: invalidData }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findById('review-123');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewNotFoundError);
		});
	});

	describe('findAll', () => {
		it('should return all reviews', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						performanceReviews: [mockReviewData, { ...mockReviewData, id: 'review-456' }]
					}
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(2);
			expect(result.value[0].id).toBe('review-123');
			expect(result.value[1].id).toBe('review-456');
		});

		it('should filter reviews by employeeId', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						performanceReviews: [mockReviewData]
					}
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findAll({ employeeId: 'emp-456' });

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].employeeId).toBe('emp-456');
		});

		it('should skip invalid reviews and return valid ones', async () => {
			const invalidReview = {
				...mockReviewData,
				id: 'review-invalid',
				overallRating: 10 // Invalid
			};

			const mockClient = createMockClient({
				query: {
					data: {
						performanceReviews: [mockReviewData, invalidReview]
					}
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1); // Only valid review
			expect(result.value[0].id).toBe('review-123');
		});

		it('should handle GraphQL errors', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Database connection failed' }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findAll();

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewError);
		});
	});

	describe('create', () => {
		it('should create a new review', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: { createPerformanceReview: mockReviewData }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.create({
				employeeId: 'emp-456',
				reviewerId: 'mgr-789',
				reviewPeriod: 'Q1-2026',
				reviewDate: '2026-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				technicalSkills: 5,
				strengths: 'Excellent technical skills and team collaboration',
				areasForImprovement: 'Could improve leadership presence',
				comments: 'Great performance this quarter'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.id).toBe('review-123');
			expect(result.value.employeeId).toBe('emp-456');
		});

		it('should handle creation failure', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: { createPerformanceReview: null }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.create({
				employeeId: 'emp-456',
				reviewerId: 'mgr-789',
				reviewPeriod: 'Q1-2026',
				reviewDate: '2026-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Good work',
				areasForImprovement: 'Needs improvement'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewValidationError);
		});

		it('should handle GraphQL errors during creation', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Validation failed' }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.create({
				employeeId: 'emp-456',
				reviewerId: 'mgr-789',
				reviewPeriod: 'Q1-2026',
				reviewDate: '2026-03-31',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Good work',
				areasForImprovement: 'Needs improvement'
			});

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewValidationError);
		});
	});

	describe('update', () => {
		it('should update an existing review', async () => {
			const updatedData = {
				...mockReviewData,
				overallRating: 5,
				status: 'in_progress'
			};

			const mockClient = createMockClient({
				mutation: {
					data: { updatePerformanceReview: updatedData }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.update('review-123', {
				overallRating: 5,
				status: 'in_progress'
			});

			expect(result.isOk).toBe(true);
			expect(result.value.overallRating.value).toBe(5);
			expect(result.value.status.value).toBe('in_progress');
		});

		it('should handle update failure for nonexistent review', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: { updatePerformanceReview: null }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.update('nonexistent', { overallRating: 5 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewError);
		});

		it('should handle GraphQL errors during update', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Update failed' }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.update('review-123', { overallRating: 5 });

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewError);
		});
	});

	describe('delete', () => {
		it('should delete a review', async () => {
			const mockClient = createMockClient({
				mutation: {
					data: { deletePerformanceReview: true }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.delete('review-123');

			expect(result.isOk).toBe(true);
		});

		it('should handle deletion failure', async () => {
			const mockClient = createMockClient({
				mutation: {
					error: { message: 'Review not found' }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.delete('nonexistent');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewNotFoundError);
		});
	});

	describe('getReviewsForEmployee', () => {
		it('should return reviews for an employee', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						performanceReviews: [mockReviewData]
					}
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.getReviewsForEmployee('emp-456');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].employeeId).toBe('emp-456');
		});

		it('should handle errors when fetching employee reviews', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Query failed' }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.getReviewsForEmployee('emp-456');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewError);
		});
	});

	describe('getReviewsByReviewer', () => {
		it('should return reviews by a reviewer', async () => {
			const mockClient = createMockClient({
				query: {
					data: {
						performanceReviews: [mockReviewData]
					}
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.getReviewsByReviewer('mgr-789');

			expect(result.isOk).toBe(true);
			expect(result.value).toHaveLength(1);
			expect(result.value[0].reviewerId).toBe('mgr-789');
		});

		it('should handle errors when fetching reviewer reviews', async () => {
			const mockClient = createMockClient({
				query: {
					error: { message: 'Query failed' }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.getReviewsByReviewer('mgr-789');

			expect(result.isError).toBe(true);
			expect(result.error).toBeInstanceOf(PerformanceReviewError);
		});
	});

	describe('toDomain transformation', () => {
		it('should handle reviews without optional fields', async () => {
			const minimalReview = {
				id: 'review-minimal',
				employeeId: 'emp-456',
				reviewerId: 'mgr-789',
				reviewPeriod: 'Q1-2026',
				reviewDate: '2026-03-31',
				status: 'draft',
				overallRating: 4,
				goalsAchievement: 4,
				collaboration: 5,
				communication: 4,
				leadership: 3,
				strengths: 'Good work',
				areasForImprovement: 'Keep improving',
				createdAt: '2026-02-11T10:00:00Z',
				updatedAt: '2026-02-11T10:00:00Z'
			};

			const mockClient = createMockClient({
				query: {
					data: { performanceReview: minimalReview }
				}
			});

			const adapter = new GraphQLPerformanceReviewAdapter(mockClient);
			const result = await adapter.findById('review-minimal');

			expect(result.isOk).toBe(true);
			expect(result.value.technicalSkills).toBeUndefined();
			expect(result.value.comments).toBeUndefined();
		});
	});
});
