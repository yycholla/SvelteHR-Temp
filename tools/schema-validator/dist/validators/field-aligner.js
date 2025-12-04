/**
 * Field Alignment Logic
 * Helper functions for aligning fields across GraphQL, Database, and API layers
 */
import { AlignmentStatus } from '../types/enums.js';
/**
 * Align a single field across all three layers
 */
export function alignField(
  graphqlField,
  dbColumn,
  apiField,
  fieldPath,
  sourceFile,
  sourceLine,
  sourceColumn,
  typeComparator
) {
  const status = computeAlignmentStatus(graphqlField, dbColumn, apiField, typeComparator);
  const error = generateErrorMessage(status, fieldPath, graphqlField, dbColumn, apiField);
  const suggestion = generateSuggestion(
    status,
    fieldPath,
    graphqlField,
    dbColumn,
    apiField,
    typeComparator
  );
  return {
    fieldPath,
    graphqlField,
    ...(dbColumn ? { dbColumn } : {}),
    ...(apiField ? { apiField } : {}),
    status,
    ...(error ? { error } : {}),
    ...(suggestion ? { suggestion } : {}),
    sourceLocation: {
      file: sourceFile,
      line: sourceLine,
      column: sourceColumn,
    },
  };
}
/**
 * Compute alignment status based on field presence and type compatibility
 */
export function computeAlignmentStatus(graphqlField, dbColumn, apiField, typeComparator) {
  // Check if field exists in all layers
  if (!dbColumn) {
    return AlignmentStatus.MissingDb;
  }
  if (!apiField) {
    return AlignmentStatus.MissingApi;
  }
  // Both exist - check type compatibility
  const typeComparison = typeComparator.compareTypes(
    graphqlField.graphqlType,
    dbColumn.pgType,
    apiField.graphqlType
  );
  if (!typeComparison.compatible) {
    // Check if it's specifically a nullability issue
    if (typeComparison.nullabilityMatches === false) {
      return AlignmentStatus.NullabilityMismatch;
    }
    return AlignmentStatus.TypeMismatch;
  }
  // Check nullability separately
  if (!typeComparator.isNullabilityCompatible(graphqlField.nullable, dbColumn.nullable)) {
    return AlignmentStatus.NullabilityMismatch;
  }
  // Everything aligns!
  return AlignmentStatus.Aligned;
}
/**
 * Generate error message for misalignment
 */
export function generateErrorMessage(status, fieldPath, graphqlField, dbColumn, apiField) {
  switch (status) {
    case AlignmentStatus.Aligned:
      return undefined;
    case AlignmentStatus.MissingDb:
      return `Field '${fieldPath}' is queried in GraphQL but does not exist in the database. Expected table.column: '${fieldPath}'.`;
    case AlignmentStatus.MissingApi:
      return `Field '${fieldPath}' exists in database but is not exposed by the API. The resolver may be missing or the field is not included in the GraphQL schema.`;
    case AlignmentStatus.TypeMismatch:
      if (!dbColumn || !apiField) {
        return `Type mismatch for field '${fieldPath}' but layer information is incomplete.`;
      }
      return `Type mismatch for field '${fieldPath}': GraphQL expects '${graphqlField.graphqlType}', database has '${dbColumn.pgType}', API exposes '${apiField.graphqlType}'.`;
    case AlignmentStatus.NullabilityMismatch:
      if (!dbColumn || !apiField) {
        return `Nullability mismatch for field '${fieldPath}' but layer information is incomplete.`;
      }
      return `Nullability mismatch for field '${fieldPath}': GraphQL field is ${graphqlField.nullable ? 'nullable' : 'non-null'}, database column is ${dbColumn.nullable ? 'nullable' : 'non-null'}, API field is ${apiField.nullable ? 'nullable' : 'non-null'}.`;
    default:
      return `Unknown alignment issue for field '${fieldPath}'.`;
  }
}
/**
 * Generate actionable suggestion for fixing misalignment
 */
export function generateSuggestion(
  status,
  fieldPath,
  graphqlField,
  dbColumn,
  apiField,
  typeComparator
) {
  switch (status) {
    case AlignmentStatus.Aligned:
      return undefined;
    case AlignmentStatus.MissingDb:
      return generateDatabaseMigrationSuggestion(fieldPath, graphqlField);
    case AlignmentStatus.MissingApi:
      return generateApiResolverSuggestion(fieldPath, dbColumn);
    case AlignmentStatus.TypeMismatch:
      if (!dbColumn) {
        return 'Add the missing database column first.';
      }
      return typeComparator.suggestFix(graphqlField.graphqlType, dbColumn.pgType);
    case AlignmentStatus.NullabilityMismatch:
      return generateNullabilitySuggestion(graphqlField, dbColumn, apiField);
    default:
      return 'Review the field definition across all layers.';
  }
}
/**
 * Generate SQL migration suggestion for missing database column
 */
function generateDatabaseMigrationSuggestion(fieldPath, graphqlField) {
  const parts = fieldPath.split('.');
  const tableName = parts[0];
  const columnName = parts[parts.length - 1];
  // Map GraphQL type to PostgreSQL type
  const pgType = mapGraphQLTypeToPg(graphqlField.graphqlType);
  const nullable = graphqlField.nullable ? '' : ' NOT NULL';
  return `Add to database migration:\nALTER TABLE ${tableName} ADD COLUMN ${columnName} ${pgType}${nullable};`;
}
/**
 * Generate Rust resolver suggestion for missing API field
 */
function generateApiResolverSuggestion(fieldPath, dbColumn) {
  const parts = fieldPath.split('.');
  const fieldName = parts[parts.length - 1];
  if (!dbColumn) {
    return `Add resolver for '${fieldName}' in Rust API using async-graphql.`;
  }
  const rustType = mapPgTypeToRust(dbColumn.pgType);
  const nullable = dbColumn.nullable ? 'Option<' : '';
  const nullableClose = dbColumn.nullable ? '>' : '';
  return `Add to Rust model:\n#[graphql(name = "${fieldName}")]\npub ${fieldName}: ${nullable}${rustType}${nullableClose},`;
}
/**
 * Generate nullability fix suggestion
 */
function generateNullabilitySuggestion(graphqlField, dbColumn, apiField) {
  const suggestions = [];
  if (dbColumn && !graphqlField.nullable && dbColumn.nullable) {
    suggestions.push(
      `Database column allows NULL but GraphQL requires non-null. Either:\n1. Add NOT NULL constraint to database column\n2. Make GraphQL field nullable`
    );
  }
  if (apiField && graphqlField.nullable !== apiField.nullable) {
    suggestions.push(
      `GraphQL and API nullability differ. Update API field to match GraphQL expectation.`
    );
  }
  return suggestions.join('\n\n') || 'Ensure nullability is consistent across all layers.';
}
/**
 * Map GraphQL type to PostgreSQL type (simplified)
 */
function mapGraphQLTypeToPg(graphqlType) {
  const baseType = graphqlType.replace(/[!\[\]]/g, '').trim();
  const typeMap = {
    String: 'text',
    Int: 'int4',
    Float: 'float8',
    Boolean: 'bool',
    ID: 'uuid',
    DateTime: 'timestamptz',
    Date: 'date',
    JSON: 'jsonb',
  };
  const pgType = typeMap[baseType] ?? 'text';
  // Handle arrays
  if (graphqlType.includes('[')) {
    return `${pgType}[]`;
  }
  return pgType;
}
/**
 * Map PostgreSQL type to Rust type (simplified)
 */
function mapPgTypeToRust(pgType) {
  const normalized = pgType.toLowerCase().replace('[]', '');
  const typeMap = {
    text: 'String',
    varchar: 'String',
    uuid: 'Uuid',
    int2: 'i16',
    int4: 'i32',
    int8: 'i64',
    float4: 'f32',
    float8: 'f64',
    bool: 'bool',
    timestamptz: 'DateTime<Utc>',
    date: 'NaiveDate',
    jsonb: 'serde_json::Value',
  };
  const rustType = typeMap[normalized] ?? 'String';
  // Handle arrays
  if (pgType.includes('[]')) {
    return `Vec<${rustType}>`;
  }
  return rustType;
}
/**
 * Check if field path represents a computed field
 */
export function isComputedField(fieldPath, computedFields) {
  return computedFields.includes(fieldPath);
}
/**
 * Get required action description for misalignment
 */
export function getRequiredAction(status) {
  switch (status) {
    case AlignmentStatus.Aligned:
      return 'No action required';
    case AlignmentStatus.MissingDb:
      return 'Add database column';
    case AlignmentStatus.MissingApi:
      return 'Add API resolver';
    case AlignmentStatus.TypeMismatch:
      return 'Fix type mismatch';
    case AlignmentStatus.NullabilityMismatch:
      return 'Fix nullability mismatch';
    default:
      return 'Review field definition';
  }
}
//# sourceMappingURL=field-aligner.js.map
