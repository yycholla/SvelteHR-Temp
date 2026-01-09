/**
 * GraphQL operation utilities
 * AST traversal helpers, fragment resolution, variable extraction
 */
/**
 * Fragment registry for resolving fragment spreads
 */
export class FragmentRegistry {
  fragments = new Map();
  /**
   * Register fragments from a GraphQL document
   */
  registerFragments(document) {
    for (const definition of document.definitions) {
      if (definition.kind === 'FragmentDefinition') {
        this.fragments.set(definition.name.value, definition);
      }
    }
  }
  /**
   * Get fragment by name
   */
  getFragment(name) {
    return this.fragments.get(name);
  }
  /**
   * Clear all registered fragments
   */
  clear() {
    this.fragments.clear();
  }
}
/**
 * Traverse GraphQL AST with visitor pattern
 */
export function traverseAST(selectionSet, visitor, path = []) {
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
export function extractFieldPaths(operation) {
  const paths = [];
  function traverse(fields, parentPath = '') {
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
export function findFieldByPath(operation, targetPath) {
  const parts = targetPath.split('.');
  function search(fields, index) {
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
export function extractArguments(node) {
  const args = {};
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
function extractArgumentValue(arg) {
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
      return value.values.map((v) => extractArgumentValue({ name: arg.name, value: v }));
    case 'ObjectValue':
      return value.fields.reduce((obj, field) => {
        obj[field.name.value] = extractArgumentValue({ name: field.name, value: field.value });
        return obj;
      }, {});
    case 'Variable':
      return `$${value.name.value}`; // Return variable reference
    default:
      return undefined;
  }
}
/**
 * Check if operation uses a specific variable
 */
export function usesVariable(operation, variableName) {
  return operation.variables.some((v) => v.name === variableName);
}
/**
 * Get all unique field names used in an operation (flattened)
 */
export function getUniqueFieldNames(operation) {
  const names = new Set();
  function traverse(fields) {
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
export function calculateComplexity(operation) {
  // Return 0 for empty operations
  if (operation.selections.length === 0) {
    return 0;
  }
  let maxDepth = 0;
  function traverse(fields, depth) {
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
export function isMutation(operation) {
  return operation.operationType === 'mutation';
}
/**
 * Check if operation is a query
 */
export function isQuery(operation) {
  return operation.operationType === 'query';
}
/**
 * Check if operation is a subscription
 */
export function isSubscription(operation) {
  return operation.operationType === 'subscription';
}
/**
 * Format operation for display
 */
export function formatOperationSignature(operation) {
  const vars =
    operation.variables.length > 0
      ? `(${operation.variables.map((v) => `$${v.name}: ${v.type}`).join(', ')})`
      : '';
  return `${operation.operationType} ${operation.name}${vars}`;
}
/**
 * Get root field names (first level selections only)
 */
export function getRootFieldNames(operation) {
  return operation.selections.map((field) => field.name);
}
/**
 * Check if field is aliased
 */
export function isAliased(field) {
  return field.alias !== undefined && field.alias !== field.name;
}
/**
 * Get effective field name (alias if present, otherwise name)
 */
export function getEffectiveFieldName(field) {
  return field.alias ?? field.name;
}
//# sourceMappingURL=operation-utils.js.map
