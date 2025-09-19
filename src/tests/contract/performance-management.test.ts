import { describe, it, expect, beforeAll } from 'vitest';
import { createClient, type Client } from '@urql/core';

// Contract tests for Performance Management GraphQL operations
// These tests verify the GraphQL schema contracts match our expectations
// CRITICAL: These tests MUST FAIL initially before implementation

describe('Performance Management Contract Tests', () => {
	let client: Client;

	beforeAll(() => {
		// Create GraphQL client for testing
		client = createClient({
			url: 'http://localhost:8080/graphql',
			fetchOptions: {
				headers: {
					'Content-Type': 'application/json'
				}
			}
		});
	});

	describe('Performance Cycles Query', () => {
		it('should have correct schema structure for performance cycles query', async () => {
			const query = `
        query GetPerformanceCycles($isActive: Boolean) {
          performanceCycles(isActive: $isActive) {
            nodes {
              id
              name
              description
              startDate
              endDate
              reviewDueDate
              isActive
              reviewCount
            }
          }
        }
      `;

			const variables = {
				isActive: true
			};

			// This MUST FAIL initially - performanceCycles field doesn't exist yet
			const result = await client.query(query, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data).toBeDefined();
			expect(result.data.performanceCycles).toBeDefined();
			expect(result.data.performanceCycles.nodes).toBeInstanceOf(Array);
		});

		it('should include computed reviewCount field', async () => {
			const query = `
        query GetCycleReviewCounts {
          performanceCycles {
            nodes {
              id
              name
              reviewCount
              isActive
            }
          }
        }
      `;

			// This MUST FAIL initially - reviewCount computed field doesn't exist
			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			if (result.data.performanceCycles.nodes.length > 0) {
				const cycle = result.data.performanceCycles.nodes[0];
				expect(cycle.reviewCount).toBeTypeOf('number');
			}
		});
	});

	describe('Performance Reviews Query', () => {
		it('should have correct schema structure for performance reviews query', async () => {
			const query = `
        query GetPerformanceReviews($filters: PerformanceReviewFilters) {
          performanceReviews(filters: $filters) {
            nodes {
              id
              reviewPeriodStart
              reviewPeriodEnd
              overallRating
              goalsRating
              competenciesRating
              status
              submittedAt
              completedAt
              employee {
                id
                displayName
                jobTitle
              }
              reviewer {
                id
                displayName
              }
              cycle {
                id
                name
              }
              goals {
                id
                title
                status
                progressPercentage
                finalRating
              }
            }
          }
        }
      `;

			const variables = {
				filters: {
					employeeId: '550e8400-e29b-41d4-a716-446655440000',
					status: ['SUBMITTED', 'COMPLETED']
				}
			};

			// This MUST FAIL initially - performanceReviews field doesn't exist
			const result = await client.query(query, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.performanceReviews).toBeDefined();
			expect(result.data.performanceReviews.nodes).toBeInstanceOf(Array);
		});

		it('should support PerformanceReviewFilters input type', async () => {
			const query = `
        query GetFilteredPerformanceReviews($filters: PerformanceReviewFilters) {
          performanceReviews(filters: $filters) {
            nodes {
              id
              overallRating
              status
              employee {
                displayName
              }
            }
          }
        }
      `;

			const filters = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				reviewerId: '550e8400-e29b-41d4-a716-446655440001',
				cycleId: '550e8400-e29b-41d4-a716-446655440002',
				status: ['DRAFT', 'SUBMITTED', 'COMPLETED']
			};

			// This MUST FAIL initially - PerformanceReviewFilters input type doesn't exist
			const result = await client.query(query, { filters }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.performanceReviews.nodes).toBeInstanceOf(Array);
		});

		it('should support PerformanceRating enum values', async () => {
			const query = `
        query GetHighPerformers {
          performanceReviews(filters: { overallRating: [EXCEEDS, MEETS] }) {
            nodes {
              id
              overallRating
              goalsRating
              competenciesRating
              employee {
                displayName
              }
            }
          }
        }
      `;

			// This MUST FAIL initially - PerformanceRating enum doesn't exist
			const result = await client.query(query, {}).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.performanceReviews.nodes).toBeInstanceOf(Array);
		});

		it('should include performance goals in review data', async () => {
			const query = `
        query GetReviewWithGoals($reviewId: UUID!) {
          performanceReview(id: $reviewId) {
            id
            overallRating
            goals {
              id
              title
              description
              targetCompletionDate
              weight
              status
              progressPercentage
              finalRating
              managerNotes
              employeeNotes
            }
          }
        }
      `;

			// This MUST FAIL initially - goals relationship doesn't exist
			const result = await client
				.query(query, {
					reviewId: '550e8400-e29b-41d4-a716-446655440000'
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.performanceReview).toBeDefined();
			expect(result.data.performanceReview.goals).toBeInstanceOf(Array);
		});
	});

	describe('Performance Analytics', () => {
		it('should provide team performance metrics', async () => {
			const query = `
        query GetTeamPerformanceMetrics($managerId: UUID!, $cycleId: UUID) {
          teamPerformanceMetrics(managerId: $managerId, cycleId: $cycleId) {
            teamSize
            reviewsCompleted
            averageOverallRating
            ratingDistribution {
              rating
              count
              percentage
            }
            goalCompletionRate
            topPerformers {
              employee {
                id
                displayName
              }
              overallRating
            }
          }
        }
      `;

			// This MUST FAIL initially - teamPerformanceMetrics field doesn't exist
			const result = await client
				.query(query, {
					managerId: '550e8400-e29b-41d4-a716-446655440000',
					cycleId: '550e8400-e29b-41d4-a716-446655440001'
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.teamPerformanceMetrics).toBeDefined();
			expect(result.data.teamPerformanceMetrics.ratingDistribution).toBeInstanceOf(Array);
		});

		it('should calculate goal completion statistics', async () => {
			const query = `
        query GetGoalCompletionStats($employeeId: UUID, $cycleId: UUID) {
          goalCompletionStats(employeeId: $employeeId, cycleId: $cycleId) {
            totalGoals
            completedGoals
            inProgressGoals
            overallCompletionRate
            averageProgressPercentage
            goalsByStatus {
              status
              count
            }
          }
        }
      `;

			// This MUST FAIL initially - goalCompletionStats field doesn't exist
			const result = await client
				.query(query, {
					employeeId: '550e8400-e29b-41d4-a716-446655440000'
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.goalCompletionStats.overallCompletionRate).toBeTypeOf('number');
		});

		it('should provide performance trends over time', async () => {
			const query = `
        query GetPerformanceTrends($employeeId: UUID!, $yearsBack: Int) {
          performanceTrends(employeeId: $employeeId, yearsBack: $yearsBack) {
            trends {
              cycle {
                id
                name
                endDate
              }
              overallRating
              goalsRating
              competenciesRating
              goalCompletionRate
            }
            improvement
            consistencyScore
          }
        }
      `;

			// This MUST FAIL initially - performanceTrends field doesn't exist
			const result = await client
				.query(query, {
					employeeId: '550e8400-e29b-41d4-a716-446655440000',
					yearsBack: 3
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.performanceTrends.trends).toBeInstanceOf(Array);
		});
	});

	describe('Performance Review Mutations', () => {
		it('should support creating performance reviews', async () => {
			const mutation = `
        mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
          createPerformanceReview(input: $input) {
            performanceReview {
              id
              employeeId
              reviewerId
              cycleId
              reviewPeriodStart
              reviewPeriodEnd
              status
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const input = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				reviewerId: '550e8400-e29b-41d4-a716-446655440001',
				cycleId: '550e8400-e29b-41d4-a716-446655440002',
				reviewPeriodStart: '2025-01-01',
				reviewPeriodEnd: '2025-12-31'
			};

			// This MUST FAIL initially - createPerformanceReview mutation doesn't exist
			const result = await client.mutation(mutation, { input }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.createPerformanceReview).toBeDefined();

			if (result.data.createPerformanceReview.performanceReview) {
				expect(result.data.createPerformanceReview.performanceReview.id).toBeDefined();
				expect(result.data.createPerformanceReview.performanceReview.status).toBe('DRAFT');
			}
		});

		it('should support updating performance review content', async () => {
			const mutation = `
        mutation UpdatePerformanceReview($id: UUID!, $input: UpdatePerformanceReviewInput!) {
          updatePerformanceReview(id: $id, input: $input) {
            performanceReview {
              id
              overallRating
              goalsRating
              competenciesRating
              selfAssessment
              managerComments
              employeeComments
              developmentGoals
              status
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const variables = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				input: {
					overallRating: 'MEETS',
					goalsRating: 'EXCEEDS',
					competenciesRating: 'MEETS',
					selfAssessment: 'I believe I have met my goals this year...',
					managerComments: 'Employee has shown excellent growth...',
					developmentGoals: 'Focus on leadership skills in the coming year'
				}
			};

			// This MUST FAIL initially - updatePerformanceReview mutation doesn't exist
			const result = await client.mutation(mutation, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.updatePerformanceReview.performanceReview).toBeDefined();
		});

		it('should support submitting performance reviews', async () => {
			const mutation = `
        mutation SubmitPerformanceReview($id: UUID!) {
          submitPerformanceReview(id: $id) {
            performanceReview {
              id
              status
              submittedAt
            }
            errors {
              field
              message
            }
          }
        }
      `;

			// This MUST FAIL initially - submitPerformanceReview mutation doesn't exist
			const result = await client
				.mutation(mutation, {
					id: '550e8400-e29b-41d4-a716-446655440000'
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.submitPerformanceReview.performanceReview.status).toBe('SUBMITTED');
			expect(result.data.submitPerformanceReview.performanceReview.submittedAt).toBeDefined();
		});
	});

	describe('Performance Goals Management', () => {
		it('should support creating performance goals', async () => {
			const mutation = `
        mutation CreatePerformanceGoal($input: CreatePerformanceGoalInput!) {
          createPerformanceGoal(input: $input) {
            performanceGoal {
              id
              employeeId
              reviewId
              title
              description
              targetCompletionDate
              weight
              status
              progressPercentage
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const input = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				reviewId: '550e8400-e29b-41d4-a716-446655440001',
				title: 'Improve Code Quality',
				description: 'Reduce bug reports by 50% through better testing practices',
				targetCompletionDate: '2025-12-31',
				weight: 30
			};

			// This MUST FAIL initially - createPerformanceGoal mutation doesn't exist
			const result = await client.mutation(mutation, { input }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.createPerformanceGoal.performanceGoal).toBeDefined();
		});

		it('should support updating goal progress', async () => {
			const mutation = `
        mutation UpdateGoalProgress($id: UUID!, $input: UpdateGoalProgressInput!) {
          updateGoalProgress(id: $id, input: $input) {
            performanceGoal {
              id
              progressPercentage
              status
              employeeNotes
              managerNotes
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const variables = {
				id: '550e8400-e29b-41d4-a716-446655440000',
				input: {
					progressPercentage: 75,
					status: 'ON_TRACK',
					employeeNotes: 'Making good progress on testing implementation',
					managerNotes: 'Excellent improvement in code quality metrics'
				}
			};

			// This MUST FAIL initially - updateGoalProgress mutation doesn't exist
			const result = await client.mutation(mutation, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.updateGoalProgress.performanceGoal.progressPercentage).toBe(75);
		});

		it('should validate goal weight totals per review', async () => {
			const mutation = `
        mutation CreateGoalWithExcessiveWeight($input: CreatePerformanceGoalInput!) {
          createPerformanceGoal(input: $input) {
            performanceGoal {
              id
            }
            errors {
              field
              message
            }
          }
        }
      `;

			const excessiveInput = {
				employeeId: '550e8400-e29b-41d4-a716-446655440000',
				reviewId: '550e8400-e29b-41d4-a716-446655440001',
				title: 'Excessive Weight Goal',
				weight: 150 // Should cause total to exceed 100%
			};

			// This MUST FAIL initially - weight validation doesn't exist
			const result = await client.mutation(mutation, { input: excessiveInput }).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.createPerformanceGoal.errors).toBeInstanceOf(Array);

			const weightError = result.data.createPerformanceGoal.errors.find(
				(error: any) => error.field === 'weight'
			);
			expect(weightError).toBeDefined();
		});
	});

	describe('Performance Review Workflow', () => {
		it('should enforce review status transitions', async () => {
			const mutation = `
        mutation InvalidStatusTransition($id: UUID!, $input: UpdatePerformanceReviewInput!) {
          updatePerformanceReview(id: $id, input: $input) {
            performanceReview {
              id
              status
            }
            errors {
              field
              message
            }
          }
        }
      `;

			// Try to update a completed review
			const variables = {
				id: '550e8400-e29b-41d4-a716-446655440000', // Assume this is already completed
				input: {
					overallRating: 'BELOW'
				}
			};

			// This MUST FAIL initially - status transition validation doesn't exist
			const result = await client.mutation(mutation, variables).toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.updatePerformanceReview.errors).toBeInstanceOf(Array);

			const statusError = result.data.updatePerformanceReview.errors.find((error: any) =>
				error.message.includes('completed')
			);
			expect(statusError).toBeDefined();
		});

		it('should require all goals to be rated before review completion', async () => {
			const mutation = `
        mutation CompleteIncompleteReview($id: UUID!) {
          completePerformanceReview(id: $id) {
            performanceReview {
              id
              status
              completedAt
            }
            errors {
              field
              message
            }
          }
        }
      `;

			// This MUST FAIL initially - completion validation doesn't exist
			const result = await client
				.mutation(mutation, {
					id: '550e8400-e29b-41d4-a716-446655440000' // Has unrated goals
				})
				.toPromise();

			expect(result.error).toBeUndefined();
			expect(result.data.completePerformanceReview.errors).toBeInstanceOf(Array);

			const goalsError = result.data.completePerformanceReview.errors.find((error: any) =>
				error.message.includes('goals')
			);
			expect(goalsError).toBeDefined();
		});
	});
});
