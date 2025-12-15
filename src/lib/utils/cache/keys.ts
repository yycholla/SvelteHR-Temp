export function generateCacheKey(
	operationName: string,
	variables: any = {},
	userContext?: { userId: string; roles: string[] }
): string {
	// Create a stable key from variables
	const variablesKey = JSON.stringify(variables, Object.keys(variables).sort());

	// Include user context for user-specific queries
	const contextKey = userContext
		? `${userContext.userId}:${userContext.roles.sort().join(',')}`
		: '';

	// Create the final cache key
	return `${operationName}:${variablesKey}:${contextKey}`;
}

export function generateCacheTag(operationName: string, scope: string): string {
	return `${scope}:${operationName}`;
}
