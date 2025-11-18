// Server-side CSV employee import handling
// Follows RBAC patterns with server-side GraphQL mutation calls

import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Check authentication and permissions (requires employees:write)
	PermissionChecks.employeeWrite(event);

	const userPermissions = getUserPermissions(locals);

	return {
		user: {
			id: locals.user.id,
			email: locals.user.email || '',
			displayName: locals.user.display_name || '',
			roles: locals.roles || []
		},
		permissions: {
			canViewEmployees: userPermissions.canViewEmployees,
			canManageEmployees: userPermissions.canManageEmployees,
			isAdmin: userPermissions.isAdmin,
			isHRManager: locals.roles?.includes('HR Manager') || false
		}
	};
};

export const actions: Actions = {
	importEmployees: async (event) => {
		const { request } = event;

		// Check authentication and permissions
		PermissionChecks.employeeWrite(event);

		try {
			const formData = await request.formData();
			const csvContent = formData.get('csvContent') as string;
			const temporaryPassword = formData.get('temporaryPassword') as string;

			if (!csvContent) {
				return fail(400, {
					error: 'CSV content is required',
					success: false
				});
			}

			if (!temporaryPassword || temporaryPassword.length < 8) {
				return fail(400, {
					error: 'Temporary password must be at least 8 characters',
					success: false
				});
			}

			// Make GraphQL mutation to Rust backend
			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const cookieHeader = event.request.headers.get('cookie') || '';
			const headers: Record<string, string> = {
				'Content-Type': 'application/json',
				'Cookie': cookieHeader
			};

			console.log('[Employee Import] Starting bulk import via GraphQL mutation');

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers,
				body: JSON.stringify({
					query: `
						mutation ImportEmployees($input: ImportEmployeesInput!) {
							users {
								importEmployees(input: $input) {
									totalRows
									successful
									failed
									results {
										rowNumber
										success
										employeeId
										name
										email
										error
									}
								}
							}
						}
					`,
					variables: {
						input: {
							csvContent,
							temporaryPassword
						}
					}
				})
			});

			if (!response.ok) {
				console.error('[Employee Import] GraphQL request failed:', response.statusText);
				return fail(500, {
					error: `Import failed: ${response.statusText}`,
					success: false
				});
			}

			const result = await response.json();

			if (result.errors && result.errors.length > 0) {
				console.error('[Employee Import] GraphQL errors:', result.errors);
				const errorMessage = result.errors[0]?.message || 'Import failed';
				return fail(400, {
					error: errorMessage,
					success: false
				});
			}

			const importResult = result.data?.users?.importEmployees;

			if (!importResult) {
				return fail(500, {
					error: 'Unexpected response from server',
					success: false
				});
			}

			console.log(
				`[Employee Import] Completed: ${importResult.successful} successful, ${importResult.failed} failed`
			);

			return {
				success: true,
				totalRows: importResult.totalRows,
				successful: importResult.successful,
				failed: importResult.failed,
				results: importResult.results
			};
		} catch (err: any) {
			console.error('[Employee Import] Error during import:', err);
			return fail(500, {
				error: err.message || 'An unexpected error occurred during import',
				success: false
			});
		}
	}
};
