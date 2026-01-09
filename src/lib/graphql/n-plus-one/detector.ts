import type { ASTVisitor, DocumentNode, FieldNode } from 'graphql';
import {
	GraphQLSchema,
	TypeInfo,
	getNamedType,
	isListType,
	visit,
	visitWithTypeInfo
} from 'graphql';
import { logger } from '$lib/utils/logger';
import type {
	DataLoaderSuggestion,
	NPlusOneDetectorConfig,
	NPlusOnePattern,
	QueryOptimization
} from './types';
import { DEFAULT_CONFIG } from './config';
import { createNPlusOnePattern, isNPlusOnePattern } from './patterns';
import { createDataLoaderSuggestion } from './suggestions';
import { calculateFieldComplexity, calculateOptimizedComplexity } from './complexity';

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

		const visitor: ASTVisitor = {
			Field: {
				enter: (node: FieldNode) => {
					const fieldName = node.name.value;
					fieldPath.push(fieldName);

					// Get type information
					const parentType = typeInfo?.getParentType();
					const fieldType = typeInfo?.getType();
					const returnType = fieldType ? getNamedType(fieldType) : null;

					const isListField = fieldType ? isListType(fieldType) : false;
					const hasNestedSelection = node.selectionSet && node.selectionSet.selections.length > 0;

					// Check for N+1 pattern
					if (isNPlusOnePattern(node, fieldPath, parentType?.name || 'Unknown', isListField)) {
						const pattern = createNPlusOnePattern(
							fieldPath,
							parentType?.name || 'Unknown',
							fieldName,
							returnType?.name || 'Unknown',
							isListField ?? false,
							hasNestedSelection ?? false,
							variables
						);

						patterns.push(pattern);
						this.detectedPatterns.set(pattern.fieldPath.join('.'), pattern);

						// Generate DataLoader suggestion if enabled
						if (this.config.enableDataLoaderSuggestions) {
							const suggestion = createDataLoaderSuggestion(pattern);
							if (suggestion) {
								dataLoaderSuggestions.push(suggestion);
							}
						}
					}

					originalComplexity += calculateFieldComplexity(
						node,
						isListField ?? false,
						hasNestedSelection ?? false
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
		const optimizedComplexity = calculateOptimizedComplexity(originalComplexity, patterns);
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
			logger.warn(`N+1 Detector: Slow execution detected for ${fieldPath}: ${executionTime}ms`);
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
