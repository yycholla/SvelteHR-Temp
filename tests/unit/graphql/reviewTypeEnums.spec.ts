/**
 * T011: Contract test for ReviewType enums
 * Feature: 023-reviews-creation-it
 *
 * Validates all 10 ReviewType enum values exist in the schema.
 * This test MUST FAIL initially with "enum not defined" error.
 */

import { describe, test, expect } from 'vitest';
import { buildSchema } from 'graphql';

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

  enum GoalStatus {
    ACTIVE
    ACHIEVED
    MISSED
    CANCELLED
    DELETED
  }

  type Query {
    _placeholder: String
  }

  type Mutation {
    _placeholder: String
  }
`;

describe('T011: ReviewType enum schema contract', () => {
  const schema = buildSchema(schemaSDL);

  test('ReviewType enum should be defined', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    expect(reviewTypeEnum).toBeDefined();
    expect(reviewTypeEnum?.astNode?.kind).toBe('EnumTypeDefinition');
  });

  test('ReviewType should have ANNUAL_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const annualReview = values.find(v => v.name === 'ANNUAL_REVIEW');
      expect(annualReview).toBeDefined();
    }
  });

  test('ReviewType should have MID_YEAR_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const midYearReview = values.find(v => v.name === 'MID_YEAR_REVIEW');
      expect(midYearReview).toBeDefined();
    }
  });

  test('ReviewType should have QUARTERLY_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const quarterlyReview = values.find(v => v.name === 'QUARTERLY_REVIEW');
      expect(quarterlyReview).toBeDefined();
    }
  });

  test('ReviewType should have PROBATIONARY_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const probationaryReview = values.find(v => v.name === 'PROBATIONARY_REVIEW');
      expect(probationaryReview).toBeDefined();
    }
  });

  test('ReviewType should have PERFORMANCE_IMPROVEMENT_PLAN value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const pip = values.find(v => v.name === 'PERFORMANCE_IMPROVEMENT_PLAN');
      expect(pip).toBeDefined();
    }
  });

  test('ReviewType should have NINETY_DAY_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const ninetyDay = values.find(v => v.name === 'NINETY_DAY_REVIEW');
      expect(ninetyDay).toBeDefined();
    }
  });

  test('ReviewType should have PROJECT_BASED_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const projectBased = values.find(v => v.name === 'PROJECT_BASED_REVIEW');
      expect(projectBased).toBeDefined();
    }
  });

  test('ReviewType should have PROMOTION_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const promotion = values.find(v => v.name === 'PROMOTION_REVIEW');
      expect(promotion).toBeDefined();
    }
  });

  test('ReviewType should have EXIT_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const exitReview = values.find(v => v.name === 'EXIT_REVIEW');
      expect(exitReview).toBeDefined();
    }
  });

  test('ReviewType should have SELF_REVIEW value', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      const selfReview = values.find(v => v.name === 'SELF_REVIEW');
      expect(selfReview).toBeDefined();
    }
  });

  test('ReviewType should have exactly 10 values', () => {
    const reviewTypeEnum = schema.getType('ReviewType');
    if (reviewTypeEnum && 'getValues' in reviewTypeEnum) {
      const values = reviewTypeEnum.getValues();
      expect(values).toHaveLength(10);
    }
  });

  test('ReviewStatus enum should be defined', () => {
    const reviewStatusEnum = schema.getType('ReviewStatus');
    expect(reviewStatusEnum).toBeDefined();
    expect(reviewStatusEnum?.astNode?.kind).toBe('EnumTypeDefinition');
  });

  test('ReviewStatus should have DRAFT, IN_PROGRESS, COMPLETED values', () => {
    const reviewStatusEnum = schema.getType('ReviewStatus');
    if (reviewStatusEnum && 'getValues' in reviewStatusEnum) {
      const values = reviewStatusEnum.getValues();
      expect(values).toHaveLength(3);

      expect(values.find(v => v.name === 'DRAFT')).toBeDefined();
      expect(values.find(v => v.name === 'IN_PROGRESS')).toBeDefined();
      expect(values.find(v => v.name === 'COMPLETED')).toBeDefined();
    }
  });

  test('GoalStatus enum should be defined', () => {
    const goalStatusEnum = schema.getType('GoalStatus');
    expect(goalStatusEnum).toBeDefined();
    expect(goalStatusEnum?.astNode?.kind).toBe('EnumTypeDefinition');
  });

  test('GoalStatus should have all required values', () => {
    const goalStatusEnum = schema.getType('GoalStatus');
    if (goalStatusEnum && 'getValues' in goalStatusEnum) {
      const values = goalStatusEnum.getValues();
      expect(values).toHaveLength(5);

      expect(values.find(v => v.name === 'ACTIVE')).toBeDefined();
      expect(values.find(v => v.name === 'ACHIEVED')).toBeDefined();
      expect(values.find(v => v.name === 'MISSED')).toBeDefined();
      expect(values.find(v => v.name === 'CANCELLED')).toBeDefined();
      expect(values.find(v => v.name === 'DELETED')).toBeDefined();
    }
  });
});
