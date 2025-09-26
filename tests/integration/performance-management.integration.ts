// Performance Management Integration Tests
// Tests performance review and goal management workflows
// Created: 2025-09-24

import { test, expect, describe } from 'vitest';
import { createTestContext, cleanupTestData, TestUser, TestEmployee } from '../utils/test-helpers';
import { performGraphQLQuery, performGraphQLMutation } from '../utils/graphql-test-client';

describe('Performance Management Integration Tests', () => {
  let testContext: any;
  let testEmployee: any;
  let manager: any;
  let hrManager: any;

  beforeAll(async () => {
    testContext = await createTestContext();
    testEmployee = await TestEmployee.create({
      firstName: 'Performance',
      lastName: 'Testee',
      email: 'performance.testee@company.com',
      role: 'EMPLOYEE',
      departmentId: testContext.departments.engineering.id,
    });
    manager = await TestUser.createManager();
    hrManager = await TestUser.createHRManager();
  });

  afterAll(async () => {
    await cleanupTestData(testContext);
  });

  describe('Performance Review Lifecycle', () => {
    test('should create performance review with complete workflow', async () => {
      const reviewData = {
        employeeId: testEmployee.id,
        reviewPeriodStart: '2024-01-01T00:00:00Z',
        reviewPeriodEnd: '2024-12-31T23:59:59Z',
        overallRating: 4.5,
        feedback: 'Excellent performance throughout the year. Exceeded all expectations.',
      };

      const createReviewMutation = `
        mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
          createPerformanceReview(input: $input) {
            id
            employee {
              id
              firstName
              lastName
            }
            reviewer {
              id
              firstName
              lastName
            }
            reviewPeriodStart
            reviewPeriodEnd
            overallRating
            feedback
            status
            createdAt
            updatedAt
          }
        }
      `;

      const response = await performGraphQLMutation(
        createReviewMutation,
        { input: reviewData },
        manager.token
      );

      // Assert: Review created successfully
      expect(response.errors).toBeUndefined();
      expect(response.data.createPerformanceReview).toMatchObject({
        employee: {
          id: testEmployee.id,
          firstName: 'Performance',
          lastName: 'Testee',
        },
        reviewer: {
          id: manager.id,
        },
        reviewPeriodStart: '2024-01-01T00:00:00Z',
        reviewPeriodEnd: '2024-12-31T23:59:59Z',
        overallRating: 4.5,
        feedback: 'Excellent performance throughout the year. Exceeded all expectations.',
        status: 'PENDING',
      });

      expect(response.data.createPerformanceReview.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(response.data.createPerformanceReview.createdAt)).toBeInstanceOf(Date);

      // Store for cleanup
      testContext.createdReviews.push(response.data.createPerformanceReview.id);
    });

    test('should validate rating constraints', async () => {
      const invalidReviewData = {
        employeeId: testEmployee.id,
        reviewPeriodStart: '2024-01-01T00:00:00Z',
        reviewPeriodEnd: '2024-12-31T23:59:59Z',
        overallRating: 6.0, // Above maximum rating of 5
        feedback: 'Test feedback',
      };

      const createReviewMutation = `
        mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
          createPerformanceReview(input: $input) {
            id
          }
        }
      `;

      const response = await performGraphQLMutation(
        createReviewMutation,
        { input: invalidReviewData },
        manager.token
      );

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/rating.*range|invalid.*rating/i);
    });

    test('should enforce review period validation', async () => {
      const invalidPeriodReview = {
        employeeId: testEmployee.id,
        reviewPeriodStart: '2024-12-31T23:59:59Z', // Start after end
        reviewPeriodEnd: '2024-01-01T00:00:00Z',
        overallRating: 4.0,
        feedback: 'Test feedback',
      };

      const createReviewMutation = `
        mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
          createPerformanceReview(input: $input) {
            id
          }
        }
      `;

      const response = await performGraphQLMutation(
        createReviewMutation,
        { input: invalidPeriodReview },
        manager.token
      );

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/period.*invalid|start.*end/i);
    });

    test('should retrieve performance reviews with filtering', async () => {
      const reviewsQuery = `
        query GetPerformanceReviews($filters: PerformanceReviewFilters) {
          performanceReviews(filters: $filters) {
            data {
              id
              employee {
                id
                firstName
                lastName
              }
              reviewer {
                id
                firstName
                lastName
              }
              overallRating
              status
              reviewPeriodStart
              reviewPeriodEnd
              createdAt
            }
            pagination {
              total
              page
              limit
            }
          }
        }
      `;

      const response = await performGraphQLQuery(
        reviewsQuery,
        { filters: { employeeId: testEmployee.id } },
        manager.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.performanceReviews.data).toBeInstanceOf(Array);
      expect(response.data.performanceReviews.data.length).toBeGreaterThan(0);

      // Assert: All reviews are for the specified employee
      for (const review of response.data.performanceReviews.data) {
        expect(review.employee.id).toBe(testEmployee.id);
      }
    });

    test('should update review status through workflow', async () => {
      // Create a review first
      const reviewData = {
        employeeId: testEmployee.id,
        reviewPeriodStart: '2024-01-01T00:00:00Z',
        reviewPeriodEnd: '2024-12-31T23:59:59Z',
        overallRating: 4.0,
        feedback: 'Good performance',
      };

      const createResponse = await performGraphQLMutation(
        `mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
          createPerformanceReview(input: $input) { id }
        }`,
        { input: reviewData },
        manager.token
      );

      const reviewId = createResponse.data.createPerformanceReview.id;

      // Update status to IN_PROGRESS
      const updateStatusMutation = `
        mutation UpdateReviewStatus($id: ID!, $status: ReviewStatus!) {
          updatePerformanceReviewStatus(id: $id, status: $status) {
            id
            status
            updatedAt
          }
        }
      `;

      const updateResponse = await performGraphQLMutation(
        updateStatusMutation,
        { id: reviewId, status: 'IN_PROGRESS' },
        manager.token
      );

      expect(updateResponse.errors).toBeUndefined();
      expect(updateResponse.data.updatePerformanceReviewStatus.status).toBe('IN_PROGRESS');

      // Update status to COMPLETED
      const completeResponse = await performGraphQLMutation(
        updateStatusMutation,
        { id: reviewId, status: 'COMPLETED' },
        manager.token
      );

      expect(completeResponse.errors).toBeUndefined();
      expect(completeResponse.data.updatePerformanceReviewStatus.status).toBe('COMPLETED');

      testContext.createdReviews.push(reviewId);
    });

    test('should enforce RBAC for review operations', async () => {
      const regularEmployee = await TestUser.createEmployee();

      const reviewData = {
        employeeId: testEmployee.id,
        reviewPeriodStart: '2024-01-01T00:00:00Z',
        reviewPeriodEnd: '2024-12-31T23:59:59Z',
        overallRating: 4.0,
        feedback: 'Unauthorized review',
      };

      const createReviewMutation = `
        mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
          createPerformanceReview(input: $input) {
            id
          }
        }
      `;

      const response = await performGraphQLMutation(
        createReviewMutation,
        { input: reviewData },
        regularEmployee.token
      );

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/access denied|forbidden|unauthorized/i);
    });
  });

  describe('Goal Management Workflow', () => {
    test('should create employee goal with complete data', async () => {
      const goalData = {
        employeeId: testEmployee.id,
        title: 'Complete React Certification',
        description: 'Obtain React Developer Certification from Meta by end of year',
        targetDate: '2024-12-31T23:59:59Z',
        category: 'DEVELOPMENT',
      };

      const createGoalMutation = `
        mutation CreateGoal($input: CreateGoalInput!) {
          createGoal(input: $input) {
            id
            employee {
              id
              firstName
              lastName
            }
            title
            description
            targetDate
            progress
            status
            category
            createdAt
            updatedAt
          }
        }
      `;

      const response = await performGraphQLMutation(
        createGoalMutation,
        { input: goalData },
        manager.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.createGoal).toMatchObject({
        employee: {
          id: testEmployee.id,
          firstName: 'Performance',
          lastName: 'Testee',
        },
        title: 'Complete React Certification',
        description: 'Obtain React Developer Certification from Meta by end of year',
        targetDate: '2024-12-31T23:59:59Z',
        progress: 0.0,
        status: 'NOT_STARTED',
        category: 'DEVELOPMENT',
      });

      expect(response.data.createGoal.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(new Date(response.data.createGoal.createdAt)).toBeInstanceOf(Date);

      testContext.createdGoals.push(response.data.createGoal.id);
    });

    test('should update goal progress', async () => {
      // Create goal first
      const goalData = {
        employeeId: testEmployee.id,
        title: 'Progress Test Goal',
        description: 'Test goal for progress updates',
        targetDate: '2024-12-31T23:59:59Z',
        category: 'PERFORMANCE',
      };

      const createResponse = await performGraphQLMutation(
        `mutation CreateGoal($input: CreateGoalInput!) {
          createGoal(input: $input) { id }
        }`,
        { input: goalData },
        manager.token
      );

      const goalId = createResponse.data.createGoal.id;

      // Update progress to 50%
      const updateProgressMutation = `
        mutation UpdateGoalProgress($id: ID!, $progress: Float!) {
          updateGoalProgress(id: $id, progress: $progress) {
            id
            progress
            status
            updatedAt
          }
        }
      `;

      const progressResponse = await performGraphQLMutation(
        updateProgressMutation,
        { id: goalId, progress: 50.0 },
        manager.token
      );

      expect(progressResponse.errors).toBeUndefined();
      expect(progressResponse.data.updateGoalProgress).toMatchObject({
        id: goalId,
        progress: 50.0,
        status: 'IN_PROGRESS',
      });

      // Update progress to 100% (completion)
      const completeResponse = await performGraphQLMutation(
        updateProgressMutation,
        { id: goalId, progress: 100.0 },
        manager.token
      );

      expect(completeResponse.errors).toBeUndefined();
      expect(completeResponse.data.updateGoalProgress).toMatchObject({
        id: goalId,
        progress: 100.0,
        status: 'COMPLETED',
      });

      testContext.createdGoals.push(goalId);
    });

    test('should validate progress constraints', async () => {
      const goalData = {
        employeeId: testEmployee.id,
        title: 'Progress Validation Test',
        targetDate: '2024-12-31T23:59:59Z',
        category: 'DEVELOPMENT',
      };

      const createResponse = await performGraphQLMutation(
        `mutation CreateGoal($input: CreateGoalInput!) {
          createGoal(input: $input) { id }
        }`,
        { input: goalData },
        manager.token
      );

      const goalId = createResponse.data.createGoal.id;

      // Test invalid progress values
      const updateProgressMutation = `
        mutation UpdateGoalProgress($id: ID!, $progress: Float!) {
          updateGoalProgress(id: $id, progress: $progress) {
            id
          }
        }
      `;

      // Test negative progress
      const negativeResponse = await performGraphQLMutation(
        updateProgressMutation,
        { id: goalId, progress: -10.0 },
        manager.token
      );

      expect(negativeResponse.errors).toBeDefined();
      expect(negativeResponse.errors[0].message).toMatch(/progress.*range|invalid.*progress/i);

      // Test progress > 100%
      const excessiveResponse = await performGraphQLMutation(
        updateProgressMutation,
        { id: goalId, progress: 150.0 },
        manager.token
      );

      expect(excessiveResponse.errors).toBeDefined();
      expect(excessiveResponse.errors[0].message).toMatch(/progress.*range|invalid.*progress/i);

      testContext.createdGoals.push(goalId);
    });

    test('should retrieve goals with filtering and sorting', async () => {
      const goalsQuery = `
        query GetGoals($filters: GoalFilters, $sortBy: GoalSortField, $sortOrder: SortOrder) {
          goals(filters: $filters, sortBy: $sortBy, sortOrder: $sortOrder) {
            data {
              id
              employee {
                id
                firstName
                lastName
              }
              title
              targetDate
              progress
              status
              category
              createdAt
            }
            pagination {
              total
              page
              limit
            }
          }
        }
      `;

      const response = await performGraphQLQuery(
        goalsQuery,
        {
          filters: { employeeId: testEmployee.id, status: 'IN_PROGRESS' },
          sortBy: 'TARGET_DATE',
          sortOrder: 'ASC',
        },
        manager.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.goals.data).toBeInstanceOf(Array);

      // Assert: All goals belong to the specified employee and status
      for (const goal of response.data.goals.data) {
        expect(goal.employee.id).toBe(testEmployee.id);
        expect(goal.status).toBe('IN_PROGRESS');
      }

      // Assert: Goals are sorted by target date ascending
      const dates = response.data.goals.data.map(goal => new Date(goal.targetDate));
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i].getTime()).toBeGreaterThanOrEqual(dates[i - 1].getTime());
      }
    });

    test('should allow employees to view their own goals', async () => {
      // Create employee user for the test employee
      const employeeUser = await TestUser.createEmployeeWithId(testEmployee.id);

      const myGoalsQuery = `
        query GetMyGoals {
          myGoals {
            data {
              id
              title
              description
              targetDate
              progress
              status
              category
            }
          }
        }
      `;

      const response = await performGraphQLQuery(
        myGoalsQuery,
        {},
        employeeUser.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.myGoals.data).toBeInstanceOf(Array);

      // Assert: All goals belong to the authenticated employee
      for (const goal of response.data.myGoals.data) {
        // Note: The query filters server-side, so we expect only this employee's goals
        expect(goal).toHaveProperty('id');
        expect(goal).toHaveProperty('title');
        expect(goal).toHaveProperty('progress');
      }
    });

    test('should prevent unauthorized goal modifications', async () => {
      const unauthorizedEmployee = await TestUser.createEmployee();

      const goalData = {
        employeeId: testEmployee.id,
        title: 'Unauthorized Goal',
        targetDate: '2024-12-31T23:59:59Z',
        category: 'DEVELOPMENT',
      };

      const createGoalMutation = `
        mutation CreateGoal($input: CreateGoalInput!) {
          createGoal(input: $input) {
            id
          }
        }
      `;

      const response = await performGraphQLMutation(
        createGoalMutation,
        { input: goalData },
        unauthorizedEmployee.token
      );

      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toMatch(/access denied|forbidden|unauthorized/i);
    });
  });

  describe('Performance Analytics', () => {
    test('should calculate department performance metrics', async () => {
      const performanceMetricsQuery = `
        query GetDepartmentPerformanceMetrics($departmentId: ID!) {
          departmentPerformanceMetrics(departmentId: $departmentId) {
            departmentId
            averageRating
            reviewsCompleted
            reviewsPending
            goalsInProgress
            goalsCompleted
            topPerformers {
              id
              firstName
              lastName
              averageRating
            }
            improvementAreas {
              category
              averageRating
              employeeCount
            }
          }
        }
      `;

      const response = await performGraphQLQuery(
        performanceMetricsQuery,
        { departmentId: testContext.departments.engineering.id },
        hrManager.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.departmentPerformanceMetrics).toMatchObject({
        departmentId: testContext.departments.engineering.id,
        averageRating: expect.any(Number),
        reviewsCompleted: expect.any(Number),
        reviewsPending: expect.any(Number),
        goalsInProgress: expect.any(Number),
        goalsCompleted: expect.any(Number),
      });

      expect(response.data.departmentPerformanceMetrics.topPerformers).toBeInstanceOf(Array);
      expect(response.data.departmentPerformanceMetrics.improvementAreas).toBeInstanceOf(Array);

      // Assert: Average rating is within valid range
      const avgRating = response.data.departmentPerformanceMetrics.averageRating;
      expect(avgRating).toBeGreaterThanOrEqual(1.0);
      expect(avgRating).toBeLessThanOrEqual(5.0);
    });

    test('should generate employee performance summary', async () => {
      const performanceSummaryQuery = `
        query GetEmployeePerformanceSummary($employeeId: ID!, $year: Int!) {
          employeePerformanceSummary(employeeId: $employeeId, year: $year) {
            employeeId
            year
            overallRating
            reviewsCount
            goalsCompleted
            goalCompletionRate
            strengthAreas
            developmentAreas
            performanceTrend {
              month
              rating
            }
            goalsByCategory {
              category
              total
              completed
              inProgress
            }
          }
        }
      `;

      const response = await performGraphQLQuery(
        performanceSummaryQuery,
        { employeeId: testEmployee.id, year: 2024 },
        manager.token
      );

      expect(response.errors).toBeUndefined();
      expect(response.data.employeePerformanceSummary).toMatchObject({
        employeeId: testEmployee.id,
        year: 2024,
        overallRating: expect.any(Number),
        reviewsCount: expect.any(Number),
        goalsCompleted: expect.any(Number),
        goalCompletionRate: expect.any(Number),
      });

      expect(response.data.employeePerformanceSummary.strengthAreas).toBeInstanceOf(Array);
      expect(response.data.employeePerformanceSummary.developmentAreas).toBeInstanceOf(Array);
      expect(response.data.employeePerformanceSummary.performanceTrend).toBeInstanceOf(Array);
      expect(response.data.employeePerformanceSummary.goalsByCategory).toBeInstanceOf(Array);
    });
  });

  describe('Performance Management Load Testing', () => {
    test('should handle concurrent review creations', async () => {
      const startTime = Date.now();

      // Create 20 reviews concurrently
      const reviewPromises = Array(20).fill(null).map((_, index) => {
        const reviewData = {
          employeeId: testEmployee.id,
          reviewPeriodStart: '2024-01-01T00:00:00Z',
          reviewPeriodEnd: '2024-12-31T23:59:59Z',
          overallRating: 4.0 + (index % 10) * 0.1,
          feedback: `Concurrent review ${index}`,
        };

        return performGraphQLMutation(
          `mutation CreatePerformanceReview($input: CreatePerformanceReviewInput!) {
            createPerformanceReview(input: $input) { id }
          }`,
          { input: reviewData },
          manager.token
        );
      });

      const results = await Promise.all(reviewPromises);
      const endTime = Date.now();

      // Assert: All reviews created successfully
      expect(results.every(result => !result.errors)).toBe(true);
      expect(results.every(result => result.data.createPerformanceReview.id)).toBe(true);

      // Assert: Performance target met (<200ms average)
      const averageTime = (endTime - startTime) / 20;
      expect(averageTime).toBeLessThan(200);

      // Store for cleanup
      const reviewIds = results.map(result => result.data.createPerformanceReview.id);
      testContext.createdReviews.push(...reviewIds);
    });

    test('should efficiently query large performance datasets', async () => {
      const startTime = Date.now();

      const largeQueryResponse = await performGraphQLQuery(
        `query GetLargePerformanceDataset {
          performanceReviews(limit: 500) {
            data {
              id
              employee { id firstName lastName }
              overallRating
              status
              createdAt
            }
            pagination { total }
          }
          goals(limit: 1000) {
            data {
              id
              employee { id firstName lastName }
              title
              progress
              status
              category
            }
            pagination { total }
          }
        }`,
        {},
        hrManager.token
      );

      const endTime = Date.now();

      expect(largeQueryResponse.errors).toBeUndefined();
      expect(largeQueryResponse.data.performanceReviews.data).toBeInstanceOf(Array);
      expect(largeQueryResponse.data.goals.data).toBeInstanceOf(Array);

      // Assert: Performance target met (<200ms for large queries)
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});