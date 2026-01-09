import type { AuthorizationContext, FieldAccessCondition } from './types';

/**
 * Evaluate access conditions
 */
export function evaluateAccessConditions(
	conditions: FieldAccessCondition[],
	context: AuthorizationContext,
	variables: Record<string, any>
): boolean {
	if (conditions.length === 0) return true;

	return conditions.every((condition) => {
		switch (condition.type) {
			case 'ownership':
				return evaluateOwnershipCondition(condition, context, variables);

			case 'department':
				return evaluateDepartmentCondition(condition, context);

			case 'role_hierarchy':
				return evaluateRoleHierarchyCondition(condition, context);

			case 'custom':
				return condition.customValidator ? condition.customValidator(context) : true;

			default:
				return false;
		}
	});
}

/**
 * Evaluate ownership condition (user owns the resource)
 */
function evaluateOwnershipCondition(
	condition: FieldAccessCondition,
	context: AuthorizationContext,
	variables: Record<string, any>
): boolean {
	const contextValue = condition.value === 'userId' ? context.userId : variables[condition.value];

	switch (condition.operator) {
		case 'equals':
			return contextValue === context.userId;
		case 'in':
			return Array.isArray(contextValue) && contextValue.includes(context.userId);
		default:
			return false;
	}
}

/**
 * Evaluate department-based condition
 */
function evaluateDepartmentCondition(
	condition: FieldAccessCondition,
	context: AuthorizationContext
): boolean {
	if (!context.departmentId) return false;

	switch (condition.operator) {
		case 'equals':
			return context.departmentId === condition.value;
		case 'in':
			return Array.isArray(condition.value) && condition.value.includes(context.departmentId);
		default:
			return false;
	}
}

/**
 * Evaluate role hierarchy condition
 */
function evaluateRoleHierarchyCondition(
	condition: FieldAccessCondition,
	context: AuthorizationContext
): boolean {
	// Admin has access to everything
	if (context.isAdmin) return true;

	// Check if user is a manager of the resource
	if (condition.field === 'managerId' && context.managerId) {
		return context.userId === context.managerId;
	}

	return false;
}
