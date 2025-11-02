/**
 * GraphQL Query Complexity Analyzer for SvelteHR
 *
 * Provides query complexity analysis, depth limiting, and performance monitoring
 * for GraphQL operations with PostGraphile backend.
 *
 * Features:
 * - Configurable complexity scoring
 * - Query depth analysis
 * - Field count monitoring
 * - Performance metrics collection
 * - Security validation
 */

import {
	DocumentNode,
	visit,
	TypeInfo,
	visitWithTypeInfo,
	GraphQLSchema,
	isListType,
	isNonNullType,
	getNamedType,
	isObjectType,
	isInterfaceType,
	GraphQLError,
	Kind
} from 'graphql';
import type {
	QueryComplexityConfig,
	GraphQLPerformanceMetrics,
	QueryAnalysis,
	ResolverCall
} from '../../tests/generated/test-types';

/**
 * Default complexity configuration optimized for PostGraphile HR system
 */
export const DEFAULT_COMPLEXITY_CONFIG: QueryComplexityConfig = {
	maximumComplexity: 1000,
	depthLimit: 15,
	scalarCost: 1,
	objectCost: 2,
	listFactor: 10,
	introspectionCost: 100
};

/**
 * PostGraphile-specific complexity multipliers
 */
const POSTGRAPHILE_COMPLEXITY_MULTIPLIERS = {
	// Connection types (pagination) have higher base cost
	connection: 5,
	edge: 2,
	node: 1,

	// Computed fields are more expensive
	computed: 3,

	// Aggregation functions
	aggregates: 8,

	// Full-text search
	search: 6,

	// File/blob operations
	file: 4,

	// Complex business logic
	performanceReview: 10,
	leaveApproval: 8,
	reportGeneration: 15
};

/**
 * Security-sensitive fields that should have higher complexity costs
 */
const SECURITY_SENSITIVE_FIELDS = new Set([
	'permissions',
	'roles',
	'salary',
	'personalData',
	'documents',
	'auditLog',
	'systemSettings'
]);

export class QueryComplexityAnalyzer {
	private config: QueryComplexityConfig;
	private schema?: GraphQLSchema;

	constructor(config: Partial<QueryComplexityConfig> = {}, schema?: GraphQLSchema) {
		this.config = { ...DEFAULT_COMPLEXITY_CONFIG, ...config };
		this.schema = schema;
	}

	/**
	 * Analyze query complexity and return detailed metrics
	 */
	analyzeQuery(document: DocumentNode, variables?: Record<string, any>): GraphQLPerformanceMetrics {
		const startTime = performance.now();

		let complexity = 0;
		let depth = 0;
		let fieldCount = 0;
		let maxDepth = 0;
		let currentDepth = 0;
		let operationType: 'query' | 'mutation' | 'subscription' = 'query';
		let operationName: string | undefined;
		let errorCount = 0;

		const typeInfo = this.schema ? new TypeInfo(this.schema) : null;

		const visitor = {
			OperationDefinition: {
				enter: (node: any) => {
					operationType = node.operation;
					operationName = node.name?.value;
				}
			},

			Field: {
				enter: (node: any) => {
					fieldCount++;
					currentDepth++;
					maxDepth = Math.max(maxDepth, currentDepth);

					// Calculate field complexity
					const fieldComplexity = this.calculateFieldComplexity(node, variables, typeInfo);
					complexity += fieldComplexity;

					// Check for potential security issues
					if (SECURITY_SENSITIVE_FIELDS.has(node.name.value)) {
						complexity += this.config.objectCost * 5; // Higher cost for sensitive fields
					}

					// PostGraphile specific complexity
					complexity += this.getPostGraphileComplexity(node);
				},
				leave: () => {
					currentDepth--;
				}
			},

			InlineFragment: {
				enter: () => {
					currentDepth++;
					maxDepth = Math.max(maxDepth, currentDepth);
				},
				leave: () => {
					currentDepth--;
				}
			},

			FragmentSpread: {
				enter: () => {
					// Fragment spreads add complexity
					complexity += this.config.objectCost;
				}
			}
		};

		try {
			if (typeInfo) {
				visit(document, visitWithTypeInfo(typeInfo, visitor));
			} else {
				visit(document, visitor);
			}
		} catch (error) {
			errorCount++;
			console.warn('Query complexity analysis error:', error);
		}

		const executionTime = performance.now() - startTime;
		depth = maxDepth;

		return {
			operationName,
			operationType,
			executionTime,
			complexity,
			depth,
			fieldCount,
			errorCount,
			cacheHitRatio: 0 // Will be updated by cache system
		};
	}

	/**
	 * Validate query against complexity limits
	 */
	validateComplexity(document: DocumentNode, variables?: Record<string, any>): GraphQLError[] {
		const metrics = this.analyzeQuery(document, variables);
		const errors: GraphQLError[] = [];

		if (metrics.complexity > this.config.maximumComplexity) {
			errors.push(
				new GraphQLError(
					`Query complexity ${metrics.complexity} exceeds maximum allowed complexity ${this.config.maximumComplexity}`,
					{
						extensions: {
							code: 'QUERY_COMPLEXITY_TOO_HIGH',
							complexity: metrics.complexity,
							maxComplexity: this.config.maximumComplexity
						}
					}
				)
			);
		}

		if (metrics.depth > this.config.depthLimit) {
			errors.push(
				new GraphQLError(
					`Query depth ${metrics.depth} exceeds maximum allowed depth ${this.config.depthLimit}`,
					{
						extensions: {
							code: 'QUERY_DEPTH_TOO_HIGH',
							depth: metrics.depth,
							maxDepth: this.config.depthLimit
						}
					}
				)
			);
		}

		return errors;
	}

	/**
	 * Calculate complexity for a specific field
	 */
	private calculateFieldComplexity(
		field: any,
		variables: Record<string, any> = {},
		typeInfo: TypeInfo | null
	): number {
		let complexity = this.config.scalarCost;
		const fieldName = field.name.value;

		// Get type information if available
		const fieldType = typeInfo?.getType();
		const parentType = typeInfo?.getParentType();

		if (fieldType) {
			const namedType = getNamedType(fieldType);

			if (isListType(fieldType) || isNonNullType(fieldType)) {
				complexity *= this.config.listFactor;
			}

			if (isObjectType(namedType) || isInterfaceType(namedType)) {
				complexity += this.config.objectCost;
			}
		}

		// Handle field arguments (especially pagination)
		if (field.arguments && field.arguments.length > 0) {
			complexity += this.calculateArgumentComplexity(field.arguments, variables);
		}

		// Introspection queries are expensive
		if (fieldName.startsWith('__')) {
			complexity += this.config.introspectionCost;
		}

		return Math.max(complexity, 1);
	}

	/**
	 * Calculate PostGraphile-specific complexity
	 */
	private getPostGraphileComplexity(field: any): number {
		const fieldName = field.name.value;
		let complexity = 0;

		// Connection patterns
		if (fieldName.endsWith('Connection') || fieldName.includes('ByNodeId')) {
			complexity += POSTGRAPHILE_COMPLEXITY_MULTIPLIERS.connection;
		}

		if (fieldName.endsWith('Edge')) {
			complexity += POSTGRAPHILE_COMPLEXITY_MULTIPLIERS.edge;
		}

		// Computed fields (functions)
		if (fieldName.includes('Computed') || fieldName.startsWith('calculate')) {
			complexity += POSTGRAPHILE_COMPLEXITY_MULTIPLIERS.computed;
		}

		// Aggregation queries
		if (
			fieldName.includes('Aggregate') ||
			fieldName.includes('Count') ||
			fieldName.includes('Sum')
		) {
			complexity += POSTGRAPHILE_COMPLEXITY_MULTIPLIERS.aggregates;
		}

		// Full-text search
		if (fieldName.includes('Search') || fieldName.includes('Filter')) {
			complexity += POSTGRAPHILE_COMPLEXITY_MULTIPLIERS.search;
		}

		// Business logic complexity
		Object.entries(POSTGRAPHILE_COMPLEXITY_MULTIPLIERS).forEach(([key, multiplier]) => {
			if (fieldName.toLowerCase().includes(key.toLowerCase()) && typeof multiplier === 'number') {
				complexity += multiplier;
			}
		});

		return complexity;
	}

	/**
	 * Calculate complexity for field arguments
	 */
	private calculateArgumentComplexity(args: any[], variables: Record<string, any>): number {
		let complexity = 0;

		args.forEach((arg) => {
			const argName = arg.name.value;

			// Pagination arguments
			if (['first', 'last'].includes(argName)) {
				const limit = this.getArgumentValue(arg, variables);
				if (typeof limit === 'number' && limit > 100) {
					complexity += Math.ceil(limit / 10); // Higher complexity for large limits
				}
			}

			// Complex filter conditions
			if (['condition', 'filter', 'where'].includes(argName)) {
				complexity += 5; // Filtering adds complexity
			}

			// Sorting
			if (['orderBy', 'sort'].includes(argName)) {
				complexity += 2;
			}

			// Search terms
			if (['search', 'query'].includes(argName)) {
				complexity += POSTGRAPHILE_COMPLEXITY_MULTIPLIERS.search;
			}
		});

		return complexity;
	}

	/**
	 * Extract argument value, resolving variables if needed
	 */
	private getArgumentValue(arg: any, variables: Record<string, any>): any {
		if (arg.value.kind === Kind.VARIABLE) {
			return variables[arg.value.name.value];
		}

		if (arg.value.kind === Kind.INT) {
			return parseInt(arg.value.value, 10);
		}

		if (arg.value.kind === Kind.STRING) {
			return arg.value.value;
		}

		return null;
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<QueryComplexityConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): QueryComplexityConfig {
		return { ...this.config };
	}

	/**
	 * Create a complexity validation rule for GraphQL execution
	 */
	createValidationRule() {
		const analyzer = this;

		return function ComplexityValidationRule(context: any) {
			return {
				Document: {
					leave(node: DocumentNode) {
						const errors = analyzer.validateComplexity(node, context.getVariableValues());
						errors.forEach((error) => context.reportError(error));
					}
				}
			};
		};
	}

	/**
	 * Analyze query for potential N+1 issues
	 */
	analyzeForNPlusOne(document: DocumentNode): QueryAnalysis {
		const resolverCalls: ResolverCall[] = [];
		const duplicateQueries: string[] = [];
		const recommendations: string[] = [];
		let potentialNPlusOne = false;
		let operationName: string | undefined;

		const fieldCounts = new Map<string, number>();

		visit(document, {
			OperationDefinition: {
				enter: (node: any) => {
					operationName = node.name?.value;
				}
			},
			Field: {
				enter: (node: any) => {
					const fieldName = node.name.value;
					const parentType = 'Unknown'; // Would need schema context for accurate parent type

					// Count field usage
					const key = `${parentType}.${fieldName}`;
					fieldCounts.set(key, (fieldCounts.get(key) || 0) + 1);

					// Detect potential N+1 patterns
					if (node.selectionSet && node.selectionSet.selections.length > 0) {
						const hasListField = node.selectionSet.selections.some(
							(selection: any) =>
								selection.kind === 'Field' &&
								(selection.name.value.endsWith('Connection') || selection.name.value.endsWith('s')) // Plural indicates list
						);

						if (hasListField) {
							potentialNPlusOne = true;
							recommendations.push(`Consider using DataLoader or batch loading for ${fieldName}`);
						}
					}

					resolverCalls.push({
						fieldName,
						parentType,
						returnType: 'Unknown', // Would need schema context
						executionTime: 0, // Estimated
						callCount: fieldCounts.get(key) || 1
					});
				}
			}
		});

		// Find duplicate queries
		fieldCounts.forEach((count, field) => {
			if (count > 3) {
				// Threshold for potential duplication
				duplicateQueries.push(field);
				recommendations.push(
					`Field ${field} is queried ${count} times - consider query optimization`
				);
			}
		});

		return {
			operationName,
			resolverCalls,
			potentialNPlusOne,
			duplicateQueries,
			recommendations
		};
	}
}

/**
 * Express middleware for query complexity validation
 */
export function createComplexityMiddleware(analyzer: QueryComplexityAnalyzer) {
	return (req: any, res: any, next: any) => {
		if (req.body && req.body.query) {
			try {
				const document = req.body.query; // Would need proper parsing in real implementation
				const errors = analyzer.validateComplexity(document, req.body.variables);

				if (errors.length > 0) {
					return res.status(400).json({
						errors: errors.map((error) => ({
							message: error.message,
							extensions: error.extensions
						}))
					});
				}
			} catch (error) {
				console.warn('Complexity validation error:', error);
			}
		}

		next();
	};
}

export default QueryComplexityAnalyzer;
