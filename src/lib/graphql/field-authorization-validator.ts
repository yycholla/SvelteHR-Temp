/**
 * Field-Level Authorization Validator for GraphQL
 *
 * Provides comprehensive field-level authorization validation for GraphQL operations.
 * Works with PostGraphile RLS (Row Level Security) and RBAC systems to ensure
 * proper access control at the field level.
 *
 * Features:
 * - Field-level permission checking
 * - Role-based access validation
 * - Sensitive field protection
 * - Query authorization analysis
 * - Permission requirement calculation
 * - Security audit capabilities
 */

import type { DocumentNode, FieldNode } from 'graphql';
import {
	GraphQLInterfaceType,
	GraphQLObjectType,
	GraphQLSchema,
	TypeInfo,
	getNamedType,
	isInterfaceType,
	isObjectType,
	visit,
	visitWithTypeInfo
} from 'graphql';

export interface FieldPermissionRule {
	fieldPath: string;
	requiredPermissions: string[];
	requiredRoles: string[];
	sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
	conditions?: FieldAccessCondition[];
}

export interface FieldAccessCondition {
	type: 'ownership' | 'department' | 'role_hierarchy' | 'custom';
	field: string;
	operator: 'equals' | 'in' | 'not_equals' | 'custom';
	value: any;
	customValidator?: (context: AuthorizationContext) => boolean;
}

export interface AuthorizationContext {
	userId: string;
	userRoles: string[];
	userPermissions: string[];
	departmentId?: string;
	managerId?: string;
	isAdmin: boolean;
	customData?: Record<string, any>;
}

export interface FieldAccessResult {
	fieldPath: string;
	isAllowed: boolean;
	missingPermissions: string[];
	missingRoles: string[];
	sensitivityViolation?: string;
	conditionalAccess?: boolean;
	reason?: string;
}

export interface QueryAuthorizationResult {
	isAuthorized: boolean;
	fieldResults: FieldAccessResult[];
	requiredPermissions: string[];
	userPermissions: string[];
	deniedFields: string[];
	sensitiveFieldsAccessed: string[];
	securityLevel: 'low' | 'medium' | 'high' | 'critical';
	recommendations: string[];
}

export interface FieldAuthorizationConfig {
	strictMode: boolean;
	allowPartialQueries: boolean;
	logUnauthorizedAccess: boolean;
	enableSensitivityAnalysis: boolean;
	defaultSensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
	customPermissionResolver?: (field: string, context: AuthorizationContext) => string[];
}

const DEFAULT_CONFIG: FieldAuthorizationConfig = {
	strictMode: false,
	allowPartialQueries: true,
	logUnauthorizedAccess: true,
	enableSensitivityAnalysis: true,
	defaultSensitivityLevel: 'internal'
};

/**
 * Default field permission rules for HR system
 */
const HR_FIELD_PERMISSION_RULES: FieldPermissionRule[] = [
	// User sensitive fields
	{
		fieldPath: 'User.salary',
		requiredPermissions: ['salary:read'],
		requiredRoles: ['HR_Manager', 'Admin'],
		sensitivityLevel: 'confidential'
	},
	{
		fieldPath: 'User.personalData',
		requiredPermissions: ['personal_data:read'],
		requiredRoles: ['HR_Manager', 'Admin'],
		sensitivityLevel: 'restricted',
		conditions: [
			{
				type: 'ownership',
				field: 'id',
				operator: 'equals',
				value: 'userId'
			}
		]
	},
	{
		fieldPath: 'User.permissions',
		requiredPermissions: ['permissions:read'],
		requiredRoles: ['Admin'],
		sensitivityLevel: 'restricted'
	},

	// Employee fields
	{
		fieldPath: 'Employee.performanceScore',
		requiredPermissions: ['performance:read'],
		requiredRoles: ['HR_Manager', 'Manager', 'Admin'],
		sensitivityLevel: 'confidential',
		conditions: [
			{
				type: 'role_hierarchy',
				field: 'managerId',
				operator: 'equals',
				value: 'userId'
			}
		]
	},
	{
		fieldPath: 'Employee.disciplinaryActions',
		requiredPermissions: ['disciplinary:read'],
		requiredRoles: ['HR_Manager', 'Admin'],
		sensitivityLevel: 'restricted'
	},

	// Department sensitive fields
	{
		fieldPath: 'Department.budget',
		requiredPermissions: ['budget:read'],
		requiredRoles: ['Manager', 'HR_Manager', 'Admin'],
		sensitivityLevel: 'confidential'
	},
	{
		fieldPath: 'Department.strategicPlans',
		requiredPermissions: ['strategic_plans:read'],
		requiredRoles: ['Manager', 'Admin'],
		sensitivityLevel: 'confidential'
	},

	// System fields
	{
		fieldPath: '*.auditLog',
		requiredPermissions: ['audit:read'],
		requiredRoles: ['Admin'],
		sensitivityLevel: 'restricted'
	},
	{
		fieldPath: '*.systemSettings',
		requiredPermissions: ['system:read'],
		requiredRoles: ['Admin'],
		sensitivityLevel: 'restricted'
	},

	// Performance review fields
	{
		fieldPath: 'PerformanceReview.confidentialNotes',
		requiredPermissions: ['performance:read_confidential'],
		requiredRoles: ['HR_Manager', 'Admin'],
		sensitivityLevel: 'restricted'
	},

	// Leave request sensitive fields
	{
		fieldPath: 'LeaveRequest.medicalDocuments',
		requiredPermissions: ['medical_data:read'],
		requiredRoles: ['HR_Manager', 'Admin'],
		sensitivityLevel: 'restricted',
		conditions: [
			{
				type: 'ownership',
				field: 'employeeId',
				operator: 'equals',
				value: 'userId'
			}
		]
	}
];

export class FieldAuthorizationValidator {
	private config: FieldAuthorizationConfig;
	private schema?: GraphQLSchema;
	private permissionRules: Map<string, FieldPermissionRule> = new Map();
	private sensitiveFields: Set<string> = new Set();

	constructor(
		config: Partial<FieldAuthorizationConfig> = {},
		schema?: GraphQLSchema,
		customRules: FieldPermissionRule[] = []
	) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.schema = schema;

		// Load default HR rules and custom rules
		this.loadPermissionRules([...HR_FIELD_PERMISSION_RULES, ...customRules]);
		this.buildSensitiveFieldsIndex();
	}

	/**
	 * Validate field-level authorization for a GraphQL query
	 */
	validateQueryAuthorization(
		document: DocumentNode,
		context: AuthorizationContext,
		variables: Record<string, any> = {}
	): QueryAuthorizationResult {
		const fieldResults: FieldAccessResult[] = [];
		const requiredPermissions = new Set<string>();
		const deniedFields: string[] = [];
		const sensitiveFieldsAccessed: string[] = [];
		const fieldPath: string[] = [];

		const typeInfo = this.schema ? new TypeInfo(this.schema) : null;

		const visitor = {
			Field: {
				enter: (node: FieldNode) => {
					const fieldName = node.name.value;
					const parentType = typeInfo?.getParentType();
					const parentTypeName = parentType?.name || 'Unknown';

					fieldPath.push(fieldName);
					const currentFieldPath = `${parentTypeName}.${fieldName}`;

					// Check field authorization
					const accessResult = this.validateFieldAccess(
						currentFieldPath,
						fieldPath,
						context,
						variables
					);

					fieldResults.push(accessResult);

					// Track required permissions
					accessResult.missingPermissions.forEach((permission) =>
						requiredPermissions.add(permission)
					);

					// Track denied fields
					if (!accessResult.isAllowed) {
						deniedFields.push(currentFieldPath);
					}

					// Track sensitive fields
					if (this.isSensitiveField(currentFieldPath)) {
						sensitiveFieldsAccessed.push(currentFieldPath);
					}
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

		// Calculate overall authorization status
		const isAuthorized = this.config.allowPartialQueries
			? deniedFields.length === 0 || fieldResults.some((r) => r.isAllowed)
			: deniedFields.length === 0;

		// Determine security level
		const securityLevel = this.calculateSecurityLevel(sensitiveFieldsAccessed, deniedFields.length);

		// Generate recommendations
		const recommendations = this.generateSecurityRecommendations(
			fieldResults,
			sensitiveFieldsAccessed,
			context
		);

		return {
			isAuthorized,
			fieldResults,
			requiredPermissions: Array.from(requiredPermissions),
			userPermissions: context.userPermissions,
			deniedFields,
			sensitiveFieldsAccessed,
			securityLevel,
			recommendations
		};
	}

	/**
	 * Validate access to a specific field
	 */
	private validateFieldAccess(
		fieldPath: string,
		fullPath: string[],
		context: AuthorizationContext,
		variables: Record<string, any>
	): FieldAccessResult {
		const rule = this.findMatchingRule(fieldPath);

		if (!rule) {
			// No specific rule - allow based on default sensitivity
			const sensitivityLevel = this.config.defaultSensitivityLevel;
			const isAllowed = this.checkDefaultAccess(sensitivityLevel, context);

			return {
				fieldPath,
				isAllowed,
				missingPermissions: [],
				missingRoles: [],
				reason: isAllowed ? 'Default access granted' : 'Default access denied'
			};
		}

		// Check permissions
		const missingPermissions = rule.requiredPermissions.filter(
			(permission) => !context.userPermissions.includes(permission)
		);

		// Check roles
		const missingRoles = rule.requiredRoles.filter((role) => !context.userRoles.includes(role));

		// Check conditions
		const conditionsMet = this.evaluateAccessConditions(rule.conditions || [], context, variables);

		// Determine access
		const hasRequiredPermissions = missingPermissions.length === 0;
		const hasRequiredRoles = missingRoles.length === 0;
		const isAllowed = hasRequiredPermissions && hasRequiredRoles && conditionsMet;

		// Check sensitivity violation
		const sensitivityViolation = this.checkSensitivityViolation(
			rule.sensitivityLevel,
			context,
			isAllowed
		);

		return {
			fieldPath,
			isAllowed: isAllowed && !sensitivityViolation,
			missingPermissions,
			missingRoles,
			sensitivityViolation,
			conditionalAccess: rule.conditions && rule.conditions.length > 0,
			reason: this.generateAccessReason(isAllowed, missingPermissions, missingRoles, conditionsMet)
		};
	}

	/**
	 * Find matching permission rule for a field path
	 */
	private findMatchingRule(fieldPath: string): FieldPermissionRule | undefined {
		// Exact match
		const exactRule = this.permissionRules.get(fieldPath);
		if (exactRule) return exactRule;

		// Wildcard match (*.fieldName)
		const fieldName = fieldPath.split('.').pop();
		if (fieldName) {
			const wildcardRule = this.permissionRules.get(`*.${fieldName}`);
			if (wildcardRule) return wildcardRule;
		}

		// Parent type wildcard (ParentType.*)
		const typeName = fieldPath.split('.')[0];
		const parentWildcardRule = this.permissionRules.get(`${typeName}.*`);
		if (parentWildcardRule) return parentWildcardRule;

		return undefined;
	}

	/**
	 * Evaluate access conditions
	 */
	private evaluateAccessConditions(
		conditions: FieldAccessCondition[],
		context: AuthorizationContext,
		variables: Record<string, any>
	): boolean {
		if (conditions.length === 0) return true;

		return conditions.every((condition) => {
			switch (condition.type) {
				case 'ownership':
					return this.evaluateOwnershipCondition(condition, context, variables);

				case 'department':
					return this.evaluateDepartmentCondition(condition, context);

				case 'role_hierarchy':
					return this.evaluateRoleHierarchyCondition(condition, context);

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
	private evaluateOwnershipCondition(
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
	private evaluateDepartmentCondition(
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
	private evaluateRoleHierarchyCondition(
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

	/**
	 * Check for sensitivity level violations
	 */
	private checkSensitivityViolation(
		sensitivityLevel: string,
		context: AuthorizationContext,
		hasAccess: boolean
	): string | undefined {
		if (!this.config.enableSensitivityAnalysis || hasAccess) return undefined;

		const userMaxSensitivity = this.getUserMaxSensitivityLevel(context);
		const fieldSensitivityLevel = this.getSensitivityLevelNumber(sensitivityLevel);
		const userSensitivityLevel = this.getSensitivityLevelNumber(userMaxSensitivity);

		if (fieldSensitivityLevel > userSensitivityLevel) {
			return `Field sensitivity level '${sensitivityLevel}' exceeds user level '${userMaxSensitivity}'`;
		}

		return undefined;
	}

	/**
	 * Get user's maximum sensitivity level based on roles
	 */
	private getUserMaxSensitivityLevel(context: AuthorizationContext): string {
		if (context.isAdmin) return 'restricted';
		if (context.userRoles.includes('HR_Manager')) return 'restricted';
		if (context.userRoles.includes('Manager')) return 'confidential';
		return 'internal';
	}

	/**
	 * Convert sensitivity level to numeric value for comparison
	 */
	private getSensitivityLevelNumber(level: string): number {
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
	private checkDefaultAccess(sensitivityLevel: string, context: AuthorizationContext): boolean {
		const userMaxLevel = this.getUserMaxSensitivityLevel(context);
		const fieldLevel = this.getSensitivityLevelNumber(sensitivityLevel);
		const userLevel = this.getSensitivityLevelNumber(userMaxLevel);

		return userLevel >= fieldLevel;
	}

	/**
	 * Generate access reason explanation
	 */
	private generateAccessReason(
		isAllowed: boolean,
		missingPermissions: string[],
		missingRoles: string[],
		conditionsMet: boolean
	): string {
		if (isAllowed) {
			return 'Access granted: All requirements met';
		}

		const reasons: string[] = [];

		if (missingPermissions.length > 0) {
			reasons.push(`Missing permissions: ${missingPermissions.join(', ')}`);
		}

		if (missingRoles.length > 0) {
			reasons.push(`Missing roles: ${missingRoles.join(', ')}`);
		}

		if (!conditionsMet) {
			reasons.push('Access conditions not met');
		}

		return `Access denied: ${reasons.join('; ')}`;
	}

	/**
	 * Calculate overall security level of the query
	 */
	private calculateSecurityLevel(
		sensitiveFields: string[],
		deniedFieldsCount: number
	): 'low' | 'medium' | 'high' | 'critical' {
		if (deniedFieldsCount > 0) return 'critical';

		const restrictedFields = sensitiveFields.filter((field) => {
			const rule = this.findMatchingRule(field);
			return rule?.sensitivityLevel === 'restricted';
		});

		const confidentialFields = sensitiveFields.filter((field) => {
			const rule = this.findMatchingRule(field);
			return rule?.sensitivityLevel === 'confidential';
		});

		if (restrictedFields.length > 0) return 'critical';
		if (confidentialFields.length > 2) return 'high';
		if (sensitiveFields.length > 0) return 'medium';

		return 'low';
	}

	/**
	 * Generate security recommendations
	 */
	private generateSecurityRecommendations(
		fieldResults: FieldAccessResult[],
		sensitiveFields: string[],
		context: AuthorizationContext
	): string[] {
		const recommendations: string[] = [];

		// Check for denied fields
		const deniedFields = fieldResults.filter((r) => !r.isAllowed);
		if (deniedFields.length > 0) {
			recommendations.push(
				`${deniedFields.length} fields denied. Consider requesting appropriate permissions.`
			);
		}

		// Check for excessive sensitive field access
		if (sensitiveFields.length > 5) {
			recommendations.push(
				'Query accesses many sensitive fields. Consider limiting scope for better security.'
			);
		}

		// Check for missing admin privileges
		const adminRequiredFields = fieldResults.filter((r) => r.missingRoles.includes('Admin'));
		if (adminRequiredFields.length > 0 && !context.isAdmin) {
			recommendations.push(
				'Some fields require admin privileges. Contact system administrator if access is needed.'
			);
		}

		// Check for permission patterns
		const commonMissingPermissions = this.findCommonMissingPermissions(fieldResults);
		if (commonMissingPermissions.length > 0) {
			recommendations.push(
				`Consider requesting these common permissions: ${commonMissingPermissions.join(', ')}`
			);
		}

		return recommendations;
	}

	/**
	 * Find common missing permissions across field results
	 */
	private findCommonMissingPermissions(fieldResults: FieldAccessResult[]): string[] {
		const permissionCounts = new Map<string, number>();

		fieldResults.forEach((result) => {
			result.missingPermissions.forEach((permission) => {
				permissionCounts.set(permission, (permissionCounts.get(permission) || 0) + 1);
			});
		});

		return Array.from(permissionCounts.entries())
			.filter(([_, count]) => count >= 2) // Appears in 2 or more fields
			.sort((a, b) => b[1] - a[1]) // Sort by frequency
			.slice(0, 3) // Top 3
			.map(([permission]) => permission);
	}

	/**
	 * Load permission rules into the validator
	 */
	private loadPermissionRules(rules: FieldPermissionRule[]): void {
		rules.forEach((rule) => {
			this.permissionRules.set(rule.fieldPath, rule);
		});
	}

	/**
	 * Build index of sensitive fields for quick lookup
	 */
	private buildSensitiveFieldsIndex(): void {
		this.permissionRules.forEach((rule) => {
			if (rule.sensitivityLevel !== 'public') {
				this.sensitiveFields.add(rule.fieldPath);
			}
		});
	}

	/**
	 * Check if a field is marked as sensitive
	 */
	private isSensitiveField(fieldPath: string): boolean {
		return (
			this.sensitiveFields.has(fieldPath) ||
			this.findMatchingRule(fieldPath)?.sensitivityLevel !== 'public'
		);
	}

	/**
	 * Add custom permission rule
	 */
	addPermissionRule(rule: FieldPermissionRule): void {
		this.permissionRules.set(rule.fieldPath, rule);
		if (rule.sensitivityLevel !== 'public') {
			this.sensitiveFields.add(rule.fieldPath);
		}
	}

	/**
	 * Remove permission rule
	 */
	removePermissionRule(fieldPath: string): void {
		this.permissionRules.delete(fieldPath);
		this.sensitiveFields.delete(fieldPath);
	}

	/**
	 * Get all permission rules
	 */
	getPermissionRules(): FieldPermissionRule[] {
		return Array.from(this.permissionRules.values());
	}

	/**
	 * Update configuration
	 */
	updateConfig(newConfig: Partial<FieldAuthorizationConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	/**
	 * Get current configuration
	 */
	getConfig(): FieldAuthorizationConfig {
		return { ...this.config };
	}
}

export default FieldAuthorizationValidator;
