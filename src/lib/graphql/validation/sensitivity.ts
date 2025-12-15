import type { AuthorizationContext, FieldAuthorizationConfig } from './types';

/**
 * Check for sensitivity level violations
 */
export function checkSensitivityViolation(
	config: FieldAuthorizationConfig,
	sensitivityLevel: string,
	context: AuthorizationContext,
	hasAccess: boolean
): string | undefined {
	if (!config.enableSensitivityAnalysis || hasAccess) return undefined;

	const userMaxSensitivity = getUserMaxSensitivityLevel(context);
	const fieldSensitivityLevel = getSensitivityLevelNumber(sensitivityLevel);
	const userSensitivityLevel = getSensitivityLevelNumber(userMaxSensitivity);

	if (fieldSensitivityLevel > userSensitivityLevel) {
		return `Field sensitivity level '${sensitivityLevel}' exceeds user level '${userMaxSensitivity}'`;
	}

	return undefined;
}

/**
 * Get user's maximum sensitivity level based on roles
 */
function getUserMaxSensitivityLevel(context: AuthorizationContext): string {
	if (context.isAdmin) return 'restricted';
	if (context.userRoles.includes('HR_Manager')) return 'restricted';
	if (context.userRoles.includes('Manager')) return 'confidential';
	return 'internal';
}

/**
 * Convert sensitivity level to numeric value for comparison
 */
function getSensitivityLevelNumber(level: string): number {
	switch (level) {
		case 'public':
			return 1;
		case 'internal':
			return 2;
		case 'confidential':
			return 3;
		case 'restricted':
			return 4;
		default:
			return 2;
	}
}

/**
 * Check default access based on sensitivity level
 */
export function checkDefaultAccess(
	sensitivityLevel: string,
	context: AuthorizationContext
): boolean {
	const userMaxLevel = getUserMaxSensitivityLevel(context);
	const fieldLevel = getSensitivityLevelNumber(sensitivityLevel);
	const userLevel = getSensitivityLevelNumber(userMaxLevel);

	return userLevel >= fieldLevel;
}

/**
 * Calculate overall security level of the query
 */
export function calculateSecurityLevel(
	sensitiveFields: string[],
	deniedFieldsCount: number,
	findMatchingRule: (field: string) => any
): 'low' | 'medium' | 'high' | 'critical' {
	if (deniedFieldsCount > 0) return 'critical';

	const restrictedFields = sensitiveFields.filter((field) => {
		const rule = findMatchingRule(field);
		return rule?.sensitivityLevel === 'restricted';
	});

	const confidentialFields = sensitiveFields.filter((field) => {
		const rule = findMatchingRule(field);
		return rule?.sensitivityLevel === 'confidential';
	});

	if (restrictedFields.length > 0) return 'critical';
	if (confidentialFields.length > 2) return 'high';
	if (sensitiveFields.length > 0) return 'medium';

	return 'low';
}
