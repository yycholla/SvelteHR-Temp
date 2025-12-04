import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { PermissionChecks, getUserPermissions } from '$lib/server/rbac-utils';
import { logger } from '$lib/utils/logger';

export const load: PageServerLoad = async (event) => {
	const { locals } = event;

	// Check authentication and permissions (requires employees:write)
	PermissionChecks.employeeWrite(event);

	if (!locals.user) {
		return fail(401, { error: 'Unauthorized' });
	}

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
	upload: async (event) => {
		const { request, locals } = event;
		const userId = locals.user?.id || 'unknown';

		try {
			PermissionChecks.employeeWrite(event);

			const formData = await request.formData();
			const csvContent = formData.get('csvContent') as string;

			if (!csvContent) {
				logger.warn('CSV import failed: No content provided', { userId });
				return fail(400, { error: 'CSV content is required' });
			}

			logger.info('Starting CSV upload', { userId, size: csvContent.length });

			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const response = await fetch(getGraphQLEndpoint(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: event.request.headers.get('cookie') || ''
				},
				body: JSON.stringify({
					query: `mutation Upload($input: UploadEmployeeImportInput!) {
						employeeImport {
							uploadEmployeeImport(input: $input) {
								id
								totalRows
								importRows {
									id
									rowNumber
									rawData
								}
							}
						}
					}`,
					variables: { input: { csvContent } }
				})
			});

			if (!response.ok) {
				logger.error('GraphQL request failed for CSV upload', undefined, {
					userId,
					status: response.status
				});
				return fail(500, { error: 'Failed to communicate with backend' });
			}

			const result = await response.json();
			if (result.errors) {
				logger.warn('CSV upload GraphQL errors', { userId, errors: result.errors });
				return fail(400, { error: result.errors[0].message });
			}

			logger.info('CSV uploaded successfully', {
				userId,
				jobId: result.data.employeeImport.uploadEmployeeImport.id
			});
			return {
				success: true,
				step: 'mapping',
				job: result.data.employeeImport.uploadEmployeeImport
			};
		} catch (err) {
			logger.error('Unexpected error during CSV upload', err as Error, { userId });
			return fail(500, { error: 'An internal error occurred during upload' });
		}
	},

	validate: async (event) => {
		const { request, locals } = event;
		const userId = locals.user?.id || 'unknown';

		try {
			PermissionChecks.employeeWrite(event);

			const formData = await request.formData();
			const mappingRaw = formData.get('mapping') as string;

			if (!mappingRaw) {
				return fail(400, { error: 'Mapping data missing' });
			}

			const mappingInput = JSON.parse(mappingRaw);
			logger.info('Validating CSV mapping', { userId, jobId: mappingInput.job_id });

			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const response = await fetch(getGraphQLEndpoint(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: event.request.headers.get('cookie') || ''
				},
				body: JSON.stringify({
					query: `mutation Validate($input: ImportMappingInput!) {
						employeeImport {
							validateEmployeeImport(input: $input) {
								id
								validRows
								errorRows
								importRows {
									id
									rowNumber
									status
									parsedData
									validationErrors
									rawData
								}
							}
						}
					}`,
					variables: { input: mappingInput }
				})
			});

			const result = await response.json();
			if (result.errors) {
				logger.warn('CSV validation errors', { userId, errors: result.errors });
				return fail(400, { error: result.errors[0].message });
			}

			return {
				success: true,
				step: 'preview',
				job: result.data.employeeImport.validateEmployeeImport
			};
		} catch (err) {
			logger.error('Unexpected error during CSV validation', err as Error, { userId });
			return fail(500, { error: 'Validation failed unexpectedly' });
		}
	},

	commit: async (event) => {
		const { request, locals } = event;
		const userId = locals.user?.id || 'unknown';

		try {
			PermissionChecks.employeeWrite(event);

			const formData = await request.formData();
			const jobId = formData.get('jobId') as string;
			const temporaryPassword = formData.get('temporaryPassword') as string;

			logger.info('Committing CSV import', { userId, jobId });

			const { getGraphQLEndpoint } = await import('$lib/server/api-url');
			const response = await fetch(getGraphQLEndpoint(), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: event.request.headers.get('cookie') || ''
				},
				body: JSON.stringify({
					query: `mutation Commit($input: CommitEmployeeImportInput!) {
						employeeImport {
							commitEmployeeImport(input: $input) {
								id
								status
								completedAt
							}
						}
					}`,
					variables: { input: { jobId, temporaryPassword } }
				})
			});

			const result = await response.json();
			if (result.errors) {
				logger.warn('CSV commit errors', { userId, errors: result.errors });
				return fail(400, { error: result.errors[0].message });
			}

			logger.info('CSV import committed successfully', { userId, jobId });
			return {
				success: true,
				step: 'complete',
				job: result.data.employeeImport.commitEmployeeImport
			};
		} catch (err) {
			logger.error('Unexpected error during CSV commit', err as Error, { userId });
			return fail(500, { error: 'Failed to commit import' });
		}
	}
};
