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
		.min(6, 'Password must be at least 6 characters')
		.max(100, 'Password must be less than 100 characters'),
	rememberMe: z.boolean().default(false).optional(),
});

// User profile schema (based on backend User model)
export const userSchema = z.object({
	id: z.string(),
	username: z.string(),
	email: z.string().email(),
	firstName: z.string(),
	lastName: z.string(),
	isActive: z.boolean(),
	role: z.enum(['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE']),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

// JWT token payload schema
export const tokenPayloadSchema = z.object({
	userId: z.string(),
	username: z.string(),
	role: z.string(),
	exp: z.number(),
	iat: z.number(),
});

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