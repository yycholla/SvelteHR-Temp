/**
 * GraphQL operation utilities
 * AST traversal helpers, fragment resolution, variable extraction
 */
import type { DocumentNode, FragmentDefinitionNode, SelectionSetNode, FieldNode } from 'graphql';
import type { GraphQLOperation, FieldReference } from '../types/models.js';
/**
 * Fragment registry for resolving fragment spreads
 */
export declare class FragmentRegistry {
    private fragments;
    /**
     * Register fragments from a GraphQL document
     */
    registerFragments(document: DocumentNode): void;
    /**
     * Get fragment by name
     */
    getFragment(name: string): FragmentDefinitionNode | undefined;
    /**
     * Clear all registered fragments
     */
    clear(): void;
}
/**
 * AST traversal visitor pattern
 */
export interface ASTVisitor {
    enterField?(node: FieldNode, path: string[]): void;
    leaveField?(node: FieldNode, path: string[]): void;
    enterSelectionSet?(node: SelectionSetNode, path: string[]): void;
    leaveSelectionSet?(node: SelectionSetNode, path: string[]): void;
}
/**
 * Traverse GraphQL AST with visitor pattern
 */
export declare function traverseAST(selectionSet: SelectionSetNode, visitor: ASTVisitor, path?: string[]): void;
/**
 * Extract all field paths from an operation
 * Example: ["users", "users.email", "users.profile", "users.profile.avatar"]
 */
export declare function extractFieldPaths(operation: GraphQLOperation): string[];
/**
 * Find a specific field by path in an operation
 * Example: findFieldByPath(operation, "users.profile.avatar")
 */
export declare function findFieldByPath(operation: GraphQLOperation, targetPath: string): FieldReference | null;
/**
 * Extract argument values from a field node
 */
export declare function extractArguments(node: FieldNode): Record<string, unknown>;
/**
 * Check if operation uses a specific variable
 */
export declare function usesVariable(operation: GraphQLOperation, variableName: string): boolean;
/**
 * Get all unique field names used in an operation (flattened)
 */
export declare function getUniqueFieldNames(operation: GraphQLOperation): Set<string>;
/**
 * Calculate operation complexity (depth-based)
 */
export declare function calculateComplexity(operation: GraphQLOperation): number;
/**
 * Check if operation is a mutation
 */
export declare function isMutation(operation: GraphQLOperation): boolean;
/**
 * Check if operation is a query
 */
export declare function isQuery(operation: GraphQLOperation): boolean;
/**
 * Check if operation is a subscription
 */
export declare function isSubscription(operation: GraphQLOperation): boolean;
/**
 * Format operation for display
 */
export declare function formatOperationSignature(operation: GraphQLOperation): string;
/**
 * Get root field names (first level selections only)
 */
export declare function getRootFieldNames(operation: GraphQLOperation): string[];
/**
 * Check if field is aliased
 */
export declare function isAliased(field: FieldReference): boolean;
/**
 * Get effective field name (alias if present, otherwise name)
 */
export declare function getEffectiveFieldName(field: FieldReference): string;
//# sourceMappingURL=operation-utils.d.ts.map