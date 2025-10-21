/**
 * GraphQL Parser - Extracts GraphQL operations from TypeScript files
 * Uses @graphql-tools/graphql-tag-pluck to extract gql template literals
 */
import { gqlPluckFromCodeString } from '@graphql-tools/graphql-tag-pluck';
import { parse } from 'graphql';
import { readFile } from 'fs/promises';
import { GraphQLOperationSchema } from '../types/schemas.js';
/**
 * GraphQL Parser class
 * Extracts GraphQL operations from TypeScript files using template literals
 */
export class GraphQLParser {
    // @ts-expect-error - Reserved for future configurable tag patterns
    _tagPatterns;
    constructor(tagPatterns = ['gql', 'graphql']) {
        this._tagPatterns = tagPatterns;
    }
    /**
     * Parse a single TypeScript file for GraphQL operations
     * @param filePath - Absolute path to TypeScript file
     * @returns Array of parsed GraphQL operations
     */
    async parseFile(filePath) {
        try {
            // Read file content
            const content = await readFile(filePath, 'utf-8');
            // Extract GraphQL strings using graphql-tag-pluck
            const graphqlSources = await gqlPluckFromCodeString(filePath, content, {
                modules: [
                    { name: '@urql/svelte', identifier: 'gql' },
                    { name: 'graphql-tag', identifier: 'gql' },
                    { name: 'graphql', identifier: 'gql' },
                ],
            });
            if (!graphqlSources || graphqlSources.length === 0) {
                return [];
            }
            // Parse each extracted GraphQL string
            const operations = [];
            for (const source of graphqlSources) {
                try {
                    const document = parse(source.body);
                    const parsedOps = this.extractOperationsFromDocument(document, filePath);
                    operations.push(...parsedOps);
                }
                catch (parseError) {
                    // Log parse error but continue processing other operations
                    console.error(`Failed to parse GraphQL in ${filePath}:`, parseError);
                }
            }
            // Validate with Zod schema
            return operations.map((op) => GraphQLOperationSchema.parse(op));
        }
        catch (error) {
            throw new Error(`Failed to parse file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Parse multiple TypeScript files in parallel
     * @param filePaths - Array of absolute file paths
     * @returns Map of file path to array of operations
     */
    async parseFiles(filePaths) {
        const results = await Promise.all(filePaths.map(async (filePath) => {
            try {
                const operations = await this.parseFile(filePath);
                return { filePath, operations };
            }
            catch (error) {
                console.error(`Error parsing ${filePath}:`, error);
                return { filePath, operations: [] };
            }
        }));
        const operationsMap = new Map();
        for (const { filePath, operations } of results) {
            operationsMap.set(filePath, operations);
        }
        return operationsMap;
    }
    /**
     * Extract field references from a GraphQL operation
     * Includes nested field selections and fragments
     * @param operation - GraphQL operation to analyze
     * @returns Flattened array of all field references
     */
    extractFieldReferences(operation) {
        const allFields = [];
        function traverse(fields) {
            for (const field of fields) {
                allFields.push(field);
                if (field.children.length > 0) {
                    traverse(field.children);
                }
            }
        }
        traverse(operation.selections);
        return allFields;
    }
    /**
     * Extract operations from a parsed GraphQL document
     * @private
     */
    extractOperationsFromDocument(document, filePath) {
        const operations = [];
        for (const definition of document.definitions) {
            if (definition.kind === 'OperationDefinition') {
                const operation = this.extractOperation(definition, filePath);
                if (operation) {
                    operations.push(operation);
                }
            }
        }
        return operations;
    }
    /**
     * Extract a single operation from an OperationDefinitionNode
     * @private
     */
    extractOperation(node, filePath) {
        const operationType = node.operation;
        const name = node.name?.value;
        if (!name) {
            // Anonymous operations are not supported
            return null;
        }
        // Extract variables
        const variables = [];
        if (node.variableDefinitions) {
            for (const varDef of node.variableDefinitions) {
                variables.push({
                    name: varDef.variable.name.value,
                    type: this.getTypeString(varDef.type),
                    nullable: this.isNullableType(varDef.type),
                    defaultValue: varDef.defaultValue ? this.extractDefaultValue(varDef.defaultValue) : undefined,
                });
            }
        }
        // Extract field selections
        const selections = this.extractSelections(node.selectionSet);
        // Location information (simplified - would need source location mapping)
        const location = node.loc;
        return {
            name,
            operationType,
            selections,
            variables,
            filePath,
            line: location?.startToken.line ?? 1,
            column: location?.startToken.column ?? 0,
        };
    }
    /**
     * Extract field selections from a selection set
     * @private
     */
    extractSelections(selectionSet) {
        const fields = [];
        for (const selection of selectionSet.selections) {
            if (selection.kind === 'Field') {
                const field = this.extractField(selection);
                fields.push(field);
            }
            else if (selection.kind === 'InlineFragment') {
                // Handle inline fragments
                const fragmentFields = this.extractSelections(selection.selectionSet);
                fields.push(...fragmentFields);
            }
            else if (selection.kind === 'FragmentSpread') {
                // Fragment spreads would need fragment definition resolution
                // For now, we mark them as special field references
                fields.push({
                    name: `...${selection.name.value}`,
                    graphqlType: 'Fragment',
                    nullable: true,
                    isList: false,
                    children: [],
                });
            }
        }
        return fields;
    }
    /**
     * Extract field information from a FieldNode
     * @private
     */
    extractField(node) {
        const name = node.name.value;
        const alias = node.alias?.value;
        // Extract nested selections
        const children = node.selectionSet ? this.extractSelections(node.selectionSet) : [];
        // Type information is not available from query AST alone
        // Type will be resolved during validation phase
        return {
            name,
            graphqlType: 'Unknown', // Will be resolved during validation
            nullable: true, // Default assumption
            isList: false, // Default assumption
            children,
            ...(alias ? { alias } : {}),
        };
    }
    /**
     * Get type string from a TypeNode
     * @private
     */
    getTypeString(type) {
        if (type.kind === 'NonNullType') {
            return `${this.getTypeString(type.type)}!`;
        }
        if (type.kind === 'ListType') {
            return `[${this.getTypeString(type.type)}]`;
        }
        if (type.kind === 'NamedType') {
            return type.name.value;
        }
        return 'Unknown';
    }
    /**
     * Check if type is nullable
     * @private
     */
    isNullableType(type) {
        return type.kind !== 'NonNullType';
    }
    /**
     * Extract default value from a ValueNode
     * @private
     */
    extractDefaultValue(node) {
        switch (node.kind) {
            case 'IntValue':
                return parseInt(node.value, 10);
            case 'FloatValue':
                return parseFloat(node.value);
            case 'StringValue':
                return node.value;
            case 'BooleanValue':
                return node.value;
            case 'NullValue':
                return null;
            case 'ListValue':
                return node.values.map((v) => this.extractDefaultValue(v));
            case 'ObjectValue':
                return node.fields.reduce((obj, field) => {
                    obj[field.name.value] = this.extractDefaultValue(field.value);
                    return obj;
                }, {});
            default:
                return undefined;
        }
    }
}
//# sourceMappingURL=graphql-parser.js.map