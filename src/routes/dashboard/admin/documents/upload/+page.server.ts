// Document upload page server-side loader (Feature 024)
// Server-side data loading for upload page with permission checks

import { error, redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { GraphQLClient } from '$lib/server/graphql-client';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { UPLOAD_DOCUMENT } from '$lib/graphql/document-operations';
import { GET_EMPLOYEES_QUERY } from '$lib/graphql/employee-operations';

import { logSuccessfulAccess, createAccessMetadata } from '$lib/services/auditService';
import type { UploadResult } from '$lib/types/document';

export const load: PageServerLoad = async (event) => {
	const { locals, cookies, fetch } = event;

	// Check authentication and permissions
	PermissionChecks.adminWrite(event);

	const userId = locals.user.id;
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];

	if (false) {
		// Log access attempt for audit purposes
		console.warn('[DOCUMENT UPLOAD ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			userRole: locals.user.role,
			roles: userRoles,
			permissions: userPermissions,
			timestamp: new Date().toISOString()
		});

		error(403, {
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
			{ id: 'license', name: 'License' },
			{ id: 'other', name: 'Other' }
		];

		// Step 4: Load employees for assignment (system_admin can assign to all employees)
		let employeeOptions: Array<{ value: string; label: string }> = [];
		try {
			const graphqlClient = GraphQLClient.fromCookies(cookies);

			// Extract the query string from the gql template
			const queryString = `
				query GetEmployees($limit: Int, $offset: Int) {
					users(limit: $limit, offset: $offset) {
						id
						email
						displayName
						firstName
						lastName
						fullName
					}
				}
			`;

			const employeesResponse = await graphqlClient.query(queryString, {
				limit: 1000,
				offset: 0
			});

			if (employeesResponse.data?.users) {
				employeeOptions = employeesResponse.data.users.map((user: any) => ({
					value: user.id,
					label: user.fullName || user.displayName || user.email
				}));

				console.log('[UPLOAD PAGE] Loaded employee options:', employeeOptions.length);
			}
		} catch (err) {
			console.error('[UPLOAD PAGE] Failed to load employees:', err);
			// Continue without employee options - form will still work
		}

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
			employeeOptions,
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
		error(500, {
        			message: 'Failed to load upload page. Please try again later.'
        		});
	}
};

// Server-side actions for document upload
export const actions: Actions = {
	upload: async ({ request, locals, cookies, fetch }) => {
		// Step 1: Validate authentication
		if (!locals.user) {
			redirect(303, '/login?redirectTo=/dashboard/documents/upload');
		}

		const userId = locals.user.id;
		const userPermissions = locals.permissions || [];
		const userRoles = locals.roles || [];

		// Step 2: Check user role - only system_admin can upload documents
		const isSystemAdmin =
			userPermissions.includes('*') || userPermissions.includes('*:*') ||
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
			// Step 3: Parse form data (now expecting raw file, not encrypted)
			const formData = await request.formData();

			console.log('[UPLOAD ACTION] FormData entries:', Array.from(formData.entries()).map(([key, value]) => ({
				key,
				valueType: typeof value,
				isFile: value instanceof File,
				fileName: value instanceof File ? value.name : 'N/A'
			})));

			const file = formData.get('file') as File;
			const category = formData.get('category') as string;
			const sensitivityLevel = formData.get('sensitivityLevel') as string;
			const expirationDate = formData.get('expirationDate') as string | null;
			const metadataTags = formData.get('metadataTags')
				? JSON.parse(formData.get('metadataTags') as string)
				: {};
			const assignToEmployees = formData.get('assignToEmployees')
				? JSON.parse(formData.get('assignToEmployees') as string)
				: [];
			const assignToDepartments = formData.get('assignToDepartments')
				? JSON.parse(formData.get('assignToDepartments') as string)
				: [];

			console.log('[UPLOAD ACTION] Parsed form data:', {
				hasFile: !!file,
				fileType: file ? typeof file : 'undefined',
				isFileInstance: file instanceof File,
				fileName: file?.name,
				fileSize: file?.size,
				category,
				sensitivityLevel
			});

			if (!file || !(file instanceof File)) {
				return fail(400, {
					error: 'No valid file provided'
				});
			}

			// Step 4: Validate file
			const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
			if (file.size > MAX_FILE_SIZE) {
				return fail(400, {
					error: `File size exceeds 50MB limit (${Math.round(file.size / 1024 / 1024)}MB)`
				});
			}

			const ALLOWED_TYPES = ['PDF', 'JPEG', 'PNG', 'GIF', 'DOCX', 'XLSX', 'TXT', 'CSV'];
			const fileExtension = file.name.split('.').pop()?.toUpperCase() || '';
			if (!ALLOWED_TYPES.includes(fileExtension)) {
				return fail(400, {
					error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`
				});
			}

			console.log('[UPLOAD ACTION] Server-side encryption starting:', {
				filename: file.name,
				size: file.size,
				type: file.type
			});

			// Step 5: Read file data and encrypt server-side
			const fileBuffer = Buffer.from(await file.arrayBuffer());

			// Import encryption utilities (dynamic to ensure server-side only)
			const { encryptFileWithNewKey, packageEncryptedData, encodeKey } = await import(
				'$lib/server/encryption'
			);

			const encryptionResult = encryptFileWithNewKey(fileBuffer);

			// Step 6: Register encryption key with Rust backend
			console.log('[UPLOAD ACTION] Registering encryption key...');
			const graphqlClient = GraphQLClient.fromCookies(cookies);

			const keyInput = {
				keyName: `doc_${file.name}_${Date.now()}`,
				algorithm: 'AES-GCM-256',
				encryptedKey: encryptionResult.keyBase64
			};

			const keyResponse = await graphqlClient.mutation(
				`
					mutation CreateEncryptionKey($input: CreateEncryptionKeyInput!) {
						createEncryptionKey(input: $input) {
							id
							keyName
							algorithm
							createdAt
							is_active
						}
					}
				`,
				{ input: keyInput }
			);

			if (keyResponse.errors?.length) {
				console.error('[UPLOAD ACTION] Key registration failed:', keyResponse.errors);
				return fail(500, {
					error: keyResponse.errors[0].message || 'Failed to register encryption key'
				});
			}

			const encryptionKeyId = keyResponse.data?.createEncryptionKey?.id;
			if (!encryptionKeyId) {
				return fail(500, {
					error: 'Failed to register encryption key: No ID returned'
				});
			}

			// Step 7: Package encrypted data (IV + AuthTag + EncryptedData)
			const packagedData = packageEncryptedData(
				encryptionResult.encryptedData,
				encryptionResult.iv,
				encryptionResult.authTag
			);
			const encryptedDataBase64 = packagedData.toString('base64');

			// Step 8: Upload to Rust GraphQL backend
			console.log('[UPLOAD ACTION] Uploading encrypted document to Rust backend...');
			const uploadInput = {
				filename: file.name,
				fileType: fileExtension,
				fileSizeBytes: file.size,
				encryptedData: encryptedDataBase64,
				encryptionKeyId,
				iv: Array.from(encryptionResult.iv), // Convert Buffer to array for GraphQL
				category,
				sensitivityLevel,
				expirationDate,
				metadataTags,
				assignToEmployees,
				assignToDepartments
			};

			console.log('[UPLOAD ACTION] Upload input prepared:', {
				filename: uploadInput.filename,
				fileType: uploadInput.fileType,
				fileSizeBytes: uploadInput.fileSizeBytes,
				encryptedDataLength: encryptedDataBase64?.length || 0,
				encryptedDataPreview: encryptedDataBase64?.substring(0, 50) || 'NULL',
				encryptionKeyId: uploadInput.encryptionKeyId,
				ivLength: uploadInput.iv?.length || 0,
				category: uploadInput.category,
				sensitivityLevel: uploadInput.sensitivityLevel,
				hasExpirationDate: !!uploadInput.expirationDate,
				hasMetadataTags: !!uploadInput.metadataTags
			});

			// Log the exact GraphQL request being sent
			const mutationVariables = { input: uploadInput };
			console.log('[UPLOAD ACTION] GraphQL mutation variables:', JSON.stringify(mutationVariables, null, 2).substring(0, 1000));

			const response = await graphqlClient.mutation(UPLOAD_DOCUMENT, mutationVariables);

			if (response.errors?.length) {
				console.error('[UPLOAD ACTION] GraphQL upload errors:', response.errors);
				return fail(500, {
					error: response.errors[0].message || 'Failed to upload document'
				});
			}

			const document = response.data?.uploadDocument;
			if (!document) {
				return fail(500, {
					error: 'Failed to upload document: No document returned'
				});
			}

			// Step 9: Log successful upload
			await logSuccessfulAccess(document.id, userId, 'view', createAccessMetadata(), fetch);

			console.log('[UPLOAD ACTION] Document uploaded successfully:', {
				documentId: document.id,
				filename: file.name,
				size: file.size,
				encrypted: true
			});

			// Step 10: Return success result
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
