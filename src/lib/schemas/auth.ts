import { z } from 'zod';

// Login schema
export const loginSchema = z.object({
	username: z
		.string()
		.min(1, 'Username is required')
		.max(100, 'Username must be less than 100 characters'),
	password: z
		.string()
		.min(1, 'Password is required')
		.max(100, 'Password must be less than 100 characters'),
	rememberMe: z.boolean().default(false).optional(),
});

// RBAC Role schema
export const roleSchema = z.object({
	id: z.string(),
	name: z.string(),
	display_name: z.string().optional(),
	description: z.string().optional(),
	level: z.number().optional(),
	is_system: z.boolean().optional(),
	parent_role: z.string().nullable().optional(),
	user_count: z.number().optional(),
	permission_count: z.number().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional()
});

// RBAC Permission schema
export const permissionSchema = z.object({
	id: z.string(),
	name: z.string(),
	display_name: z.string().optional(),
	description: z.string().optional(),
	resource: z.string().optional(),
	action: z.string().optional(),
	scope: z.string().optional(),
	is_system: z.boolean().optional(),
	role_count: z.number().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional()
});

// User Role assignment schema
export const userRoleSchema = z.object({
	id: z.string(),
	user_id: z.string(),
	role_id: z.string(),
	role: roleSchema,
	granted_by: z.string().nullable().optional(),
	expires_at: z.string().nullable().optional(),
	is_active: z.boolean().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional()
});

// RBAC User schema matching new structure
export const userSchema = z.object({
	id: z.string(),
	username: z.string(),
	email: z.string().email(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	middle_name: z.string().optional(),
	employee_id: z.string().optional(),
	full_name: z.string().optional(),
	display_name: z.string().optional(),
	search_name: z.string().optional(),
	is_active: z.boolean(),
	is_verified: z.boolean().optional(),
	last_login: z.string().nullable().optional(),
	failed_login_attempts: z.number().optional(),
	locked_until: z.string().nullable().optional(),
	onboarding_status: z.string().optional(),
	manager_id: z.string().nullable().optional(),
	is_manager: z.boolean().optional(),
	direct_report_count: z.number().optional(),
	management_level: z.number().optional(),
	// Computed HR properties from linked data
	department_name: z.string().nullable().optional(),
	job_title: z.string().nullable().optional(),
	hire_date: z.string().nullable().optional(),
	employment_type: z.string().nullable().optional(),
	contact_email: z.string().nullable().optional(),
	phone_number: z.string().nullable().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional()
}).transform(user => ({
	// Transform to expected frontend format
	id: user.id,
	username: user.username,
	email: user.email,
	full_name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
	firstName: user.first_name,
	lastName: user.last_name,
	middleName: user.middle_name,
	employeeId: user.employee_id,
	displayName: user.display_name,
	searchName: user.search_name,
	isActive: user.is_active,
	isVerified: user.is_verified || false,
	lastLogin: user.last_login,
	failedLoginAttempts: user.failed_login_attempts || 0,
	lockedUntil: user.locked_until,
	onboardingStatus: user.onboarding_status,
	managerId: user.manager_id,
	isManager: user.is_manager || false,
	directReportCount: user.direct_report_count || 0,
	managementLevel: user.management_level || 0,
	// HR properties
	departmentName: user.department_name,
	jobTitle: user.job_title,
	hireDate: user.hire_date,
	employmentType: user.employment_type,
	contactEmail: user.contact_email,
	phoneNumber: user.phone_number,
	createdAt: user.created_at,
	updatedAt: user.updated_at,
	// These will be populated from separate API calls or includes
	roles: [] as any[],
	permissions: [] as string[]
}));

// JWT token payload schema (matching backend structure)
export const tokenPayloadSchema = z.object({
	user_id: z.number().transform(val => String(val)), // Transform to string for consistency
	email: z.string(),
	role_id: z.number().transform(val => `ROLE_${val}`), // Transform to role string
	iss: z.string().optional(),
	sub: z.string().optional(),
	exp: z.number(),
	nbf: z.number().optional(),
	iat: z.number(),
}).transform(payload => ({
	// Transform to the expected frontend format
	userId: String(payload.user_id),
	username: payload.email, // Use email as username
	role: payload.role_id,
	exp: payload.exp,
	iat: payload.iat,
}));

// Password reset schema
export const passwordResetSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
});

// Password change schema
export const passwordChangeSchema = z.object({
	currentPassword: z.string().min(1, 'Current password is required'),
	newPassword: z
		.string()
		.min(8, 'New password must be at least 8 characters')
		.regex(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
			'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
		),
	confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
	message: "Passwords don't match",
	path: ['confirmPassword'],
});

// V2 API response schemas for RBAC (matching actual backend response)
export const v2LoginResponseSchema = z.object({
	token: z.string(),
	token_type: z.string(),
	expires_at: z.string(),
	user: z.object({
		id: z.string(),
		username: z.string(),
		email: z.string(),
		first_name: z.string().optional(),
		last_name: z.string().optional(),
		full_name: z.string().optional(),
		is_active: z.boolean().optional(),
		is_verified: z.boolean().optional(),
		last_login: z.string().nullable().optional(),
		created_at: z.string().optional(),
		updated_at: z.string().optional(),
		status: z.string().optional(),
		hire_date: z.string().nullable().optional(),
		termination_date: z.string().nullable().optional(),
		department_id: z.string().nullable().optional(),
		manager_id: z.string().nullable().optional(),
		is_manager: z.boolean().optional(),
		// Nested roles and permissions in user object
		roles: z.array(z.object({
			id: z.string(),
			name: z.string(),
			display_name: z.string().optional(),
			description: z.string().optional(),
			level: z.number().optional(),
			is_system: z.boolean().optional(),
			is_active: z.boolean().optional(),
			created_at: z.string().optional(),
			updated_at: z.string().optional()
		})).optional(),
		permissions: z.array(z.string()).optional()
	}),
	// Root level roles and permissions (duplicates of user.roles/permissions)
	roles: z.array(z.object({
		id: z.string(),
		name: z.string(),
		display_name: z.string().optional(),
		description: z.string().optional(),
		level: z.number().optional(),
		is_system: z.boolean().optional(),
		is_active: z.boolean().optional(),
		created_at: z.string().optional(),
		updated_at: z.string().optional()
	})).optional(),
	permissions: z.array(z.string()).optional()
}).transform(response => {
	// Transform to expected frontend format
	return {
		token: response.token,
		token_type: response.token_type,
		expires_at: response.expires_at,
		user: {
			id: response.user.id,
			username: response.user.username,
			email: response.user.email,
			full_name: response.user.full_name || `${response.user.first_name || ''} ${response.user.last_name || ''}`.trim(),
			first_name: response.user.first_name,
			last_name: response.user.last_name,
			is_active: response.user.is_active ?? true,
			is_verified: response.user.is_verified ?? false,
			last_login: response.user.last_login,
			created_at: response.user.created_at,
			updated_at: response.user.updated_at,
			status: response.user.status,
			hire_date: response.user.hire_date,
			termination_date: response.user.termination_date,
			department_id: response.user.department_id,
			manager_id: response.user.manager_id,
			is_manager: response.user.is_manager ?? false,
			// Use the root level roles/permissions (they're the same as user.roles/permissions)
			roles: response.roles || response.user.roles || [],
			permissions: response.permissions || response.user.permissions || []
		}
	};
});

// Legacy API response schema (for compatibility)
export const loginResponseSchema = z.object({
	token: z.string(),
	user: userSchema,
	expiresIn: z.number().optional(),
});

export const authErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
	statusCode: z.number(),
});

// Export types
export type LoginInput = z.infer<typeof loginSchema>;
export type User = z.infer<typeof userSchema>;
export type Role = z.infer<typeof roleSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type V2LoginResponse = z.infer<typeof v2LoginResponseSchema>;
export type AuthError = z.infer<typeof authErrorSchema>;