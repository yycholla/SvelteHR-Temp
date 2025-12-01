/**
 * Zod schemas for role validation
 * Used for runtime validation of role data from GraphQL backend
 */

import { z } from 'zod';

/**
 * Schema for a single role object
 * Validates that role has required fields with correct types
 */
export const roleSchema = z.object({
	id: z.string().uuid('Role ID must be a valid UUID'),
	name: z.string().min(1, 'Role name is required'),
	description: z.string().optional().nullable(),
	level: z.number().int().min(0).optional().nullable()
});

/**
 * Schema for an array of roles
 * Filters out invalid roles and logs warnings
 */
export const rolesArraySchema = z.array(roleSchema);

/**
 * Type inference from schema
 */
export type Role = z.infer<typeof roleSchema>;

/**
 * Validate and filter roles array
 * Returns only valid roles and logs warnings for invalid ones
 */
export function validateRoles(roles: unknown[]): Role[] {
	const validRoles: Role[] = [];

	for (const role of roles) {
		const result = roleSchema.safeParse(role);
		if (result.success) {
			validRoles.push(result.data);
		} else {
			console.warn('[Role Validation] Invalid role data:', {
				role,
				errors: (result.error as any).errors
			});
		}
	}

	return validRoles;
}
