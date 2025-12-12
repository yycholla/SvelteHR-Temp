// Document upload page server-side loader (Feature 024)
// Server-side data loading for upload page with permission checks

import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { GraphQLClient } from '$lib/server/graphql-client';
import { RBACDataLoader } from '$lib/server/route-loaders';
import { requireAuth } from '$lib/server/rbac-utils';
import { UPLOAD_DOCUMENT } from '$lib/graphql/document-operations';
import { GET_EMPLOYEES_QUERY } from '$lib/graphql/employee-operations';
import { createAccessMetadata, logSuccessfulAccess } from '$lib/services/auditService';
import type { UploadResult } from '$lib/types/document';

const DOCUMENT_CATEGORIES = [
	{ id: 'contract', name: 'Contract' },
	{ id: 'policy', name: 'Policy' },
	{ id: 'report', name: 'Report' },
	{ id: 'invoice', name: 'Invoice' },
	{ id: 'certificate', name: 'Certificate' },
	{ id: 'payslip', name: 'Payslip' },
	{ id: 'license', name: 'License' },
	{ id: 'other', name: 'Other' }
];

export const load: PageServerLoad = async (event) => {
	const loader = new RBACDataLoader(event, [
		'admin:write',
		'admin:write:self',
		'admin:write:team',
		'admin:write:all',
		'documents:write',
		'*',
		'*:*'
	]);

	return loader.loadWithClient(async (client) => {
		// Log successful access
		logger.info('[DOCUMENT UPLOAD ACCESS GRANTED]', {
			userId: loader.getUserId(),
			timestamp: new Date().toISOString()
		});

		// Check if user is system admin
		const isSystemAdmin =
			loader.hasPermission('*') ||
			loader.hasPermission('*:*') ||
			loader.hasRole('system_admin');

		// Load employees for assignment
		let employeeOptions: Array<{ value: string; label: string }> = [];
		try {
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

			const employeesResponse = await client.query(queryString, {
				limit: 1000,
				offset: 0
			});

			if (employeesResponse?.users) {
				employeeOptions = employeesResponse.users.map((user: { id: string; fullName?: string; displayName?: string; email: string }) => ({
					value: user.id,
					label: user.fullName || user.displayName || user.email
				}));

				logger.info('[UPLOAD PAGE] Loaded employee options', { count: employeeOptions.length });
			}
		} catch (err) {
			logger.error('[UPLOAD PAGE] Failed to load employees:', err as Error);
			// Continue without employee options - form will still work
		}

		// TODO: Load departments and teams when integrated
		const departments: unknown[] = [];
		const teams: unknown[] = [];

		return {
			isSystemAdmin,
			categories: DOCUMENT_CATEGORIES,
			employeeOptions,
			departments,
			teams
		};
	});
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
			userPermissions.includes('*') ||
			userPermissions.includes('*:*') ||
			userRoles.includes('system_admin') ||
			locals.user.role === 'system_admin';

		if (!isSystemAdmin) {
			logger.warn('[DOCUMENT UPLOAD ACTION DENIED]', {
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

			logger.info('[UPLOAD ACTION] FormData entries', {
				entries: Array.from(formData.entries()).map(([key, value]) => ({
					key,
					valueType: typeof value,
					isFile: value instanceof File,
					fileName: value instanceof File ? value.name : 'N/A'
				}))
			});

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

			logger.info('[UPLOAD ACTION] Parsed form data', {
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

			logger.info('[UPLOAD ACTION] Server-side encryption starting', {
				filename: file.name,
				size: file.size,
				type: file.type
			});

			// Step 5: Read file data and encrypt server-side
			const fileBuffer = Buffer.from(await file.arrayBuffer());

			// Import encryption utilities (dynamic to ensure server-side only)
			const { encryptFileWithNewKey, packageEncryptedData, encodeKey } =
				await import('$lib/server/encryption');

			const encryptionResult = encryptFileWithNewKey(fileBuffer);

			// Step 6: Register encryption key with Rust backend
			logger.info('[UPLOAD ACTION] Registering encryption key...');
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
							isActive
						}
					}
				`,
				{ input: keyInput }
			);

			if (keyResponse.errors?.length) {
				logger.error('[UPLOAD ACTION] Key registration failed:', undefined, {
					errors: keyResponse.errors
				});
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
			logger.info('[UPLOAD ACTION] Uploading encrypted document to Rust backend...');
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

			logger.info('[UPLOAD ACTION] Upload input prepared', {
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
			logger.info('[UPLOAD ACTION] GraphQL mutation variables', {
				variables: JSON.stringify(mutationVariables, null, 2).substring(0, 1000)
			});

			const response = await graphqlClient.mutation(UPLOAD_DOCUMENT, mutationVariables);

			if (response.errors?.length) {
				logger.error('[UPLOAD ACTION] GraphQL upload errors:', undefined, {
					errors: response.errors
				});
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

			logger.info('[UPLOAD ACTION] Document uploaded successfully', {
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
			logger.error('[UPLOAD ACTION] Upload failed:', err as Error);

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
