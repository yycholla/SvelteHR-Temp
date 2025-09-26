/**
 * N+1 Query Detection and Prevention for GraphQL
 *
 * Advanced tools for detecting and preventing N+1 query problems in GraphQL operations.
 * Provides analysis, monitoring, and automated optimization suggestions for PostGraphile.
 *
 * Features:
 * - Real-time N+1 detection during query execution
 * - DataLoader integration recommendations
 * - Query pattern analysis
 * - Performance impact assessment
 * - Automated batch loading suggestions
 */

import {
	DocumentNode,
	visit,
	FieldNode,
	SelectionSetNode,
	Kind,
	GraphQLSchema,
	isListType,
	getNamedType,
	isObjectType,
	TypeInfo,
	visitWithTypeInfo
} from 'graphql';
import type { QueryAnalysis, ResolverCall } from '../../tests/generated/test-types';

export interface NPlusOnePattern {
	fieldPath: string[];
	parentType: string;
	fieldName: string;
	returnType: string;
	isListField: boolean;
	hasNestedSelection: boolean;
	estimatedCallCount: number;
	severity: 'low' | 'medium' | 'high' | 'critical';
	recommendation: string;
}

export interface DataLoaderSuggestion {
	resolverPath: string;
	batchKey: string;
	loaderType: 'simple' | 'composite' | 'nested';
	implementation: string;
	estimatedImprovement: number; // Percentage
}

export interface QueryOptimization {
	originalComplexity: number;
	optimizedComplexity: number;
	patterns: NPlusOnePattern[];
	dataLoaderSuggestions: DataLoaderSuggestion[];
	queryRewrite?: string;
	performanceGain: number;
}

export interface NPlusOneDetectorConfig {
	enableRealTimeDetection: boolean;
	severityThreshold: 'low' | 'medium' | 'high' | 'critical';
	maxNestedDepth: number;
	listFieldThreshold: number;
	enableDataLoaderSuggestions: boolean;
	performanceThreshold: number; // milliseconds
}

const DEFAULT_CONFIG: NPlusOneDetectorConfig = {
	enableRealTimeDetection: true,
	severityThreshold: 'medium',
	maxNestedDepth: 10,
	listFieldThreshold: 10,
	enableDataLoaderSuggestions: true,
	performanceThreshold: 100
};

export class NPlusOneDetector {
	private config: NPlusOneDetectorConfig;
	private schema?: GraphQLSchema;
	private detectedPatterns: Map<string, NPlusOnePattern> = new Map();
	private executionStats: Map<string, { count: number; totalTime: number }> = new Map();

	constructor(config: Partial<NPlusOneDetectorConfig> = {}, schema?: GraphQLSchema) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.schema = schema;
	}

	/**
	 * Analyze query for N+1 patterns
	 */
	analyzeQuery(document: DocumentNode, variables: Record<string, any> = {}): QueryOptimization {
		const patterns: NPlusOnePattern[] = [];
		const dataLoaderSuggestions: DataLoaderSuggestion[] = [];
		const fieldPath: string[] = [];
		let originalComplexity = 0;

		const typeInfo = this.schema ? new TypeInfo(this.schema) : null;

		const visitor = {
			Field: {
				enter: (node: FieldNode, key: any, parent: any, path: any, ancestors: any[]) => {
					const fieldName = node.name.value;
					fieldPath.push(fieldName);

					// Get type information
					const parentType = typeInfo?.getParentType();
					const fieldType = typeInfo?.getType();
					const returnType = fieldType ? getNamedType(fieldType) : null;

					const isListField = fieldType ? isListType(fieldType) : false;
					const hasNestedSelection = node.selectionSet && node.selectionSet.selections.length > 0;

					// Check for N+1 pattern
					if (this.isNPlusOnePattern(node, fieldPath, parentType?.name || 'Unknown', isListField)) {
						const pattern = this.createNPlusOnePattern(
							fieldPath,
							parentType?.name || 'Unknown',
							fieldName,
							returnType?.name || 'Unknown',
							isListField,
							hasNestedSelection,
							variables
						);

						patterns.push(pattern);
						this.detectedPatterns.set(pattern.fieldPath.join('.'), pattern);

						// Generate DataLoader suggestion if enabled
						if (this.config.enableDataLoaderSuggestions) {
							const suggestion = this.createDataLoaderSuggestion(pattern);
							if (suggestion) {
								dataLoaderSuggestions.push(suggestion);
							}
						}
					}

					originalComplexity += this.calculateFieldComplexity(
						node,
						isListField,
						hasNestedSelection
					);
				},
				leave: () => {
					fieldPath.pop();
				}
			}
		};

		if (typeInfo) {
			visit(document, visitWithTypeInfo(typeInfo, visitor));
		} else {
			visit(document, visitor);
		}

		// Calculate optimized complexity
		const optimizedComplexity = this.calculateOptimizedComplexity(originalComplexity, patterns);
		const performanceGain = ((originalComplexity - optimizedComplexity) / originalComplexity) * 100;

		return {
			originalComplexity,
			optimizedComplexity,
			patterns: patterns.filter((p) => this.shouldReportPattern(p)),
			dataLoaderSuggestions,
			performanceGain: Math.max(0, performanceGain)
		};
	}

	/**
	 * Check if a field represents an N+1 pattern
	 */
	private isNPlusOnePattern(
		field: FieldNode,
		fieldPath: string[],
		parentType: string,
		isListField: boolean
	): boolean {
		// Pattern 1: List field with nested object selections
		if (isListField && field.selectionSet && field.selectionSet.selections.length > 0) {
			const hasObjectSelections = field.selectionSet.selections.some(
				(selection) =>
					selection.kind === Kind.FIELD &&
					selection.selectionSet &&
					selection.selectionSet.selections.length > 0
			);

			if (hasObjectSelections) return true;
		}

		// Pattern 2: Nested field access within list contexts
		if (fieldPath.length > 1 && field.selectionSet) {
			// Check if we're inside a list field context
			const isInListContext = this.isInListContext(fieldPath);
			if (isInListContext && this.hasDeepNestedAccess(field.selectionSet)) {
				return true;
			}
		}

		// Pattern 3: Repeated relationship traversal
		if (this.hasRepeatedRelationshipPattern(fieldPath, field.name.value)) {
			return true;
		}

		// Pattern 4: PostGraphile connection patterns with deep nesting
		if (this.isPostGraphileConnectionPattern(field, fieldPath)) {
			return true;
		}

		return false;
	}

	/**
	 * Check if we're in a list context (inside a list field)
	 */
	private isInListContext(fieldPath: string[]): boolean {
		return fieldPath.some(
			(field) =>
				field.endsWith('s') || // Plural indicates list
				field.endsWith('Connection') ||
				field.endsWith('Edge') ||
				['edges', 'nodes', 'items'].includes(field)
		);
	}

	/**
	 * Check for deep nested access in selection set
	 */
	private hasDeepNestedAccess(selectionSet: SelectionSetNode): boolean {
		let maxDepth = 0;

		const countDepth = (selections: readonly any[], depth = 0): number => {
			let localMax = depth;

			selections.forEach((selection) => {
				if (selection.kind === Kind.FIELD && selection.selectionSet) {
					const childDepth = countDepth(selection.selectionSet.selections, depth + 1);
					localMax = Math.max(localMax, childDepth);
				}
			});

			return localMax;
		};

		maxDepth = countDepth(selectionSet.selections);
		return maxDepth > 2; // Threshold for "deep" nesting
	}

	/**
	 * Check for repeated relationship patterns
	 */
	private hasRepeatedRelationshipPattern(fieldPath: string[], currentField: string): boolean {
		// Look for patterns like: users -> departments -> users (circular)
		const pathStr = fieldPath.join(' -> ');
		return fieldPath.filter((field) => field === currentField).length > 1;
	}

	/**
	 * Check for PostGraphile connection patterns that may cause N+1
	 */
	private isPostGraphileConnectionPattern(field: FieldNode, fieldPath: string[]): boolean {
		const fieldName = field.name.value;

		// Connection queries with nested node selections
		if (fieldName.endsWith('Connection') && field.selectionSet) {
			const hasEdgesWithNestedNodes = field.selectionSet.selections.some(
				(selection) =>
					selection.kind === Kind.FIELD &&
					selection.name.value === 'edges' &&
					selection.selectionSet &&
					selection.selectionSet.selections.some(
						(edgeSelection) =>
							edgeSelection.kind === Kind.FIELD &&
							edgeSelection.name.value === 'node' &&
							edgeSelection.selectionSet &&
							this.hasDeepNestedAccess(edgeSelection.selectionSet)
					)
			);

			return hasEdgesWithNestedNodes;
		}

		// Node ID lookups within connections
		if (fieldName.includes('ByNodeId') && this.isInListContext(fieldPath)) {
			return true;
		}

		return false;
	}

	/**
	 * Create N+1 pattern description
	 */
	private createNPlusOnePattern(
		fieldPath: string[],
		parentType: string,
		fieldName: string,
		returnType: string,
		isListField: boolean,
		hasNestedSelection: boolean,
		variables: Record<string, any>
	): NPlusOnePattern {
		const estimatedCallCount = this.estimateCallCount(fieldPath, variables, isListField);
		const severity = this.calculateSeverity(estimatedCallCount, fieldPath.length);

		return {
			fieldPath: [...fieldPath],
			parentType,
			fieldName,
			returnType,
			isListField,
			hasNestedSelection,
			estimatedCallCount,
			severity,
			recommendation: this.generateRecommendation(
				fieldPath,
				fieldName,
				returnType,
				isListField,
				estimatedCallCount
			)
		};
	}

	/**
	 * Estimate the number of calls for a field
	 */
	private estimateCallCount(
		fieldPath: string[],
		variables: Record<string, any>,
		isListField: boolean
	): number {
		let multiplier = 1;

		// Check for pagination variables
		const paginationVars = ['first', 'last', 'limit'];
		paginationVars.forEach((varName) => {
			if (variables[varName] && typeof variables[varName] === 'number') {
				multiplier *= Math.min(variables[varName], 100); // Cap at 100 for estimation
			}
		});

		// Default estimates based on field path context
		if (isListField) {
			multiplier *= 10; // Default list size
		}

		// Nested contexts multiply the effect
		const listFieldsInPath = fieldPath.filter(
			(field) => field.endsWith('s') || field.endsWith('Connection')
		).length;

		return multiplier * Math.pow(10, listFieldsInPath);
	}

	/**
	 * Calculate severity based on estimated impact
	 */
	private calculateSeverity(
		estimatedCalls: number,
		nestingDepth: number
	): 'low' | 'medium' | 'high' | 'critical' {
		if (estimatedCalls > 1000 || nestingDepth > 5) return 'critical';
		if (estimatedCalls > 100 || nestingDepth > 3) return 'high';
		if (estimatedCalls > 10 || nestingDepth > 2) return 'medium';
		return 'low';
	}

	/**
	 * Generate optimization recommendation
	 */
	private generateRecommendation(
		fieldPath: string[],
		fieldName: string,
		returnType: string,
		isListField: boolean,
		estimatedCalls: number
	): string {
		const path = fieldPath.join(' -> ');

		if (isListField && estimatedCalls > 100) {
			return `Critical: Implement DataLoader for ${path}. Expected ${estimatedCalls} database calls. Consider batch loading ${returnType} entities.`;
		}

		if (fieldPath.length > 3) {
			return `High: Deep nesting detected in ${path}. Consider denormalizing data or implementing field-level batching.`;
		}

		if (estimatedCalls > 10) {
			return `Medium: Potential N+1 in ${path}. Consider using DataLoader or query optimization for ${returnType}.`;
		}

		return `Low: Monitor ${path} for performance. Consider optimization if load increases.`;
	}

	/**
	 * Create DataLoader suggestion
	 */
	private createDataLoaderSuggestion(pattern: NPlusOnePattern): DataLoaderSuggestion | null {
		if (pattern.severity === 'low') return null;

		const resolverPath = pattern.fieldPath.join('.');
		const batchKey = this.generateBatchKey(pattern);
		const loaderType = this.determineLoaderType(pattern);
		const implementation = this.generateLoaderImplementation(pattern, batchKey, loaderType);
		const estimatedImprovement = this.calculateImprovementEstimate(pattern);

		return {
			resolverPath,
			batchKey,
			loaderType,
			implementation,
			estimatedImprovement
		};
	}

	/**
	 * Generate batch key for DataLoader
	 */
	private generateBatchKey(pattern: NPlusOnePattern): string {
		if (pattern.isListField) {
			return `${pattern.returnType}By${pattern.parentType}Id`;
		}

		return `${pattern.returnType}ById`;
	}

	/**
	 * Determine the type of DataLoader needed
	 */
	private determineLoaderType(pattern: NPlusOnePattern): 'simple' | 'composite' | 'nested' {
		if (pattern.fieldPath.length > 3) return 'nested';
		if (pattern.isListField && pattern.hasNestedSelection) return 'composite';
		return 'simple';
	}

	/**
	 * Generate DataLoader implementation code
	 */
	private generateLoaderImplementation(
		pattern: NPlusOnePattern,
		batchKey: string,
		loaderType: string
	): string {
		const returnType = pattern.returnType.toLowerCase();

		switch (loaderType) {
			case 'simple':
				return `
// DataLoader for ${pattern.fieldPath.join(' -> ')}
const ${batchKey}Loader = new DataLoader(async (ids) => {
  const ${returnType}s = await db.${returnType}.findMany({
    where: { id: { in: ids } }
  });

  return ids.map(id => ${returnType}s.find(item => item.id === id));
});`;

			case 'composite':
				return `
// Composite DataLoader for ${pattern.fieldPath.join(' -> ')}
const ${batchKey}Loader = new DataLoader(async (parentIds) => {
  const ${returnType}s = await db.${returnType}.findMany({
    where: { ${pattern.parentType.toLowerCase()}Id: { in: parentIds } }
  });

  return parentIds.map(parentId =>
    ${returnType}s.filter(item => item.${pattern.parentType.toLowerCase()}Id === parentId)
  );
});`;

			case 'nested':
				return `
// Nested DataLoader for ${pattern.fieldPath.join(' -> ')}
const ${batchKey}Loader = new DataLoader(async (keys) => {
  // Complex batching logic for nested relationships
  const results = await batchLoadNestedData(keys, '${pattern.fieldPath.join('.')}');
  return keys.map(key => results[key] || null);
});`;

			default:
				return `// Custom DataLoader needed for ${pattern.fieldPath.join(' -> ')}`;
		}
	}

	/**
	 * Calculate estimated performance improvement
	 */
	private calculateImprovementEstimate(pattern: NPlusOnePattern): number {
		const baseImprovement = Math.min(
			90,
			((pattern.estimatedCallCount - 1) / pattern.estimatedCallCount) * 100
		);

		// Adjust based on severity and nesting
		switch (pattern.severity) {
			case 'critical':
				return Math.min(95, baseImprovement + 20);
			case 'high':
				return Math.min(90, baseImprovement + 15);
			case 'medium':
				return Math.min(80, baseImprovement + 10);
			default:
				return baseImprovement;
		}
	}

	/**
	 * Calculate field complexity for optimization estimates
	 */
	private calculateFieldComplexity(
		field: FieldNode,
		isListField: boolean,
		hasNestedSelection: boolean
	): number {
		let complexity = 1;

		if (isListField) complexity *= 10;
		if (hasNestedSelection) complexity *= 2;
		if (field.arguments && field.arguments.length > 0) complexity += field.arguments.length;

		return complexity;
	}

	/**
	 * Calculate optimized complexity after applying suggestions
	 */
	private calculateOptimizedComplexity(
		originalComplexity: number,
		patterns: NPlusOnePattern[]
	): number {
		let reduction = 0;

		patterns.forEach((pattern) => {
			// Estimate complexity reduction based on pattern severity
			switch (pattern.severity) {
				case 'critical':
					reduction += pattern.estimatedCallCount * 0.9; // 90% reduction
					break;
				case 'high':
					reduction += pattern.estimatedCallCount * 0.8; // 80% reduction
					break;
				case 'medium':
					reduction += pattern.estimatedCallCount * 0.6; // 60% reduction
					break;
				case 'low':
					reduction += pattern.estimatedCallCount * 0.3; // 30% reduction
					break;
			}
		});

		return Math.max(originalComplexity - reduction, originalComplexity * 0.1); // Min 10% of original
	}

	/**
	 * Check if pattern should be reported based on configuration
	 */
	private shouldReportPattern(pattern: NPlusOnePattern): boolean {
		const severityLevels = ['low', 'medium', 'high', 'critical'];
		const patternSeverityIndex = severityLevels.indexOf(pattern.severity);
		const thresholdIndex = severityLevels.indexOf(this.config.severityThreshold);

		return patternSeverityIndex >= thresholdIndex;
	}

	/**
	 * Update detector configuration
	 */
	updateConfig(newConfig: Partial<NPlusOneDetectorConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): NPlusOneDetectorConfig {
		return { ...this.config };
	}

	/**
	 * Get detected patterns summary
	 */
	getDetectedPatterns(): NPlusOnePattern[] {
		return Array.from(this.detectedPatterns.values());
	}

	/**
	 * Clear detected patterns
	 */
	clearPatterns(): void {
		this.detectedPatterns.clear();
		this.executionStats.clear();
	}

	/**
	 * Record execution statistics for real-time monitoring
	 */
	recordExecution(fieldPath: string, executionTime: number): void {
		if (!this.config.enableRealTimeDetection) return;

		const stats = this.executionStats.get(fieldPath) || { count: 0, totalTime: 0 };
		stats.count += 1;
		stats.totalTime += executionTime;

		this.executionStats.set(fieldPath, stats);

		// Alert on performance threshold breach
		if (executionTime > this.config.performanceThreshold) {
			console.warn(`N+1 Detector: Slow execution detected for ${fieldPath}: ${executionTime}ms`);
		}
	}

	/**
	 * Get execution statistics
	 */
	getExecutionStats(): Map<string, { count: number; totalTime: number; avgTime: number }> {
		const stats = new Map();

		this.executionStats.forEach((value, key) => {
			stats.set(key, {
				...value,
				avgTime: value.totalTime / value.count
			});
		});

		return stats;
	}
}

/**
 * Create detector optimized for PostGraphile
 */
export function createPostGraphileNPlusOneDetector(
	config: Partial<NPlusOneDetectorConfig> = {},
	schema?: GraphQLSchema
): NPlusOneDetector {
	const postGraphileConfig: NPlusOneDetectorConfig = {
		...DEFAULT_CONFIG,
		maxNestedDepth: 15, // PostGraphile supports deeper nesting
		listFieldThreshold: 20, // Higher threshold for connection queries
		performanceThreshold: 200, // More lenient for complex queries
		...config
	};

	return new NPlusOneDetector(postGraphileConfig, schema);
}

export default NPlusOneDetector;
