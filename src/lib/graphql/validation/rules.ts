import type { FieldAuthorizationConfig, FieldPermissionRule } from './types';

export const DEFAULT_CONFIG: FieldAuthorizationConfig = {
	strictMode: false,
	allowPartialQueries: true,
	logUnauthorizedAccess: true,
	enableSensitivityAnalysis: true,
	defaultSensitivityLevel: 'internal'
};

/**
 * Default field permission rules for HR system
 */
export const HR_FIELD_PERMISSION_RULES: FieldPermissionRule[] = [
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
