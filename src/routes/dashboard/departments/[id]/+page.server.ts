// Server-side data loading for department detail page
// Follows RBAC patterns with server-side API calls only

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { params, locals, cookies } = event;
	const departmentId = params.id;

	// RBAC: Check department read permissions
	PermissionChecks.departmentRead(event);

	// Import required models for standardized error handling
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
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
				console.warn('[Department Detail] Failed to decode JWT:', error);
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

		// Load department data with all related information
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
							createdAt
							updatedAt
							userByManagerId {
								id
								displayName
								firstName
								lastName
								email
								role
								hireDate
								isActive
							}
							usersByDepartmentId {
								nodes {
									id
									displayName
									firstName
									lastName
									email
									role
									hireDate
									isActive
									departmentId
								}
								totalCount
							}
						}
					}
				`,
				variables: {
					id: departmentId
				}
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
				createdAt: department.createdAt,
				updatedAt: department.updatedAt,
				manager: department.userByManagerId,
				employees: department.usersByDepartmentId.nodes,
				employeeCount: department.usersByDepartmentId.totalCount
			},
			// RBAC: Standardized permission checks
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		console.error('[Department Detail Load Error]', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Throw SvelteKit error with user-friendly message
		throw error(500, 'Unable to load department details');
	}
};
