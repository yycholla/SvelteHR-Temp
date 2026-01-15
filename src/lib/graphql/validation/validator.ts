import type { DocumentNode, FieldNode } from 'graphql';
import { TypeInfo, visit, visitWithTypeInfo, GraphQLSchema } from 'graphql';
import type {
	AuthorizationContext,
	FieldAccessResult,
	FieldAuthorizationConfig,
	FieldPermissionRule,
	QueryAuthorizationResult
} from './types';
import { DEFAULT_CONFIG, HR_FIELD_PERMISSION_RULES } from './rules';
import { evaluateAccessConditions } from './evaluators';
import {
	calculateSecurityLevel,
	checkDefaultAccess,
	checkSensitivityViolation
} from './sensitivity';

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
					accessResult.missingPermissions.forEach((permission: string) =>
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
		const securityLevel = calculateSecurityLevel(
			sensitiveFieldsAccessed,
			deniedFields.length,
			(field) => this.findMatchingRule(field)
		);

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
			const isAllowed = checkDefaultAccess(sensitivityLevel, context);

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
		const conditionsMet = evaluateAccessConditions(rule.conditions || [], context, variables);

		// Determine access
		const hasRequiredPermissions = missingPermissions.length === 0;
		const hasRequiredRoles = missingRoles.length === 0;
		const isAllowed = hasRequiredPermissions && hasRequiredRoles && conditionsMet;

		// Check sensitivity violation
		const sensitivityViolation = checkSensitivityViolation(
			this.config,
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
			result.missingPermissions.forEach((permission: string) => {
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
