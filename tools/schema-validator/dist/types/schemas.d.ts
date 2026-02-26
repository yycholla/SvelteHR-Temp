/**
 * Zod validation schemas for runtime type checking
 */
import { z } from 'zod';
/**
 * Field reference schema (with explicit type for recursive definition)
 * Note: With exactOptionalPropertyTypes, optional properties have Type | undefined
 */
export declare const FieldReferenceSchema: z.ZodType<{
  name: string;
  graphqlType: string;
  nullable: boolean;
  isList: boolean;
  children: Array<any>;
  alias?: string | undefined;
}>;
/**
 * Variable definition schema
 */
export declare const VariableDefinitionSchema: z.ZodObject<
  {
    name: z.ZodString;
    type: z.ZodString;
    nullable: z.ZodBoolean;
    defaultValue: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
/**
 * GraphQL operation schema
 */
export declare const GraphQLOperationSchema: z.ZodObject<
  {
    name: z.ZodString;
    operationType: z.ZodEnum<{
      query: 'query';
      mutation: 'mutation';
      subscription: 'subscription';
    }>;
    selections: z.ZodArray<
      z.ZodType<
        {
          name: string;
          graphqlType: string;
          nullable: boolean;
          isList: boolean;
          children: Array<any>;
          alias?: string | undefined;
        },
        unknown,
        z.core.$ZodTypeInternals<
          {
            name: string;
            graphqlType: string;
            nullable: boolean;
            isList: boolean;
            children: Array<any>;
            alias?: string | undefined;
          },
          unknown
        >
      >
    >;
    variables: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          type: z.ZodString;
          nullable: z.ZodBoolean;
          defaultValue: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
    filePath: z.ZodString;
    line: z.ZodNumber;
    column: z.ZodNumber;
  },
  z.core.$strip
>;
/**
 * Database column schema
 */
export declare const DatabaseColumnSchema: z.ZodObject<
  {
    tableName: z.ZodString;
    columnName: z.ZodString;
    pgType: z.ZodString;
    graphqlType: z.ZodString;
    nullable: z.ZodBoolean;
    isArray: z.ZodBoolean;
    isPrimaryKey: z.ZodBoolean;
    foreignKey: z.ZodOptional<
      z.ZodObject<
        {
          table: z.ZodString;
          column: z.ZodString;
        },
        z.core.$strip
      >
    >;
    defaultValue: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
/**
 * Argument info schema
 */
export declare const ArgumentInfoSchema: z.ZodObject<
  {
    name: z.ZodString;
    type: z.ZodString;
    nullable: z.ZodBoolean;
    defaultValue: z.ZodOptional<z.ZodUnknown>;
  },
  z.core.$strip
>;
/**
 * API field schema
 */
export declare const ApiFieldSchema: z.ZodObject<
  {
    parentType: z.ZodString;
    fieldName: z.ZodString;
    graphqlType: z.ZodString;
    nullable: z.ZodBoolean;
    isList: z.ZodBoolean;
    args: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          type: z.ZodString;
          nullable: z.ZodBoolean;
          defaultValue: z.ZodOptional<z.ZodUnknown>;
        },
        z.core.$strip
      >
    >;
    resolverLocation: z.ZodOptional<
      z.ZodObject<
        {
          file: z.ZodString;
          line: z.ZodNumber;
        },
        z.core.$strip
      >
    >;
    alias: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
/**
 * Source location schema
 */
export declare const SourceLocationSchema: z.ZodObject<
  {
    file: z.ZodString;
    line: z.ZodNumber;
    column: z.ZodNumber;
    snippet: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
/**
 * Field alignment schema
 */
export declare const FieldAlignmentSchema: z.ZodObject<
  {
    fieldPath: z.ZodString;
    graphqlField: z.ZodType<
      {
        name: string;
        graphqlType: string;
        nullable: boolean;
        isList: boolean;
        children: Array<any>;
        alias?: string | undefined;
      },
      unknown,
      z.core.$ZodTypeInternals<
        {
          name: string;
          graphqlType: string;
          nullable: boolean;
          isList: boolean;
          children: Array<any>;
          alias?: string | undefined;
        },
        unknown
      >
    >;
    dbColumn: z.ZodOptional<
      z.ZodObject<
        {
          tableName: z.ZodString;
          columnName: z.ZodString;
          pgType: z.ZodString;
          graphqlType: z.ZodString;
          nullable: z.ZodBoolean;
          isArray: z.ZodBoolean;
          isPrimaryKey: z.ZodBoolean;
          foreignKey: z.ZodOptional<
            z.ZodObject<
              {
                table: z.ZodString;
                column: z.ZodString;
              },
              z.core.$strip
            >
          >;
          defaultValue: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    apiField: z.ZodOptional<
      z.ZodObject<
        {
          parentType: z.ZodString;
          fieldName: z.ZodString;
          graphqlType: z.ZodString;
          nullable: z.ZodBoolean;
          isList: z.ZodBoolean;
          args: z.ZodArray<
            z.ZodObject<
              {
                name: z.ZodString;
                type: z.ZodString;
                nullable: z.ZodBoolean;
                defaultValue: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
          resolverLocation: z.ZodOptional<
            z.ZodObject<
              {
                file: z.ZodString;
                line: z.ZodNumber;
              },
              z.core.$strip
            >
          >;
          alias: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    status: z.ZodEnum<{
      aligned: 'aligned';
      missing_db: 'missing_db';
      missing_api: 'missing_api';
      type_mismatch: 'type_mismatch';
      nullability_mismatch: 'nullability_mismatch';
    }>;
    error: z.ZodOptional<z.ZodString>;
    suggestion: z.ZodOptional<z.ZodString>;
    sourceLocation: z.ZodObject<
      {
        file: z.ZodString;
        line: z.ZodNumber;
        column: z.ZodNumber;
        snippet: z.ZodOptional<z.ZodString>;
      },
      z.core.$strip
    >;
  },
  z.core.$strip
>;
/**
 * Schema snapshot schema
 */
export declare const SchemaSnapshotSchema: z.ZodObject<
  {
    timestamp: z.ZodDate;
    databaseSchema: z.ZodArray<
      z.ZodObject<
        {
          tableName: z.ZodString;
          columnName: z.ZodString;
          pgType: z.ZodString;
          graphqlType: z.ZodString;
          nullable: z.ZodBoolean;
          isArray: z.ZodBoolean;
          isPrimaryKey: z.ZodBoolean;
          foreignKey: z.ZodOptional<
            z.ZodObject<
              {
                table: z.ZodString;
                column: z.ZodString;
              },
              z.core.$strip
            >
          >;
          defaultValue: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    apiSchema: z.ZodArray<
      z.ZodObject<
        {
          parentType: z.ZodString;
          fieldName: z.ZodString;
          graphqlType: z.ZodString;
          nullable: z.ZodBoolean;
          isList: z.ZodBoolean;
          args: z.ZodArray<
            z.ZodObject<
              {
                name: z.ZodString;
                type: z.ZodString;
                nullable: z.ZodBoolean;
                defaultValue: z.ZodOptional<z.ZodUnknown>;
              },
              z.core.$strip
            >
          >;
          resolverLocation: z.ZodOptional<
            z.ZodObject<
              {
                file: z.ZodString;
                line: z.ZodNumber;
              },
              z.core.$strip
            >
          >;
          alias: z.ZodOptional<z.ZodString>;
        },
        z.core.$strip
      >
    >;
    operations: z.ZodMap<
      z.ZodString,
      z.ZodArray<
        z.ZodObject<
          {
            name: z.ZodString;
            operationType: z.ZodEnum<{
              query: 'query';
              mutation: 'mutation';
              subscription: 'subscription';
            }>;
            selections: z.ZodArray<
              z.ZodType<
                {
                  name: string;
                  graphqlType: string;
                  nullable: boolean;
                  isList: boolean;
                  children: Array<any>;
                  alias?: string | undefined;
                },
                unknown,
                z.core.$ZodTypeInternals<
                  {
                    name: string;
                    graphqlType: string;
                    nullable: boolean;
                    isList: boolean;
                    children: Array<any>;
                    alias?: string | undefined;
                  },
                  unknown
                >
              >
            >;
            variables: z.ZodArray<
              z.ZodObject<
                {
                  name: z.ZodString;
                  type: z.ZodString;
                  nullable: z.ZodBoolean;
                  defaultValue: z.ZodOptional<z.ZodUnknown>;
                },
                z.core.$strip
              >
            >;
            filePath: z.ZodString;
            line: z.ZodNumber;
            column: z.ZodNumber;
          },
          z.core.$strip
        >
      >
    >;
    databaseHash: z.ZodString;
    apiHash: z.ZodString;
    operationsHash: z.ZodString;
  },
  z.core.$strip
>;
/**
 * Validation run schema
 */
export declare const ValidationRunSchema: z.ZodObject<
  {
    id: z.ZodString;
    timestamp: z.ZodDate;
    runType: z.ZodEnum<{
      full: 'full';
      incremental: 'incremental';
      cached: 'cached';
    }>;
    commit: z.ZodOptional<z.ZodString>;
    alignedCount: z.ZodNumber;
    misalignedCount: z.ZodNumber;
    totalFields: z.ZodNumber;
    durationMs: z.ZodNumber;
    passed: z.ZodBoolean;
  },
  z.core.$strip
>;
/**
 * Computed field config schema
 */
export declare const ComputedFieldConfigSchema: z.ZodObject<
  {
    fieldPath: z.ZodString;
    sourceColumns: z.ZodArray<z.ZodString>;
    resolverLocation: z.ZodObject<
      {
        file: z.ZodString;
        line: z.ZodNumber;
      },
      z.core.$strip
    >;
    description: z.ZodString;
    returnType: z.ZodString;
  },
  z.core.$strip
>;
/**
 * Schema validator config schema
 */
export declare const SchemaValidatorConfigSchema: z.ZodObject<
  {
    databaseUrl: z.ZodString;
    apiUrl: z.ZodString;
    graphqlPaths: z.ZodArray<z.ZodString>;
    cacheDir: z.ZodString;
    cacheTtl: z.ZodNumber;
    computedFields: z.ZodArray<
      z.ZodObject<
        {
          fieldPath: z.ZodString;
          sourceColumns: z.ZodArray<z.ZodString>;
          resolverLocation: z.ZodObject<
            {
              file: z.ZodString;
              line: z.ZodNumber;
            },
            z.core.$strip
          >;
          description: z.ZodString;
          returnType: z.ZodString;
        },
        z.core.$strip
      >
    >;
    typeMappings: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    strict: z.ZodBoolean;
    ignore: z.ZodArray<z.ZodString>;
  },
  z.core.$strip
>;
/**
 * Validation error schema
 */
export declare const ValidationErrorSchema: z.ZodObject<
  {
    code: z.ZodString;
    message: z.ZodString;
    fieldPath: z.ZodString;
    location: z.ZodObject<
      {
        file: z.ZodString;
        line: z.ZodNumber;
        column: z.ZodNumber;
        snippet: z.ZodOptional<z.ZodString>;
      },
      z.core.$strip
    >;
    severity: z.ZodEnum<{
      error: 'error';
      warning: 'warning';
      info: 'info';
    }>;
    suggestion: z.ZodOptional<z.ZodString>;
    context: z.ZodOptional<z.ZodRecord<z.core.$ZodRecordKey, z.core.SomeType>>;
  },
  z.core.$strip
>;
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
//# sourceMappingURL=schemas.d.ts.map
