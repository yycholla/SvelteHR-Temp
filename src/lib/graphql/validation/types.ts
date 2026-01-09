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
