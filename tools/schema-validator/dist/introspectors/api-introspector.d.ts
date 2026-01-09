/**
 * API Introspector - GraphQL API schema introspection
 * TypeScript-native implementation using GraphQL introspection query
 * Note: Production version could use Rust for direct async-graphql introspection
 */
import type { ApiField } from '../types/models.js';
/**
 * API Schema structure
 */
export interface ApiSchema {
  queryFields: ApiField[];
  mutationFields: ApiField[];
  types: Map<string, ApiField[]>;
}
/**
 * API Introspector class
 * Introspects GraphQL API schema via introspection query
 */
export declare class ApiIntrospector {
  private apiUrl;
  private client;
  constructor(apiUrl: string);
  /**
   * Introspect GraphQL schema via introspection query
   */
  introspectSchema(): Promise<ApiSchema>;
  /**
   * Get fields for a specific type
   */
  getFields(typeName: string): Promise<ApiField[]>;
  /**
   * Detect field aliases from Rust code
   * Note: This would require parsing Rust source files in production
   * For now, returns empty map
   */
  detectAliases(): Promise<Map<string, string>>;
  /**
   * Convert introspection field to ApiField
   * @private
   */
  private convertField;
  /**
   * Extract type information from introspection type reference
   * @private
   */
  private extractTypeInfo;
  /**
   * Parse default value from string
   * @private
   */
  private parseDefaultValue;
}
//# sourceMappingURL=api-introspector.d.ts.map
