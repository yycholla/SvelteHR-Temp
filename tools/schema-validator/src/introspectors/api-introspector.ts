/**
 * API Introspector - GraphQL API schema introspection
 * TypeScript-native implementation using GraphQL introspection query
 * Note: Production version could use Rust for direct async-graphql introspection
 */

import ky from 'ky';
import type { ApiField, ArgumentInfo } from '../types/models.js';
import { ApiFieldSchema } from '../types/schemas.js';

/**
 * GraphQL introspection query result types
 */
interface IntrospectionResult {
  data: {
    __schema: {
      queryType: { name: string };
      mutationType: { name: string } | null;
      types: IntrospectionType[];
    };
  };
}

interface IntrospectionType {
  kind: string;
  name: string;
  fields: IntrospectionField[] | null;
}

interface IntrospectionField {
  name: string;
  type: IntrospectionTypeRef;
  args: IntrospectionInputValue[];
}

interface IntrospectionInputValue {
  name: string;
  type: IntrospectionTypeRef;
  defaultValue: string | null;
}

interface IntrospectionTypeRef {
  kind: string;
  name: string | null;
  ofType: IntrospectionTypeRef | null;
}

/**
 * API Schema structure
 */
export interface ApiSchema {
  queryFields: ApiField[];
  mutationFields: ApiField[];
  types: Map<string, ApiField[]>;
}

/**
 * GraphQL introspection query
 */
const INTROSPECTION_QUERY = `
  query IntrospectionQuery {
    __schema {
      queryType {
        name
      }
      mutationType {
        name
      }
      types {
        kind
        name
        fields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
          args {
            name
            type {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
            defaultValue
          }
        }
      }
    }
  }
`;

/**
 * API Introspector class
 * Introspects GraphQL API schema via introspection query
 */
export class ApiIntrospector {
  private apiUrl: string;
  private client: typeof ky;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
    this.client = ky.create({
      retry: {
        limit: 3,
        methods: ['post'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504],
      },
      timeout: 30000,
    });
  }

  /**
   * Introspect GraphQL schema via introspection query
   */
  async introspectSchema(): Promise<ApiSchema> {
    // Return empty schema if URL is not configured
    if (!this.apiUrl || this.apiUrl.trim() === '') {
      console.warn('ApiIntrospector: No API URL configured. Returning empty schema.');
      return {
        queryFields: [],
        mutationFields: [],
        types: new Map(),
      };
    }

    try {
      const response = await this.client
        .post(this.apiUrl, {
          json: {
            query: INTROSPECTION_QUERY,
          },
        })
        .json<IntrospectionResult>();

      const schema = response.data.__schema;

      // Extract Query fields
      const queryTypeName = schema.queryType.name;
      const queryType = schema.types.find((t) => t.name === queryTypeName);
      const queryFields = queryType?.fields
        ? queryType.fields.map((f) => this.convertField(f, queryTypeName))
        : [];

      // Extract Mutation fields
      const mutationFields: ApiField[] = [];
      if (schema.mutationType) {
        const mutationTypeName = schema.mutationType.name;
        const mutationType = schema.types.find((t) => t.name === mutationTypeName);
        if (mutationType?.fields) {
          mutationFields.push(
            ...mutationType.fields.map((f) => this.convertField(f, mutationTypeName))
          );
        }
      }

      // Extract custom object types
      const types = new Map<string, ApiField[]>();
      for (const type of schema.types) {
        // Skip introspection types, Query, Mutation
        if (
          type.name.startsWith('__') ||
          type.name === queryTypeName ||
          type.name === schema.mutationType?.name ||
          type.kind !== 'OBJECT'
        ) {
          continue;
        }

        if (type.fields) {
          const fields = type.fields.map((f) => this.convertField(f, type.name));
          types.set(type.name, fields);
        }
      }

      return {
        queryFields,
        mutationFields,
        types,
      };
    } catch (error) {
      throw new Error(
        `Failed to introspect API at ${this.apiUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get fields for a specific type
   */
  async getFields(typeName: string): Promise<ApiField[]> {
    const schema = await this.introspectSchema();

    if (typeName === 'Query') {
      return schema.queryFields;
    }

    if (typeName === 'Mutation') {
      return schema.mutationFields;
    }

    return schema.types.get(typeName) ?? [];
  }

  /**
   * Detect field aliases from Rust code
   * Note: This would require parsing Rust source files in production
   * For now, returns empty map
   */
  async detectAliases(): Promise<Map<string, string>> {
    // In production, this would:
    // 1. Find Rust source files with async-graphql attributes
    // 2. Parse #[graphql(name = "alias")] attributes
    // 3. Map Rust field names to GraphQL aliases

    console.warn('ApiIntrospector: Alias detection not implemented. Parsing Rust source required.');
    return new Map();
  }

  /**
   * Convert introspection field to ApiField
   * @private
   */
  private convertField(field: IntrospectionField, parentType: string): ApiField {
    const typeInfo = this.extractTypeInfo(field.type);

    const args: ArgumentInfo[] = field.args.map((arg) => {
      const argTypeInfo = this.extractTypeInfo(arg.type);
      const argInfo: ArgumentInfo = {
        name: arg.name,
        type: argTypeInfo.typeName,
        nullable: argTypeInfo.nullable,
      };

      // Only add defaultValue if it exists (avoid undefined assignment)
      if (arg.defaultValue) {
        argInfo.defaultValue = this.parseDefaultValue(arg.defaultValue);
      }

      return argInfo;
    });

    return ApiFieldSchema.parse({
      parentType,
      fieldName: field.name,
      graphqlType: typeInfo.typeName,
      nullable: typeInfo.nullable,
      isList: typeInfo.isList,
      args,
      // Don't include optional properties if they're undefined
      // resolverLocation: undefined, // Would be populated from Rust source analysis
      // alias: undefined, // Would be populated from detectAliases()
    });
  }

  /**
   * Extract type information from introspection type reference
   * @private
   */
  private extractTypeInfo(type: IntrospectionTypeRef): {
    typeName: string;
    nullable: boolean;
    isList: boolean;
  } {
    let nullable = true;
    let isList = false;
    let current: IntrospectionTypeRef | null = type;

    // Unwrap NonNull
    if (current.kind === 'NON_NULL') {
      nullable = false;
      current = current.ofType;
    }

    // Check for List
    if (current?.kind === 'LIST') {
      isList = true;
      current = current.ofType;

      // Unwrap inner NonNull
      if (current?.kind === 'NON_NULL') {
        current = current.ofType;
      }
    }

    const typeName = current?.name ?? 'Unknown';

    return { typeName, nullable, isList };
  }

  /**
   * Parse default value from string
   * @private
   */
  private parseDefaultValue(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
