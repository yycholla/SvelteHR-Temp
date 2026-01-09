/**
 * GraphQL operation utilities
 * AST traversal helpers, fragment resolution, variable extraction
 */

import type {
  ArgumentNode,
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  SelectionSetNode,
} from 'graphql';
import type { FieldReference, GraphQLOperation } from '../types/models.js';

/**
 * Fragment registry for resolving fragment spreads
 */
export class FragmentRegistry {
  private fragments: Map<string, FragmentDefinitionNode> = new Map();

  /**
   * Register fragments from a GraphQL document
   */
  registerFragments(document: DocumentNode): void {
    for (const definition of document.definitions) {
      if (definition.kind === 'FragmentDefinition') {
        this.fragments.set(definition.name.value, definition);
      }
    }
  }

  /**
   * Get fragment by name
   */
  getFragment(name: string): FragmentDefinitionNode | undefined {
    return this.fragments.get(name);
  }

  /**
   * Clear all registered fragments
   */
  clear(): void {
    this.fragments.clear();
  }
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
export function traverseAST(
  selectionSet: SelectionSetNode,
  visitor: ASTVisitor,
  path: string[] = []
): void {
  visitor.enterSelectionSet?.(selectionSet, path);

  for (const selection of selectionSet.selections) {
    if (selection.kind === 'Field') {
      const fieldName = selection.name.value;
      const currentPath = [...path, fieldName];

      visitor.enterField?.(selection, currentPath);

      if (selection.selectionSet) {
        traverseAST(selection.selectionSet, visitor, currentPath);
      }

      visitor.leaveField?.(selection, currentPath);
    } else if (selection.kind === 'InlineFragment' && selection.selectionSet) {
      traverseAST(selection.selectionSet, visitor, path);
    }
    // FragmentSpreads would need fragment registry to resolve
  }

  visitor.leaveSelectionSet?.(selectionSet, path);
}

/**
 * Extract all field paths from an operation
 * Example: ["users", "users.email", "users.profile", "users.profile.avatar"]
 */
export function extractFieldPaths(operation: GraphQLOperation): string[] {
  const paths: string[] = [];

  function traverse(fields: FieldReference[], parentPath: string = ''): void {
    for (const field of fields) {
      const currentPath = parentPath ? `${parentPath}.${field.name}` : field.name;
      paths.push(currentPath);

      if (field.children.length > 0) {
        traverse(field.children, currentPath);
      }
    }
  }

  traverse(operation.selections);
  return paths;
}

/**
 * Find a specific field by path in an operation
 * Example: findFieldByPath(operation, "users.profile.avatar")
 */
export function findFieldByPath(
  operation: GraphQLOperation,
  targetPath: string
): FieldReference | null {
  const parts = targetPath.split('.');

  function search(fields: FieldReference[], index: number): FieldReference | null {
    if (index >= parts.length) {
      return null;
    }

    const targetName = parts[index];
    const field = fields.find((f) => f.name === targetName);

    if (!field) {
      return null;
    }

    if (index === parts.length - 1) {
      return field;
    }

    return search(field.children, index + 1);
  }

  return search(operation.selections, 0);
}

/**
 * Extract argument values from a field node
 */
export function extractArguments(node: FieldNode): Record<string, unknown> {
  const args: Record<string, unknown> = {};

  if (node.arguments) {
    for (const arg of node.arguments) {
      args[arg.name.value] = extractArgumentValue(arg);
    }
  }

  return args;
}

/**
 * Extract value from an argument node
 * @private
 */
function extractArgumentValue(arg: ArgumentNode): unknown {
  const value = arg.value;

  switch (value.kind) {
    case 'IntValue':
      return parseInt(value.value, 10);
    case 'FloatValue':
      return parseFloat(value.value);
    case 'StringValue':
      return value.value;
    case 'BooleanValue':
      return value.value;
    case 'NullValue':
      return null;
    case 'EnumValue':
      return value.value;
    case 'ListValue':
      return value.values.map((v) =>
        extractArgumentValue({ name: arg.name, value: v } as ArgumentNode)
      );
    case 'ObjectValue':
      return value.fields.reduce(
        (obj, field) => {
          obj[field.name.value] = extractArgumentValue({
            name: field.name,
            value: field.value,
          } as ArgumentNode);
          return obj;
        },
        {} as Record<string, unknown>
      );
    case 'Variable':
      return `$${value.name.value}`; // Return variable reference
    default:
      return undefined;
  }
}

/**
 * Check if operation uses a specific variable
 */
export function usesVariable(operation: GraphQLOperation, variableName: string): boolean {
  return operation.variables.some((v) => v.name === variableName);
}

/**
 * Get all unique field names used in an operation (flattened)
 */
export function getUniqueFieldNames(operation: GraphQLOperation): Set<string> {
  const names = new Set<string>();

  function traverse(fields: FieldReference[]): void {
    for (const field of fields) {
      names.add(field.name);
      if (field.children.length > 0) {
        traverse(field.children);
      }
    }
  }

  traverse(operation.selections);
  return names;
}

/**
 * Calculate operation complexity (depth-based)
 */
export function calculateComplexity(operation: GraphQLOperation): number {
  // Return 0 for empty operations
  if (operation.selections.length === 0) {
    return 0;
  }

  let maxDepth = 0;

  function traverse(fields: FieldReference[], depth: number): void {
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    for (const field of fields) {
      if (field.children.length > 0) {
        traverse(field.children, depth + 1);
      }
    }
  }

  traverse(operation.selections, 1);
  return maxDepth;
}

/**
 * Check if operation is a mutation
 */
export function isMutation(operation: GraphQLOperation): boolean {
  return operation.operationType === 'mutation';
}

/**
 * Check if operation is a query
 */
export function isQuery(operation: GraphQLOperation): boolean {
  return operation.operationType === 'query';
}

/**
 * Check if operation is a subscription
 */
export function isSubscription(operation: GraphQLOperation): boolean {
  return operation.operationType === 'subscription';
}

/**
 * Format operation for display
 */
export function formatOperationSignature(operation: GraphQLOperation): string {
  const vars =
    operation.variables.length > 0
      ? `(${operation.variables.map((v) => `$${v.name}: ${v.type}`).join(', ')})`
      : '';

  return `${operation.operationType} ${operation.name}${vars}`;
}

/**
 * Get root field names (first level selections only)
 */
export function getRootFieldNames(operation: GraphQLOperation): string[] {
  return operation.selections.map((field) => field.name);
}

/**
 * Check if field is aliased
 */
export function isAliased(field: FieldReference): boolean {
  return field.alias !== undefined && field.alias !== field.name;
}

/**
 * Get effective field name (alias if present, otherwise name)
 */
export function getEffectiveFieldName(field: FieldReference): string {
  return field.alias ?? field.name;
}
