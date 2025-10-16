// Server-side data loading and form handling for department edit page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad, Actions } from './$types';
import { error, redirect, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies } = event;
	const departmentId = params.id;

	// RBAC: Check department write permissions
	PermissionChecks.departmentWrite(event);

	// Import required models
	const { createUserSession } = await import('$lib/models/user-session');

	// Ensure user is authenticated
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	// Create user session from server locals
	const userSession = createUserSession({
		userId: locals.user.id,
		jwtToken: '', // Session-based auth doesn't use client-side JWT tokens
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	try {
		// Make direct GraphQL calls to PostGraphile backend
		const { getGraphQLEndpoint } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();


				jwtClaims = await decodeJWTTokenUnsafe(jwtToken);
			} catch (error) {
				console.warn('[Department Edit] Failed to decode JWT:', error);
			}
		}

		// Headers for session-based authentication
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};

		if (jwtClaims) {
			headers['X-JWT-Claims-Role'] = jwtClaims.role || 'employee';
			headers['X-JWT-Claims-User-Id'] = jwtClaims.user_id;
		}

		// Load department data with employees
		const departmentResponse = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				query: `
					query GetDepartmentById($id: UUID!) {
						department: departmentById(id: $id) {
							id
							name
							description
							managerId
							userByManagerId {
								id
								displayName
							}
							usersByDepartmentId {
								nodes {
									id
									displayName
									role
									isActive
								}
							}
						}
					}
				`,
				variables: { id: departmentId }
			})
		});

		const departmentData = await departmentResponse.json();

		// Check if department exists
		if (!departmentData?.data?.department) {
			throw error(404, 'Department not found');
		}

		const department = departmentData.data.department;

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			department: {
				id: department.id,
				name: department.name,
				description: department.description,
				managerId: department.managerId,
				manager: department.userByManagerId
			},
			users: (department.usersByDepartmentId?.nodes || []).filter((user: any) => user.isActive),
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Department Edit Load Error]', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Throw SvelteKit error with user-friendly message
		throw error(500, 'Unable to load department data');
	}
};

export const actions: Actions = {
	default: async (event) => {
		const { request, params, cookies } = event;
		const departmentId = params.id;

		// RBAC: Check department write permissions
		PermissionChecks.departmentWrite(event);

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();

			// Basic validation
			if (!name) {
				return fail(400, {
					error: 'Department name is required'
				});
			}

			// Make GraphQL update mutation
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			let jwtClaims = null;
			if (jwtToken) {
				try {
					const { decodeJWTTokenUnsafe } = await import('$lib/auth/jwt-utils');
					jwtClaims = await decodeJWTTokenUnsafe(jwtToken);
				} catch (error) {
					console.warn('[Department Update] Failed to decode JWT:', error);
				}
			}

			const headers: Record<string, string> = {
				'Content-Type': 'application/json'
			};

			if (jwtClaims) {
				headers['X-JWT-Claims-Role'] = jwtClaims.role || 'employee';
				headers['X-JWT-Claims-User-Id'] = jwtClaims.user_id;
			}

			const updateResponse = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation UpdateDepartment($id: UUID!, $departmentPatch: DepartmentPatch!) {
							updateDepartmentById(input: { id: $id, departmentPatch: $departmentPatch }) {
								department {
									id
									name
									description
									managerId
								}
							}
						}
					`,
					variables: {
						id: departmentId,
						departmentPatch: {
							name,
							description: description || null,
							managerId: managerId || null
						}
					}
				})
			});

			const updateData = await updateResponse.json();

			if (updateData.errors) {
				console.error('[Department Update Error]', updateData.errors);
				return fail(500, {
					error: 'Failed to update department'
				});
			}

			// Redirect to department detail page on success
			throw redirect(303, `/dashboard/departments/${departmentId}`);
		} catch (err) {
			// If it's a redirect, rethrow it
			if (err && typeof err === 'object' && 'status' in err && (err as any).status === 303) {
				throw err;
			}

			console.error('[Department Update Action Error]', err);
			return fail(500, {
				error: 'Failed to update department'
			});
		}
	}
};
