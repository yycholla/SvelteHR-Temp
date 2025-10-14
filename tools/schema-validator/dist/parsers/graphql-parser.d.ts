/**
 * GraphQL Parser - Extracts GraphQL operations from TypeScript files
 * Uses @graphql-tools/graphql-tag-pluck to extract gql template literals
 */
import type { GraphQLOperation, FieldReference } from '../types/models.js';
/**
 * GraphQL Parser class
 * Extracts GraphQL operations from TypeScript files using template literals
 */
export declare class GraphQLParser {
    private readonly _tagPatterns;
    constructor(tagPatterns?: string[]);
    /**
     * Parse a single TypeScript file for GraphQL operations
     * @param filePath - Absolute path to TypeScript file
     * @returns Array of parsed GraphQL operations
     */
    parseFile(filePath: string): Promise<GraphQLOperation[]>;
    /**
     * Parse multiple TypeScript files in parallel
     * @param filePaths - Array of absolute file paths
     * @returns Map of file path to array of operations
     */
    parseFiles(filePaths: string[]): Promise<Map<string, GraphQLOperation[]>>;
    /**
     * Extract field references from a GraphQL operation
     * Includes nested field selections and fragments
     * @param operation - GraphQL operation to analyze
     * @returns Flattened array of all field references
     */
    extractFieldReferences(operation: GraphQLOperation): FieldReference[];
    /**
     * Extract operations from a parsed GraphQL document
     * @private
     */
    private extractOperationsFromDocument;
    /**
     * Extract a single operation from an OperationDefinitionNode
     * @private
     */
    private extractOperation;
    /**
     * Extract field selections from a selection set
     * @private
     */
    private extractSelections;
    /**
     * Extract field information from a FieldNode
     * @private
     */
    private extractField;
    /**
     * Get type string from a TypeNode
     * @private
     */
    private getTypeString;
    /**
     * Check if type is nullable
     * @private
     */
    private isNullableType;
    /**
     * Extract default value from a ValueNode
     * @private
     */
    private extractDefaultValue;
}
//# sourceMappingURL=graphql-parser.d.ts.map