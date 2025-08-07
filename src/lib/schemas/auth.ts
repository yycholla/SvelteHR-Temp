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

// User profile schema (based on backend User model)
export const userSchema = z.object({
	id: z.union([z.string(), z.number()]).transform(val => String(val)),
	username: z.string(),
	email: z.string().email(),
	firstName: z.string(),
	lastName: z.string(),
	isActive: z.boolean().optional().default(true),
	role: z.union([
		z.string(),
		z.object({
			name: z.string(),
			id: z.union([z.string(), z.number()]).optional(),
			code: z.string().optional()
		}).transform(obj => obj.name || obj.code || 'EMPLOYEE')
	]),
	createdAt: z.string().datetime().optional(),
	updatedAt: z.string().datetime().optional(),
});

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

// API response schemas
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
export type TokenPayload = z.infer<typeof tokenPayloadSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
export type AuthError = z.infer<typeof authErrorSchema>;