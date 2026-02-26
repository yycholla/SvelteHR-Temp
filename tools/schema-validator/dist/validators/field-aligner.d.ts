/**
 * Field Alignment Logic
 * Helper functions for aligning fields across GraphQL, Database, and API layers
 */
import type { ApiField, DatabaseColumn, FieldAlignment, FieldReference } from '../types/models.js';
import { AlignmentStatus } from '../types/enums.js';
import { TypeComparator } from './type-comparator.js';
/**
 * Align a single field across all three layers
 */
export declare function alignField(
  graphqlField: FieldReference,
  dbColumn: DatabaseColumn | undefined,
  apiField: ApiField | undefined,
  fieldPath: string,
  sourceFile: string,
  sourceLine: number,
  sourceColumn: number,
  typeComparator: TypeComparator
): FieldAlignment;
/**
 * Compute alignment status based on field presence and type compatibility
 */
export declare function computeAlignmentStatus(
  graphqlField: FieldReference,
  dbColumn: DatabaseColumn | undefined,
  apiField: ApiField | undefined,
  typeComparator: TypeComparator
): AlignmentStatus;
/**
 * Generate error message for misalignment
 */
export declare function generateErrorMessage(
  status: AlignmentStatus,
  fieldPath: string,
  graphqlField: FieldReference,
  dbColumn: DatabaseColumn | undefined,
  apiField: ApiField | undefined
): string | undefined;
/**
 * Generate actionable suggestion for fixing misalignment
 */
export declare function generateSuggestion(
  status: AlignmentStatus,
  fieldPath: string,
  graphqlField: FieldReference,
  dbColumn: DatabaseColumn | undefined,
  apiField: ApiField | undefined,
  typeComparator: TypeComparator
): string | undefined;
/**
 * Check if field path represents a computed field
 */
export declare function isComputedField(fieldPath: string, computedFields: string[]): boolean;
/**
 * Get required action description for misalignment
 */
export declare function getRequiredAction(status: AlignmentStatus): string;
//# sourceMappingURL=field-aligner.d.ts.map
