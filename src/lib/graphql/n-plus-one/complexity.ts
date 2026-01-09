import type { FieldNode } from 'graphql';
import type { NPlusOnePattern } from './types';

/**
 * Calculate field complexity for optimization estimates
 */
export function calculateFieldComplexity(
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
export function calculateOptimizedComplexity(
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
