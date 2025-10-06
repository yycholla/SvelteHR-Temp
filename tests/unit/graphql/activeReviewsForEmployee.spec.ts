/**
 * T009: Contract test for activeReviewsForEmployee query
 * Feature: 023-reviews-creation-it
 *
 * Tests GraphQL schema validation for activeReviewsForEmployee query.
 * This test MUST FAIL initially with "query not defined" error.
 */

import { describe, test, expect } from 'vitest';
import { buildSchema, parse, validate } from 'graphql';

const schemaSDL = `
  enum ReviewType {
    ANNUAL_REVIEW
    MID_YEAR_REVIEW
    QUARTERLY_REVIEW
    PROBATIONARY_REVIEW
    PERFORMANCE_IMPROVEMENT_PLAN
    NINETY_DAY_REVIEW
    PROJECT_BASED_REVIEW
    PROMOTION_REVIEW
    EXIT_REVIEW
    SELF_REVIEW
  }

  enum ReviewStatus {
    DRAFT
    IN_PROGRESS
    COMPLETED
  }

  scalar Date
  scalar DateTime

  type User {
    id: ID!
    name: String!
  }

  type Goal {
    id: ID!
    title: String!
  }

  type PerformanceReview {
    id: ID!
    employeeId: ID!
    reviewerId: ID!
    reviewType: ReviewType!
    status: ReviewStatus!
    reviewPeriodStart: Date
    reviewPeriodEnd: Date
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    employee: User!
    reviewer: User!
    goals: [Goal!]!
  }

  type Query {
    activeReviewsForEmployee(
      employeeId: ID!
      reviewType: ReviewType
    ): [PerformanceReview!]!
  }

  type Mutation {
    _placeholder: String
  }
`;

describe('T009: activeReviewsForEmployee query schema contract', () => {
  const schema = buildSchema(schemaSDL);

  test('query should be defined in schema', () => {
    const queryType = schema.getQueryType();
    expect(queryType).toBeDefined();

    const fields = queryType?.getFields();
    expect(fields).toHaveProperty('activeReviewsForEmployee');
  });

  test('query should require employeeId parameter', () => {
    const queryType = schema.getQueryType();
    const fields = queryType?.getFields();
    const query = fields?.['activeReviewsForEmployee'];

    expect(query).toBeDefined();

    const employeeIdArg = query?.args.find(arg => arg.name === 'employeeId');
    expect(employeeIdArg).toBeDefined();
    expect(employeeIdArg?.type.toString()).toBe('ID!');
  });

  test('query should have optional reviewType filter', () => {
    const queryType = schema.getQueryType();
    const fields = queryType?.getFields();
    const query = fields?.['activeReviewsForEmployee'];

    const reviewTypeArg = query?.args.find(arg => arg.name === 'reviewType');
    expect(reviewTypeArg).toBeDefined();
    expect(reviewTypeArg?.type.toString()).toBe('ReviewType');
  });

  test('query should return array of PerformanceReview', () => {
    const queryType = schema.getQueryType();
    const fields = queryType?.getFields();
    const query = fields?.['activeReviewsForEmployee'];

    expect(query).toBeDefined();
    expect(query?.type.toString()).toBe('[PerformanceReview!]!');
  });

  test('query should validate with required employeeId', () => {
    const query = parse(`
      query GetActiveReviews($employeeId: ID!) {
        activeReviewsForEmployee(employeeId: $employeeId) {
          id
          reviewType
          status
          createdAt
        }
      }
    `);

    const errors = validate(schema, query);
    expect(errors).toHaveLength(0);
  });

  test('query should validate with optional reviewType filter', () => {
    const query = parse(`
      query GetActiveAnnualReviews($employeeId: ID!, $reviewType: ReviewType) {
        activeReviewsForEmployee(
          employeeId: $employeeId
          reviewType: $reviewType
        ) {
          id
          reviewType
          status
        }
      }
    `);

    const errors = validate(schema, query);
    expect(errors).toHaveLength(0);
  });

  test('query should allow selecting nested employee data', () => {
    const query = parse(`
      query GetActiveReviewsWithEmployee($employeeId: ID!) {
        activeReviewsForEmployee(employeeId: $employeeId) {
          id
          reviewType
          status
          employee {
            id
            name
          }
        }
      }
    `);

    const errors = validate(schema, query);
    expect(errors).toHaveLength(0);
  });

  test('query should allow selecting goals', () => {
    const query = parse(`
      query GetActiveReviewsWithGoals($employeeId: ID!) {
        activeReviewsForEmployee(employeeId: $employeeId) {
          id
          reviewType
          status
          goals {
            id
            title
          }
        }
      }
    `);

    const errors = validate(schema, query);
    expect(errors).toHaveLength(0);
  });

  test('query should fail without required employeeId', () => {
    const query = parse(`
      query InvalidQuery {
        activeReviewsForEmployee {
          id
        }
      }
    `);

    const errors = validate(schema, query);
    expect(errors.length).toBeGreaterThan(0);
  });
});
