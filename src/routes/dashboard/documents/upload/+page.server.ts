// Document upload page server-side loader (Feature 024)
// Server-side data loading for upload page with permission checks

import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { UPLOAD_DOCUMENT } from '$lib/graphql/document-operations';

import { logSuccessfulAccess, createAccessMetadata } from '$lib/services/auditService';
import type { UploadResult } from '$lib/types/document';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw redirect(303, '/login?redirectTo=/dashboard/documents/upload');
	}

	const userId = locals.user.id;
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];

	// Step 2: Check user role - only system_admin can upload documents
	const isSystemAdmin =
		userPermissions.includes('*') ||
		userRoles.includes('system_admin') ||
		locals.user.role === 'system_admin';

	if (!isSystemAdmin) {
		// Log access attempt for audit purposes
		console.warn('[DOCUMENT UPLOAD ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			userRole: locals.user.role,
			roles: userRoles,
			permissions: userPermissions,
			timestamp: new Date().toISOString()
		});

		throw error(403, {
			message: 'Insufficient permissions. Document upload requires system administrator access.'
		});
	}

	// Log successful access
	console.info('[DOCUMENT UPLOAD ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		timestamp: new Date().toISOString()
	});

	try {
		// Step 3: Load document categories (would come from database)
		// TODO: Call GET /api/documents/categories when implemented
		const categories = [
			{ id: 'contract', name: 'Contract' },
			{ id: 'policy', name: 'Policy' },
			{ id: 'report', name: 'Report' },
			{ id: 'invoice', name: 'Invoice' },
			{ id: 'certificate', name: 'Certificate' },
			{ id: 'payslip', name: 'Payslip' },
			{ id: 'other', name: 'Other' }
		];

		// Step 4: Load employees for assignment (system_admin can assign to all employees)
		// TODO: Call GET /api/employees when integrated
		const employees: any[] = []; // Would be populated from API

		// Step 5: Load departments for department-wide assignment
		// TODO: Call GET /api/departments when integrated
		const departments: any[] = []; // Would be populated from API

		// Step 6: Load teams for team assignment
		// TODO: Call GET /api/teams when integrated
		const teams: any[] = []; // Would be populated from API

		// Step 7: Return data for upload page
		return {
			user: locals.user,
			userPermissions,
			userRoles,
			isSystemAdmin,
			categories,
			employees,
			departments,
			teams
		};
	} catch (err) {
		console.error('Upload page load error:', err);

		// Re-throw redirects and errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Generic error fallback
		throw error(500, {
			message: 'Failed to load upload page. Please try again later.'
		});
	}
};

// Server-side actions for document upload
export const actions: Actions = {
	upload: async ({ request, locals, cookies }) => {
		// Step 1: Validate authentication
		if (!locals.user) {
			throw redirect(303, '/login?redirectTo=/dashboard/documents/upload');
		}

		const userId = locals.user.id;
		const userPermissions = locals.permissions || [];
		const userRoles = locals.roles || [];

		// Step 2: Check user role - only system_admin can upload documents
		const isSystemAdmin =
			userPermissions.includes('*') ||
			userRoles.includes('system_admin') ||
			locals.user.role === 'system_admin';

		if (!isSystemAdmin) {
			console.warn('[DOCUMENT UPLOAD ACTION DENIED]', {
				userId: locals.user.id,
				userEmail: locals.user.email,
				userRole: locals.user.role,
				roles: userRoles,
				permissions: userPermissions,
				timestamp: new Date().toISOString()
			});

			return fail(403, {
				error: 'Insufficient permissions. Document upload requires system administrator access.'
			});
		}

		try {
			// Step 3: Parse form data
			const formData = await request.formData();

			const filename = formData.get('filename') as string;
			const fileType = formData.get('fileType') as string;
			const fileSizeBytes = parseInt(formData.get('fileSizeBytes') as string);
			const encryptionKeyId = formData.get('encryptionKeyId') as string;
			const category = formData.get('category') as string;
			const sensitivityLevel = formData.get('sensitivityLevel') as string;
			const expirationDate = formData.get('expirationDate') as string | null;
			const metadataTags = JSON.parse((formData.get('metadataTags') as string) || '{}');
			const assignToEmployees = JSON.parse((formData.get('assignToEmployees') as string) || '[]');
			const assignToDepartments = JSON.parse(
				(formData.get('assignToDepartments') as string) || '[]'
			);
			const iv = JSON.parse(formData.get('iv') as string);
			const encryptedFile = formData.get('encryptedFile') as File;

			if (!encryptedFile || !filename || !encryptionKeyId) {
				return fail(400, {
					error: 'Missing required upload data'
				});
			}

			// Step 4: Read encrypted file data and convert to base64
			console.log('[UPLOAD ACTION] Reading encrypted file data...');
			const encryptedData = await encryptedFile.arrayBuffer();
			const encryptedDataBase64 = Buffer.from(encryptedData).toString('base64');

			// Step 5: Create GraphQL client and execute upload mutation
			console.log('[UPLOAD ACTION] Executing GraphQL upload mutation...');
			const graphqlClient = GraphQLClient.fromCookies(cookies);

			const uploadInput = {
				filename,
				fileType,
				fileSizeBytes,
				encryptedData: encryptedDataBase64,
				encryptionKeyId,
				iv,
				category,
				sensitivityLevel,
				expirationDate,
				metadataTags,
				assignToEmployees,
				assignToDepartments
			};

			const response = await graphqlClient.mutation(UPLOAD_DOCUMENT, {
				input: uploadInput
			});

			if (response.errors?.length) {
				console.error('[UPLOAD ACTION] GraphQL errors:', response.errors);
				return fail(500, {
					error: response.errors[0].message || 'Failed to create document record'
				});
			}

			const document = response.data?.uploadDocument;
			if (!document) {
				console.error('[UPLOAD ACTION] No document returned from GraphQL mutation');
				return fail(500, {
					error: 'Failed to create document record'
				});
			}

			// Step 6: Log successful upload
			await logSuccessfulAccess(document.id, userId, 'upload', createAccessMetadata());

			console.log('[UPLOAD ACTION] Document uploaded successfully:', document.id);

			// Step 7: Return success result
			const uploadResult: UploadResult = {
				documentId: document.id,
				uploadedAt: new Date(document.createdAt),
				encryptionKeyId
			};

			return {
				success: true,
				result: uploadResult
			};
		} catch (err) {
			console.error('[UPLOAD ACTION] Upload failed:', err);

			// Re-throw redirects and errors
			if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
				throw err;
			}

			return fail(500, {
				error: err instanceof Error ? err.message : 'Upload failed. Please try again.'
			});
		}
	}
};
