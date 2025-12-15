import { type FieldNode, Kind, type SelectionSetNode } from 'graphql';
import type { NPlusOnePattern } from './types';

/**
 * Check if a field represents an N+1 pattern
 */
export function isNPlusOnePattern(
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
		const isInList = isInListContext(fieldPath);
		if (isInList && hasDeepNestedAccess(field.selectionSet)) {
			return true;
		}
	}

	// Pattern 3: Repeated relationship traversal
	if (hasRepeatedRelationshipPattern(fieldPath, field.name.value)) {
		return true;
	}

	// Pattern 4: PostGraphile connection patterns with deep nesting
	if (isPostGraphileConnectionPattern(field, fieldPath)) {
		return true;
	}

	return false;
}

/**
 * Check if we're in a list context (inside a list field)
 */
export function isInListContext(fieldPath: string[]): boolean {
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
export function hasDeepNestedAccess(selectionSet: SelectionSetNode): boolean {
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
export function hasRepeatedRelationshipPattern(fieldPath: string[], currentField: string): boolean {
	// Look for patterns like: users -> departments -> users (circular)
	return fieldPath.filter((field) => field === currentField).length > 1;
}

/**
 * Check for PostGraphile connection patterns that may cause N+1
 */
export function isPostGraphileConnectionPattern(field: FieldNode, fieldPath: string[]): boolean {
	const fieldName = field.name.value;

	// Connection queries with nested node selections
	if (fieldName.endsWith('Connection') && field.selectionSet) {
		const hasEdgesWithNestedNodes = field.selectionSet.selections.some(
			(selection) =>
				selection.kind === Kind.FIELD &&
				selection.name.value === 'edges' &&
				selection.selectionSet?.selections.some(
					(edgeSelection) =>
						edgeSelection.kind === Kind.FIELD &&
						edgeSelection.name.value === 'node' &&
						edgeSelection.selectionSet &&
						hasDeepNestedAccess(edgeSelection.selectionSet)
				)
		);

		return hasEdgesWithNestedNodes;
	}

	// Node ID lookups within connections
	if (fieldName.includes('ByNodeId') && isInListContext(fieldPath)) {
		return true;
	}

	return false;
}

/**
 * Create N+1 pattern description
 */
export function createNPlusOnePattern(
	fieldPath: string[],
	parentType: string,
	fieldName: string,
	returnType: string,
	isListField: boolean,
	hasNestedSelection: boolean,
	variables: Record<string, any>
): NPlusOnePattern {
	const estimatedCallCount = estimateCallCount(fieldPath, variables, isListField);
	const severity = calculateSeverity(estimatedCallCount, fieldPath.length);

	return {
		fieldPath: [...fieldPath],
		parentType,
		fieldName,
		returnType,
		isListField,
		hasNestedSelection,
		estimatedCallCount,
		severity,
		recommendation: generateRecommendation(
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
function estimateCallCount(
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
function calculateSeverity(
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
function generateRecommendation(
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
