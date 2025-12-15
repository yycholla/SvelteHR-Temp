import type { DataLoaderSuggestion, NPlusOnePattern } from './types';

/**
 * Create DataLoader suggestion
 */
export function createDataLoaderSuggestion(pattern: NPlusOnePattern): DataLoaderSuggestion | null {
	if (pattern.severity === 'low') return null;

	const resolverPath = pattern.fieldPath.join('.');
	const batchKey = generateBatchKey(pattern);
	const loaderType = determineLoaderType(pattern);
	const implementation = generateLoaderImplementation(pattern, batchKey, loaderType);
	const estimatedImprovement = calculateImprovementEstimate(pattern);

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
function generateBatchKey(pattern: NPlusOnePattern): string {
	if (pattern.isListField) {
		return `${pattern.returnType}By${pattern.parentType}Id`;
	}

	return `${pattern.returnType}ById`;
}

/**
 * Determine the type of DataLoader needed
 */
function determineLoaderType(pattern: NPlusOnePattern): 'simple' | 'composite' | 'nested' {
	if (pattern.fieldPath.length > 3) return 'nested';
	if (pattern.isListField && pattern.hasNestedSelection) return 'composite';
	return 'simple';
}

/**
 * Generate DataLoader implementation code
 */
function generateLoaderImplementation(
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
function calculateImprovementEstimate(pattern: NPlusOnePattern): number {
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
