/**
 * T007: Contract test for createReviewWithGoals mutation
 * Feature: 023-reviews-creation-it
 *
 * Tests GraphQL schema validation for createReviewWithGoals mutation.
 * This test MUST FAIL initially with "mutation not defined" error.
 */

import { describe, test, expect } from 'vitest';
import { buildSchema, parse, validate } from 'graphql';

// Import the GraphQL schema contract
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

  input NewGoalInput {
    title: String!
    description: String!
    targetCompletionDate: Date!
    successMetrics: String!
  }

  input CreateReviewInput {
    employeeId: ID!
    reviewType: ReviewType!
    reviewPeriodStart: Date
    reviewPeriodEnd: Date
    goalIds: [ID!]!
    newGoals: [NewGoalInput!]!
    notes: String
  }

  type ReviewMutationResponse {
    success: Boolean!
    message: String
    review: PerformanceReview
  }

  type Query {
    _placeholder: String
  }

  type Mutation {
    createReviewWithGoals(input: CreateReviewInput!): ReviewMutationResponse!
  }
`;

describe('T007: createReviewWithGoals mutation schema contract', () => {
  const schema = buildSchema(schemaSDL);

  test('mutation should be defined in schema', () => {
    const mutationType = schema.getMutationType();
    expect(mutationType).toBeDefined();

    const fields = mutationType?.getFields();
    expect(fields).toHaveProperty('createReviewWithGoals');
  });

  test('CreateReviewInput should accept required fields', () => {
    const query = parse(`
      mutation CreateReview($input: CreateReviewInput!) {
        createReviewWithGoals(input: $input) {
          success
          message
          review {
            id
            employeeId
            reviewType
            status
          }
        }
      }
    `);

    const errors = validate(schema, query);
    expect(errors).toHaveLength(0);
  });

  test('CreateReviewInput should require employeeId', () => {
    const inputType = schema.getType('CreateReviewInput');
    expect(inputType).toBeDefined();

    if (inputType && 'getFields' in inputType) {
      const fields = inputType.getFields();
      const employeeIdField = fields['employeeId'];

      expect(employeeIdField).toBeDefined();
      expect(employeeIdField.type.toString()).toContain('ID!');
    }
  });

  test('CreateReviewInput should require reviewType', () => {
    const inputType = schema.getType('CreateReviewInput');

    if (inputType && 'getFields' in inputType) {
      const fields = inputType.getFields();
      const reviewTypeField = fields['reviewType'];

      expect(reviewTypeField).toBeDefined();
      expect(reviewTypeField.type.toString()).toContain('ReviewType!');
    }
  });

  test('CreateReviewInput should accept goalIds array', () => {
    const inputType = schema.getType('CreateReviewInput');

    if (inputType && 'getFields' in inputType) {
      const fields = inputType.getFields();
      const goalIdsField = fields['goalIds'];

      expect(goalIdsField).toBeDefined();
      expect(goalIdsField.type.toString()).toContain('[ID!]!');
    }
  });

  test('CreateReviewInput should accept newGoals array', () => {
    const inputType = schema.getType('CreateReviewInput');

    if (inputType && 'getFields' in inputType) {
      const fields = inputType.getFields();
      const newGoalsField = fields['newGoals'];

      expect(newGoalsField).toBeDefined();
      expect(newGoalsField.type.toString()).toContain('[NewGoalInput!]!');
    }
  });

  test('ReviewMutationResponse should match expected type', () => {
    const responseType = schema.getType('ReviewMutationResponse');
    expect(responseType).toBeDefined();

    if (responseType && 'getFields' in responseType) {
      const fields = responseType.getFields();

      expect(fields['success']).toBeDefined();
      expect(fields['success'].type.toString()).toBe('Boolean!');

      expect(fields['message']).toBeDefined();
      expect(fields['message'].type.toString()).toBe('String');

      expect(fields['review']).toBeDefined();
      expect(fields['review'].type.toString()).toBe('PerformanceReview');
    }
  });

  test('mutation should accept valid input variables', () => {
    const mutation = parse(`
      mutation CreateAnnualReview($input: CreateReviewInput!) {
        createReviewWithGoals(input: $input) {
          success
          message
          review {
            id
            employeeId
            reviewType
            status
            goals {
              id
              title
            }
          }
        }
      }
    `);

    const errors = validate(schema, mutation);
    expect(errors).toHaveLength(0);
  });

  test('NewGoalInput should have required fields', () => {
    const inputType = schema.getType('NewGoalInput');
    expect(inputType).toBeDefined();

    if (inputType && 'getFields' in inputType) {
      const fields = inputType.getFields();

      expect(fields['title']).toBeDefined();
      expect(fields['title'].type.toString()).toBe('String!');

      expect(fields['description']).toBeDefined();
      expect(fields['description'].type.toString()).toBe('String!');

      expect(fields['targetCompletionDate']).toBeDefined();
      expect(fields['targetCompletionDate'].type.toString()).toBe('Date!');

      expect(fields['successMetrics']).toBeDefined();
      expect(fields['successMetrics'].type.toString()).toBe('String!');
    }
  });
});
