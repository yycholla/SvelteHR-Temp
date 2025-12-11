// Server-side data loading for task details page
// Feature: 028-task-system-expansion - Task T037
// Load single task with full relationships

import type { Actions, PageServerLoad, RequestEvent } from './$types';
import { error, fail } from '@sveltejs/kit';
import { getUserPermissions, requireAuth } from '$lib/server/rbac-utils';

export const load: PageServerLoad = async (event) => {
	const { cookies, params } = event;
	const { id: taskId } = params;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['tasks:read', 'tasks:read:self', 'tasks:read:team', 'tasks:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	// Import required models
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');
	const { createUserSession } = await import('$lib/models/user-session');

	// Create user session
	const userSession = createUserSession({
		userId: locals.user.id,
		// jwtToken is optional for session-based authentication
		roles: [locals.user.role || 'employee'],
		permissions: locals.permissions || [],
		expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
		metadata: {
			userEmail: locals.user.email,
			displayName: locals.user.display_name || locals.user.email
		}
	});

	// Create data request
	const dataRequest = createDataRequest({
		operationName: 'GetTaskDetails',
		variables: { taskId },
		userCredentials: {
			userId: userSession.userId,
			roles: userSession.roles,
			permissions: userSession.permissions,
			// jwtToken omitted for session-based auth
			isAuthenticated: Boolean(userSession.isAuthenticated),
			expiresAt: userSession.expiresAt
		},
		timeoutMs: 5000
	});

	try {
		const { getGraphQLEndpoint, authenticatedGraphQLRequest } = await import('$lib/server/api-url');
		const graphqlEndpoint = getGraphQLEndpoint();

		logger.info('[Task Details] Loading task:'.replace(/['`]$/, `: ${taskId}'`/));

		// Load task with full relationships
		// NOTE: Using Rust GraphQL schema - singular query for ID lookup
		const taskResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetTaskDetails($taskId: UUID!) {
					task(id: $taskId) {
						id
						title
						description
						status
						priority
						dueDate
						requiresManualReassignment
						archived
						createdAt
						updatedAt
						assignee {
							id
							displayName
							email
							roles {
								id
								name
							}
						}
						department {
							id
							name
							description
						}
						creator {
							id
							displayName
							email
							roles {
								id
								name
							}
						}
						taskType {
							id
							name
							description
							defaultPriority
							colorCode
							isActive
						}
						parentTask {
							id
							title
							status
							priority
							dueDate
						}
						subtasks {
							id
							title
							description
							status
							priority
							dueDate
							assignee {
								id
								displayName
							}
							department {
								id
								name
							}
							createdAt
							updatedAt
						}
					}
				}
			`,
			{ taskId },
			event.request
		);

		const taskData = await taskResponse.json();
		logger.info('[Task Details] Task response:'.replace(/['`]$/, `: ${taskData}'`/));

		if (taskData.errors) {
			logger.error('[Task Details] GraphQL errors:', taskData.errors);
			throw new Error(taskData.errors[0]?.message || 'Failed to load task');
		}

		const task = taskData?.data?.task || null;

		if (!task) {
			error(404, { message: 'Task not found' });
		}

		// Note: Audit trail functionality not available in current schema
		// Skipping audit trail query for now
		const auditTrail: any[] = [];
		const auditTotalCount = 0;
		const auditHasMore = false;

		// Load available assignees for reassignment
		const assigneesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetUsersForReassignment($limit: Int!) {
					users(limit: $limit) {
						id
						displayName
						email
						roles {
							id
							name
						}
					}
				}
			`,
			{ limit: 100 },
			event.request
		);

		const assigneesData = await assigneesResponse.json();

		// Load task types
		const taskTypesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetTaskTypes($isActive: Boolean) {
					taskTypes(isActive: $isActive) {
						id
						name
						description
						defaultPriority
						colorCode
						isActive
					}
				}
			`,
			{ isActive: true },
			event.request
		);

		const taskTypesData = await taskTypesResponse.json();

		// Load all tasks for dependency/parent selection
		const allTasksResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetAllTasksForSelection($limit: Int!, $offset: Int!) {
					tasks(limit: $limit, offset: $offset) {
						id
						title
						status
						priority
						dueDate
						assignee {
							id
							displayName
						}
					}
				}
			`,
			{ limit: 200, offset: 0 },
			event.request
		);

		const allTasksData = await allTasksResponse.json();

		// Load available resources for linking
		const resourcesResponse = await authenticatedGraphQLRequest(
			graphqlEndpoint,
			`
				query GetAvailableResources($limit: Int!) {
					users(limit: $limit) {
						id
						displayName
					}
				}
			`,
			{ limit: 100 },
			event.request
		);

		const resourcesData = await resourcesResponse.json();

		// Build available resources list (for now just employees)
		const availableResources = (resourcesData?.data?.users || []).map((user: any) => ({
			id: user.id,
			type: 'Employee',
			title: user.displayName
		}));

		// Get standardized user permissions
		const userPermissions = getUserPermissions(locals);

		// Return server-side loaded data
		return {
			userSession: userSession.toJSON(),
			task,
			auditTrail,
			auditTotalCount,
			auditHasMore,
			assignees: assigneesData?.data?.users || [],
			taskTypes: taskTypesData?.data?.taskTypes || [],
			availableTasks: allTasksData?.data?.tasks || [],
			availableResources,
			// RBAC: Standardized permission checks (includes user property)
			...userPermissions,
			loadedAt: new Date().toISOString()
		};
	} catch (err) {
		logger.error('[Task Details Load Error]', err as Error);

		const errorResponse = createErrorResponse(
			err instanceof Error ? err : new Error('Task details load failed'),
			{
				type: 'DATA_LOAD_ERROR',
				userMessage: 'Unable to load task details. Please refresh the page or try again later.'
			}
		);

		logger.error('[Task Details Error Details]', {
			userId: locals.user?.id,
			taskId,
			error: errorResponse
		});

		return {
			userSession: userSession.toJSON(),
			task: null,
			auditTrail: [],
			auditTotalCount: 0,
			auditHasMore: false,
			assignees: [],
			taskTypes: [],
			availableTasks: [],
			availableResources: [],
			// Default permissions if loading failed (includes user property)
			...getUserPermissions(locals),
			loadedAt: new Date().toISOString(),
			error: errorResponse.userMessage
		};
	}
};

// Mutation to create linked resource (not in tasks-operations.ts yet)
const CREATE_LINKED_RESOURCE = `
	mutation CreateLinkedResource($input: CreateLinkedResourceInput!) {
		createLinkedResource(input: $input) {
			id
			taskId
			resourceType
			resourceId
			resourceTitle
		}
	}
`;

// Additional form actions for task details
export const actions: Actions = {
	// Upload file and link to task
	uploadFile: async (event: RequestEvent) => {
		const { request, params } = event;
		const { id: taskId } = params;

		// Check authentication and permissions
		// Using document write permission since we're creating a document
		// AND task write permission since we're modifying a task
		requireAuth(event, {
			requiredPermissions: ['documents:write', 'tasks:write']
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		try {
			const formData = await request.formData();
			const file = formData.get('file') as File;

			if (!file || !(file instanceof File)) {
				return fail(400, { error: 'No valid file provided' });
			}

			// Validate file size (50MB limit)
			const MAX_FILE_SIZE = 50 * 1024 * 1024;
			if (file.size > MAX_FILE_SIZE) {
				return fail(400, {
					error: `File size exceeds 50MB limit`
				});
			}

			// Server-side encryption logic (reused from document upload)
			const fileBuffer = Buffer.from(await file.arrayBuffer());
			const { encryptFileWithNewKey, packageEncryptedData } =
				await import('$lib/server/encryption');
			const encryptionResult = encryptFileWithNewKey(fileBuffer);

			// Register encryption key
			const { getGraphQLEndpoint, authenticatedGraphQLRequest } =
				await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const keyInput = {
				keyName: `task_doc_${taskId}_${Date.now()}`,
				algorithm: 'AES-GCM-256',
				encryptedKey: encryptionResult.keyBase64
			};

			const keyResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				`
					mutation CreateEncryptionKey($input: CreateEncryptionKeyInput!) {
						createEncryptionKey(input: $input) {
							id
						}
					}
				`,
				{ input: keyInput },
				event.request
			);

			const keyData = await keyResponse.json();
			const encryptionKeyId = keyData.data?.createEncryptionKey?.id;

			if (!encryptionKeyId) {
				throw new Error('Failed to register encryption key');
			}

			// Package encrypted data
			const packagedData = packageEncryptedData(
				encryptionResult.encryptedData,
				encryptionResult.iv,
				encryptionResult.authTag
			);
			const encryptedDataBase64 = packagedData.toString('base64');

			// Upload document
			const { UPLOAD_DOCUMENT } = await import('$lib/graphql/document-operations');

			const uploadInput = {
				filename: file.name,
				fileType: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
				fileSizeBytes: file.size,
				encryptedData: encryptedDataBase64,
				encryptionKeyId,
				iv: Array.from(encryptionResult.iv),
				category: 'Task Attachment',
				sensitivityLevel: 'Internal'
			};

			const uploadResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				UPLOAD_DOCUMENT,
				{ input: uploadInput },
				event.request
			);

			const uploadResult = await uploadResponse.json();
			const document = uploadResult.data?.uploadDocument;

			if (!document) {
				throw new Error('Failed to upload document');
			}

			// Link document to task
			const linkInput = {
				taskId,
				resourceType: 'document', // Must match ResourceType enum (lowercase 'document')
				resourceId: document.id,
				resourceTitle: file.name
			};

			const linkResponse = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				CREATE_LINKED_RESOURCE,
				{ input: linkInput },
				event.request
			);

			const linkData = await linkResponse.json();

			if (linkData.errors) {
				logger.error('Failed to link document:', linkData.errors);
				// Note: Document is uploaded but not linked. Could delete it, but simpler to leave it for now.
				return fail(500, { error: 'Document uploaded but failed to link to task' });
			}

			return { success: true };
		} catch (err) {
			logger.error('Task file upload error:', err as Error);
			return fail(500, { error: 'Failed to upload file' });
		}
	},

	// Update task tags
	updateTags: async (event: RequestEvent) => {
		const { request, params } = event;
		const { id: taskId } = params;

		requireAuth(event, {
			requiredPermissions: [
				'tasks:write',
				'tasks:write:self',
				'tasks:write:team',
				'tasks:write:all'
			]
		});

		// After permission check, re-destructure locals
		const { locals } = event;

		try {
			const formData = await request.formData();
			const tagsJson = formData.get('tags') as string;
			let tags: string[] = [];

			try {
				tags = JSON.parse(tagsJson);
			} catch (e) {
				return fail(400, { error: 'Invalid tags format' });
			}

			const { getGraphQLEndpoint, authenticatedGraphQLRequest } =
				await import('$lib/server/api-url');
			const graphqlEndpoint = getGraphQLEndpoint();

			const { UPDATE_TASK } = await import('$lib/graphql/tasks-operations');

			const response = await authenticatedGraphQLRequest(
				graphqlEndpoint,
				UPDATE_TASK,
				{
					id: taskId,
					input: { tags }
				},
				event.request
			);

			const data = await response.json();

			if (data.errors) {
				return fail(500, { error: data.errors[0].message });
			}

			return { success: true };
		} catch (err) {
			logger.error('Update tags error:', err as Error);
			return fail(500, { error: 'Failed to update tags' });
		}
	},

	// Add comment (Placeholder)
	addComment: async (event: RequestEvent) => {
		// Backend support pending
		return fail(501, { error: 'Comments are not yet supported by the backend' });
	}
};
