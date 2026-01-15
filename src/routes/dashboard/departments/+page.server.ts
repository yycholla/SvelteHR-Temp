// Server-side data loading for departments page
// T036: Fix department management pages with standardized error handling
// REFACTORED: Phase 1 Foundation - Integration Proof-of-Concept #3
// Demonstrates: RBACDataLoader, UnifiedGraphQLClient, QueryParamExtractor

import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { logger } from '$lib/utils/logger';
import { PermissionChecks } from '$lib/server/rbac-utils';

// Phase 1 Foundation Utilities
import { RBACDataLoader } from '$lib/server/route-loaders';
import { QueryParamExtractor } from '$lib/server/route-helpers/query-params';

export const load: PageServerLoad = async (event) => {
	const { url } = event;

	// Use RBACDataLoader - handles auth, session, permissions automatically
	const loader = new RBACDataLoader(event, [
		'departments:read',
		'departments:read:self',
		'departments:read:team',
		'departments:read:all'
	]);

	return loader.loadWithClient(async (client) => {
		// Use QueryParamExtractor for type-safe URL parameter extraction
		const params = new QueryParamExtractor(url);
		const { page, limit } = params.getPagination(20);

		// Extract all filter parameters
		const filters = {
			searchTerm: params.getString('search'),
			parentFilter: params.getString('parent'),
			hasHeadFilter: params.getString('hasHead')
		};

		logger.info('[Departments] Filters', filters);

		// GraphQL query definitions
		const GET_DEPARTMENTS_QUERY = `
			query GetDepartments($limit: Int, $offset: Int) {
				departments(limit: $limit, offset: $offset) {
					id
					name
					description
					managerId
					parentDepartmentId
					createdAt
					updatedAt
				}
			}
		`;

		const GET_USERS_QUERY = `
			query GetUsers {
				users(limit: 1000) {
					id
					displayName
					email
					departmentId
					roles {
						id
						name
					}
					isActive
				}
			}
		`;

		// Use UnifiedGraphQLClient to execute all queries
		const departments = await client.query(
			GET_DEPARTMENTS_QUERY,
			{ limit, offset: (page - 1) * limit },
			{
				operationName: 'GetDepartments',
				errorMessage: 'Failed to load departments',
				dataPath: 'departments'
			}
		);

		const users = await client.query(
			GET_USERS_QUERY,
			{},
			{
				operationName: 'GetUsers',
				errorMessage: 'Failed to load users',
				dataPath: 'users'
			}
		);

		logger.info('[Departments] Departments data loaded', {
			count: departments?.length || 0
		});

		// Enrich departments with related data
		const enrichedDepartments = (departments || []).map((dept: any) => {
			// Find manager/department head from users list
			const departmentHead = dept.managerId
				? users.find((u: any) => u.id === dept.managerId)
				: null;

			// Count employees in this department
			const employeesInDept = users.filter((u: any) => u.departmentId === dept.id);
			const employeeCount = employeesInDept.length;

			// Find parent department
			const parentDepartment = dept.parentDepartmentId
				? departments.find((d: any) => d.id === dept.parentDepartmentId)
				: null;

			// Count sub-departments
			const subDepartments = (departments || []).filter(
				(d: any) => d.parentDepartmentId === dept.id
			);

			return {
				...dept,
				employees: {
					nodes: employeesInDept,
					totalCount: employeeCount
				},
				departmentHead: departmentHead
					? {
							id: departmentHead.id,
							displayName: departmentHead.displayName,
							email: departmentHead.email,
							jobTitle: departmentHead.roles?.[0]?.name || 'Manager'
						}
					: null,
				parentDepartment: parentDepartment
					? {
							id: parentDepartment.id,
							name: parentDepartment.name
						}
					: null,
				subDepartments: {
					nodes: subDepartments,
					totalCount: subDepartments.length
				}
			};
		});

		// Return standardized data structure
		// RBACDataLoader already includes userSession and permissions
		return {
			departments: enrichedDepartments,
			users: users.filter((u: any) => u.isActive), // Return only active users for dropdowns
			totalDepartments: enrichedDepartments.length,
			hierarchy: [], // For now, return empty hierarchy
			filters: {
				...filters,
				page,
				limit
			}
		};
	});
};

export const actions: Actions = {
	create: async (event) => {
		const { request } = event;

		// RBAC: Check department write permissions
		PermissionChecks.departmentWrite(event);

		// After permission check, re-destructure locals
		const { locals } = event;

		try {
			const formData = await request.formData();
			const name = formData.get('name')?.toString();
			const description = formData.get('description')?.toString();
			const managerId = formData.get('managerId')?.toString();

			// Validate required fields
			if (!name) {
				return fail(400, {
					error: 'Department name is required'
				});
			}

			// Make GraphQL mutation with session-based authentication
			const { getGraphQLEndpoint, authenticatedGraphQLRequest } =
				await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			// Build input object
			const input: any = {
				name,
				description: description || null,
				managerId: managerId || null
			};

			const createResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				`
					mutation CreateDepartment($input: CreateDepartmentInput!) {
						departments {
							createDepartment(input: $input) {
								id
								name
								description
								managerId
							}
						}
					}
				`,
				{ input },
				request
			);

			logger.info('[Departments] Department creation request sent', {
				name
			});

			const createData = await createResponse.json();

			if (createData.errors) {
				const errorMsg = createData.errors[0]?.message || 'Failed to create department';
				logger.error('[Departments] GraphQL errors', new Error(errorMsg), {
					errors: createData.errors
				});
				return fail(500, {
					error: errorMsg
				});
			}

			const newDepartmentId = createData.data?.departments?.createDepartment?.id;

			if (!newDepartmentId) {
				return fail(500, {
					error: 'Department created but ID not returned'
				});
			}

			logger.info('[Departments] Successfully created department', {
				departmentId: newDepartmentId
			});

			// Return success (dialog will close and refresh the page)
			return { success: true, departmentId: newDepartmentId };
		} catch (err: any) {
			logger.error(
				'[Departments] Error creating department',
				err instanceof Error ? err : new Error(String(err))
			);

			return fail(500, {
				error: 'Failed to create department. Please try again.'
			});
		}
	}
};
