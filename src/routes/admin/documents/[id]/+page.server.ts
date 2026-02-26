// Document detail page server-side loader (Feature 024)
// Server-side data loading for individual document with RBAC checks

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { logger } from '$lib/utils/logger';
import { requireAuth } from '$lib/server/rbac-utils';
import { setJWTClaims, transaction } from '$lib/server/db';

interface DocumentAccessLog {
	id: string;
	document_id: string;
	user_id: string;
	access_type: string;
	access_timestamp: string;
	access_outcome: string;
	ip_address: string | null;
	user_agent: string | null;
	denial_reason: string | null;
	user_email: string | null;
}

interface EmployeeRecord {
	id: string;
	email: string;
	department_id?: string;
}

interface DepartmentRecord {
	id: string;
	name: string;
}

interface TeamRecord {
	id: string;
	name: string;
}

export const load: PageServerLoad = async (event) => {
	const { params } = event;

	// Check authentication and permissions
	requireAuth(event, {
		requiredPermissions: ['admin:read', 'admin:read:self', 'admin:read:team', 'admin:read:all']
	});

	// After permission check, re-destructure locals with guaranteed user
	const { locals } = event;

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	try {
		// Step 2: Fetch document metadata and check access
		const { document, canAccess } = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, userId, userRole);

			// Query document with RLS policy enforcement
			const docResult = await client.query(
				`SELECT
					d.id,
					d.title as filename,
					d.mime_type as file_type,
					d.mime_type,
					d.file_size as file_size_bytes,
					d.file_path as storage_path,
					d.uploaded_by,
					d.created_at as uploaded_at,
					d.category_id as category,
					d.access_level as sensitivity_level,
					d.deleted_at as is_deleted,
					d.expiry_date as expiration_date,
					d.is_encrypted,
					u.email as uploaded_by_email
				FROM hr_public.documents d
				LEFT JOIN hr_public.users u ON d.uploaded_by = u.id
				WHERE d.id = $1`,
				[documentId]
			);

			if (docResult.rows.length === 0) {
				return { document: null, canAccess: false };
			}

			const doc = docResult.rows[0];

			// Check if document is deleted
			if (doc.is_deleted && userRole !== 'super_admin') {
				return { document: null, canAccess: false };
			}

			// Check access permissions
			let hasAccess = false;
			if (userRole === 'super_admin' || userRole === 'admin') {
				hasAccess = true;
			} else if (doc.uploaded_by === userId) {
				hasAccess = true; // User can view their own uploads
			} else {
				// Check document assignments
				const assignmentResult = await client.query(
					`SELECT EXISTS (
						SELECT 1 FROM hr_public.document_assignments
						WHERE document_id = $1 AND user_id = $2
						  AND deleted_at IS NULL
					) as assigned`,
					[documentId, userId]
				);
				hasAccess = assignmentResult.rows[0]?.assigned || false;
			}

			return { document: doc, canAccess: hasAccess };
		});

		if (!document) {
			error(404, { message: 'Document not found' });
		}

		if (!canAccess) {
			error(403, {
				message: 'Access denied. You do not have permission to view this document.'
			});
		}

		// Step 3: Fetch document assignments
		const assignments = await transaction(async (client) => {
			await setJWTClaims(client, userId, userRole);

			const assignmentsResult = await client.query(
				`SELECT
					da.id,
					da.document_id,
					da.user_id as employee_id,
					da.department_id,
					da.assigned_by,
					da.created_at as assigned_at,
					da.access_level as assignment_reason,
					u_employee.email as employee_email,
					u_assigned_by.email as assigned_by_email
				FROM hr_public.document_assignments da
				LEFT JOIN hr_public.users u_employee ON da.user_id = u_employee.id
				LEFT JOIN hr_public.users u_assigned_by ON da.assigned_by = u_assigned_by.id
				WHERE da.document_id = $1 AND da.deleted_at IS NULL
				ORDER BY da.created_at DESC`,
				[documentId]
			);

			return assignmentsResult.rows;
		});

		// Step 4: Fetch access logs (if HR/Admin)
		let accessLogs: DocumentAccessLog[] = [];

		if (userRole === 'super_admin' || userRole === 'admin') {
			accessLogs = await transaction(async (client) => {
				await setJWTClaims(client, userId, userRole);

				const logsResult = await client.query(
					`SELECT
						dal.id,
						dal.document_id,
						dal.user_id,
						dal.access_type,
						dal.access_timestamp,
						dal.access_outcome,
						dal.ip_address,
						dal.user_agent,
						dal.denial_reason,
						u.email as user_email
					FROM hr_public.document_access_logs dal
					LEFT JOIN hr_public.users u ON dal.user_id = u.id
					WHERE dal.document_id = $1
					ORDER BY dal.access_timestamp DESC
					LIMIT 50`,
					[documentId]
				);

				return logsResult.rows;
			});
		}

		// Step 5: Determine user permissions for this document
		const canAssign = userRole === 'super_admin' || userRole === 'admin';
		const canDelete = userRole === 'super_admin' || userRole === 'admin';
		const canDownload = canAccess; // Anyone with view access can download

		// Step 6: Fetch employees, departments, teams for assignment modal (if HR/Admin)
		let employees: EmployeeRecord[] = [];
		let departments: DepartmentRecord[] = [];
		let teams: TeamRecord[] = [];

		if (canAssign) {
			// Fetch employees
			const employeesData = await transaction(async (client) => {
				await setJWTClaims(client, userId, userRole);

				const result = await client.query(
					`SELECT id, email, department_id
					 FROM hr_public.users
					 WHERE role != 'super_admin'
					 ORDER BY email ASC`
				);

				return result.rows;
			});

			employees = employeesData.map((employee) => ({
				...employee,
				department_id: employee.department_id ?? undefined
			}));

			// Fetch departments
			const departmentsData = await transaction(async (client) => {
				await setJWTClaims(client, userId, userRole);

				const result = await client.query(
					`SELECT id, name
					 FROM hr_public.departments
					 ORDER BY name ASC`
				);

				return result.rows;
			});

			departments = departmentsData;

			// Fetch teams (if teams table exists)
			try {
				const teamsData = await transaction(async (client) => {
					await setJWTClaims(client, userId, userRole);

					const result = await client.query(
						`SELECT id, name
						 FROM hr_public.teams
						 ORDER BY name ASC`
					);

					return result.rows;
				});

				teams = teamsData;
			} catch (err) {
				// Teams table might not exist yet
				logger.info(`Teams table not found or query failed: ${err}`);
				teams = [];
			}
		}

		// Step 7: Return data
		return {
			document,
			assignments,
			accessLogs,
			employees,
			departments,
			teams,
			canAssign,
			canDelete,
			canDownload,
			user: locals.user
		};
	} catch (err) {
		logger.error('Document detail load error:', err as Error);

		// Re-throw redirects and errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Generic error fallback
		error(500, {
			message: 'Failed to load document details. Please try again later.'
		});
	}
};
