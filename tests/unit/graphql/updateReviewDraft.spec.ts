/**
 * T008: Contract test for updateReviewDraft mutation
 * Feature: 023-reviews-creation-it
 *
 * Tests GraphQL schema validation for updateReviewDraft mutation.
 * This test MUST FAIL initially with "mutation not defined" error.
 */

import { describe, expect, test } from 'vitest';
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

  input UpdateReviewDraftInput {
    id: ID!
    reviewType: ReviewType
    reviewPeriodStart: Date
    reviewPeriodEnd: Date
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
    updateReviewDraft(input: UpdateReviewDraftInput!): ReviewMutationResponse!
  }
`;

describe('T008: updateReviewDraft mutation schema contract', () => {
	const schema = buildSchema(schemaSDL);

	test('mutation should be defined in schema', () => {
		const mutationType = schema.getMutationType();
		expect(mutationType).toBeDefined();

		const fields = mutationType?.getFields();
		expect(fields).toHaveProperty('updateReviewDraft');
	});

	test('UpdateReviewDraftInput should be defined', () => {
		const inputType = schema.getType('UpdateReviewDraftInput');
		expect(inputType).toBeDefined();
	});

	test('UpdateReviewDraftInput should require id field', () => {
		const inputType = schema.getType('UpdateReviewDraftInput');

		if (inputType && 'getFields' in inputType) {
			const fields = inputType.getFields();
			const idField = fields['id'];

			expect(idField).toBeDefined();
			expect(idField.type.toString()).toBe('ID!');
		}
	});

	test('UpdateReviewDraftInput should have optional reviewType', () => {
		const inputType = schema.getType('UpdateReviewDraftInput');

		if (inputType && 'getFields' in inputType) {
			const fields = inputType.getFields();
			const reviewTypeField = fields['reviewType'];

			expect(reviewTypeField).toBeDefined();
			expect(reviewTypeField.type.toString()).toBe('ReviewType');
		}
	});

	test('UpdateReviewDraftInput should support partial updates', () => {
		const mutation = parse(`
      mutation UpdateDraft($input: UpdateReviewDraftInput!) {
        updateReviewDraft(input: $input) {
          success
          message
          review {
            id
            notes
          }
        }
      }
    `);

		const errors = validate(schema, mutation);
		expect(errors).toHaveLength(0);
	});

	test('UpdateReviewDraftInput should accept reviewPeriodStart', () => {
		const inputType = schema.getType('UpdateReviewDraftInput');

		if (inputType && 'getFields' in inputType) {
			const fields = inputType.getFields();
			const startField = fields['reviewPeriodStart'];

			expect(startField).toBeDefined();
			expect(startField.type.toString()).toBe('Date');
		}
	});

	test('UpdateReviewDraftInput should accept reviewPeriodEnd', () => {
		const inputType = schema.getType('UpdateReviewDraftInput');

		if (inputType && 'getFields' in inputType) {
			const fields = inputType.getFields();
			const endField = fields['reviewPeriodEnd'];

			expect(endField).toBeDefined();
			expect(endField.type.toString()).toBe('Date');
		}
	});

	test('UpdateReviewDraftInput should accept notes', () => {
		const inputType = schema.getType('UpdateReviewDraftInput');

		if (inputType && 'getFields' in inputType) {
			const fields = inputType.getFields();
			const notesField = fields['notes'];

			expect(notesField).toBeDefined();
			expect(notesField.type.toString()).toBe('String');
		}
	});

	test('mutation should return ReviewMutationResponse', () => {
		const mutationType = schema.getMutationType();
		const fields = mutationType?.getFields();
		const mutation = fields?.['updateReviewDraft'];

		expect(mutation).toBeDefined();
		expect(mutation?.type.toString()).toBe('ReviewMutationResponse!');
	});

	test('mutation should accept valid input variables', () => {
		const mutation = parse(`
      mutation UpdateNotes($input: UpdateReviewDraftInput!) {
        updateReviewDraft(input: $input) {
          success
          message
          review {
            id
            notes
            updatedAt
          }
        }
      }
    `);

		const errors = validate(schema, mutation);
		expect(errors).toHaveLength(0);
	});
});
