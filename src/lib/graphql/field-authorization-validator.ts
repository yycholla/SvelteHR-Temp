/**
 * Field-Level Authorization Validator for GraphQL
 *
 * Provides comprehensive field-level authorization validation for GraphQL operations.
 * Works with PostGraphile RLS (Row Level Security) and RBAC systems to ensure
 * proper access control at the field level.
 *
 * Refactored: Moved to src/lib/graphql/validation/
 */

import { FieldAuthorizationValidator } from './validation/validator';

export * from './validation/types';
export * from './validation/rules';
export * from './validation/evaluators';
export * from './validation/sensitivity';
export * from './validation/validator';

export default FieldAuthorizationValidator;
