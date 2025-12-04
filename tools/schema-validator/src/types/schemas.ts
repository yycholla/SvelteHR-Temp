/**
 * Zod validation schemas for runtime type checking
 */

import { z } from 'zod';

/**
 * Field reference schema (with explicit type for recursive definition)
 * Note: With exactOptionalPropertyTypes, optional properties have Type | undefined
 */
export const FieldReferenceSchema: z.ZodType<{
  name: string;
  graphqlType: string;
  nullable: boolean;
  isList: boolean;
  children: Array<any>;
  alias?: string | undefined;
}> = z.object({
  name: z.string().min(1),
  graphqlType: z.string().min(1),
  nullable: z.boolean(),
  isList: z.boolean(),
  children: z.lazy(() => z.array(FieldReferenceSchema)),
  alias: z.string().optional(),
});

/**
 * Variable definition schema
 */
export const VariableDefinitionSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean(),
  defaultValue: z.unknown().optional(),
});

/**
 * GraphQL operation schema
 */
export const GraphQLOperationSchema = z.object({
  name: z.string().min(1),
  operationType: z.enum(['query', 'mutation', 'subscription']),
  selections: z.array(FieldReferenceSchema),
  variables: z.array(VariableDefinitionSchema),
  filePath: z.string().min(1),
  line: z.number().int().positive(),
  column: z.number().int().nonnegative(),
});

/**
 * Database column schema
 */
export const DatabaseColumnSchema = z.object({
  tableName: z.string().min(1),
  columnName: z.string().min(1),
  pgType: z.string().min(1),
  graphqlType: z.string().min(1),
  nullable: z.boolean(),
  isArray: z.boolean(),
  isPrimaryKey: z.boolean(),
  foreignKey: z
    .object({
      table: z.string().min(1),
      column: z.string().min(1),
    })
    .optional(),
  defaultValue: z.string().optional(),
});

/**
 * Argument info schema
 */
export const ArgumentInfoSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  nullable: z.boolean(),
  defaultValue: z.unknown().optional(),
});

/**
 * API field schema
 */
export const ApiFieldSchema = z.object({
  parentType: z.string().min(1),
  fieldName: z.string().min(1),
  graphqlType: z.string().min(1),
  nullable: z.boolean(),
  isList: z.boolean(),
  args: z.array(ArgumentInfoSchema),
  resolverLocation: z
    .object({
      file: z.string().min(1),
      line: z.number().int().positive(),
    })
    .optional(),
  alias: z.string().optional(),
});

/**
 * Source location schema
 */
export const SourceLocationSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive(),
  column: z.number().int().nonnegative(),
  snippet: z.string().optional(),
});

/**
 * Field alignment schema
 */
export const FieldAlignmentSchema = z.object({
  fieldPath: z.string().min(1),
  graphqlField: FieldReferenceSchema,
  dbColumn: DatabaseColumnSchema.optional(),
  apiField: ApiFieldSchema.optional(),
  status: z.enum(['aligned', 'missing_db', 'missing_api', 'type_mismatch', 'nullability_mismatch']),
  error: z.string().optional(),
  suggestion: z.string().optional(),
  sourceLocation: SourceLocationSchema,
});

/**
 * Schema snapshot schema
 */
export const SchemaSnapshotSchema = z.object({
  timestamp: z.date(),
  databaseSchema: z.array(DatabaseColumnSchema),
  apiSchema: z.array(ApiFieldSchema),
  operations: z.map(z.string(), z.array(GraphQLOperationSchema)),
  databaseHash: z.string().length(64), // SHA-256 hex
  apiHash: z.string().length(64),
  operationsHash: z.string().length(64),
});

/**
 * Validation run schema
 */
export const ValidationRunSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  runType: z.enum(['full', 'incremental', 'cached']),
  commit: z.string().optional(),
  alignedCount: z.number().int().nonnegative(),
  misalignedCount: z.number().int().nonnegative(),
  totalFields: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  passed: z.boolean(),
});

/**
 * Computed field config schema
 */
export const ComputedFieldConfigSchema = z.object({
  fieldPath: z.string().min(1),
  sourceColumns: z.array(z.string().min(1)).min(1),
  resolverLocation: z.object({
    file: z.string().min(1),
    line: z.number().int().positive(),
  }),
  description: z.string().min(1),
  returnType: z.string().min(1),
});

/**
 * Schema validator config schema
 */
export const SchemaValidatorConfigSchema = z.object({
  databaseUrl: z
    .string()
    .refine((val) => val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL or empty string',
    }),
  apiUrl: z
    .string()
    .refine((val) => val === '' || z.string().url().safeParse(val).success, {
      message: 'Must be a valid URL or empty string',
    }),
  graphqlPaths: z.array(z.string().min(1)).min(1),
  cacheDir: z.string().min(1),
  cacheTtl: z.number().int().positive(),
  computedFields: z.array(ComputedFieldConfigSchema),
  typeMappings: z.record(z.string(), z.string()).optional(),
  strict: z.boolean(),
  ignore: z.array(z.string()),
});

/**
 * Validation error schema
 */
export const ValidationErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  fieldPath: z.string().min(1),
  location: SourceLocationSchema,
  severity: z.enum(['error', 'warning', 'info']),
  suggestion: z.string().optional(),
  context: z.record(z.unknown()).optional(),
});

/**
 * Type for validated GraphQL operation
 */
export type ValidatedGraphQLOperation = z.infer<typeof GraphQLOperationSchema>;

/**
 * Type for validated database column
 */
export type ValidatedDatabaseColumn = z.infer<typeof DatabaseColumnSchema>;

/**
 * Type for validated API field
 */
export type ValidatedApiField = z.infer<typeof ApiFieldSchema>;

/**
 * Type for validated field alignment
 */
export type ValidatedFieldAlignment = z.infer<typeof FieldAlignmentSchema>;

/**
 * Type for validated config
 */
export type ValidatedSchemaValidatorConfig = z.infer<typeof SchemaValidatorConfigSchema>;
