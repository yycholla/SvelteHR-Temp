// Document detail page server-side loader (Feature 024)
// Server-side data loading for individual document with RBAC checks

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=/dashboard/documents/${params.id}`);
	}

	const documentId = params.id;
	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	try {
		// Step 2: Check RBAC access
		// TODO: Call rbacService.canAccessDocument() when implemented
		// For now, implement basic role-based logic

		let canAccess = false;

		if (userRole === 'super_admin' || userRole === 'admin') {
			canAccess = true; // Admin can access all documents
		} else {
			// TODO: Check document_assignments table for employee/manager access
			// For now, assume access is granted
			canAccess = true;
		}

		if (!canAccess) {
			throw error(403, {
				message: 'Access denied. You do not have permission to view this document.'
			});
		}

		// Step 3: Fetch document metadata
		// TODO: Replace with actual database query
		// SELECT * FROM hr_public.documents WHERE id = documentId AND is_deleted = FALSE

		const document = {
			id: documentId,
			filename: 'sample_document.pdf',
			file_type: 'PDF' as const,
			file_size_bytes: 1024000,
			storage_path: `/encrypted/${documentId}.enc`,
			encryption_key_id: 'key-123',
			uploaded_by: userId,
			uploaded_at: new Date().toISOString(),
			category: 'Contract' as const,
			sensitivity_level: 'Internal' as const,
			description: 'Sample document for testing',
			is_deleted: false
		};

		if (!document) {
			throw error(404, { message: 'Document not found' });
		}

		if (document.is_deleted && userRole !== 'super_admin') {
			throw error(404, { message: 'Document not found' });
		}

		// Step 4: Fetch document assignments
		// TODO: Replace with actual database query
		// SELECT * FROM hr_public.document_assignments WHERE document_id = documentId

		const assignments = [
			{
				id: 'assign-1',
				document_id: documentId,
				employee_id: userId,
				department_id: null,
				team_id: null,
				assignment_type: 'employee' as const,
				assignment_status: 'active' as const,
				assigned_by: 'admin-user',
				assigned_at: new Date().toISOString(),
				revoked_at: null,
				revoked_by: null
			}
		];

		// Step 5: Fetch access logs (if HR/Admin)
		let accessLogs: any[] = [];

		if (userRole === 'super_admin' || userRole === 'admin') {
			// TODO: Replace with actual database query
			// SELECT * FROM hr_public.document_access_logs WHERE document_id = documentId ORDER BY access_timestamp DESC LIMIT 50

			accessLogs = [
				{
					id: 'log-1',
					document_id: documentId,
					user_id: userId,
					access_type: 'download' as const,
					access_timestamp: new Date().toISOString(),
					access_outcome: 'success' as const,
					ip_address: '127.0.0.1',
					user_agent: 'Mozilla/5.0',
					denial_reason: null
				}
			];
		}

		// Step 6: Determine user permissions for this document
		const canAssign = userRole === 'super_admin' || userRole === 'admin';
		const canDelete = userRole === 'super_admin' || userRole === 'admin';

		// Step 7: Load employees, departments, teams for assignment modal (if can assign)
		let employees: any[] = [];
		let departments: any[] = [];
		let teams: any[] = [];

		if (canAssign) {
			// TODO: Load from API endpoints
			employees = [];
			departments = [];
			teams = [];
		}

		// Step 8: Return data
		return {
			document,
			assignments,
			accessLogs,
			canAssign,
			canDelete,
			employees,
			departments,
			teams,
			user: locals.user
		};

	} catch (err) {
		console.error('Document detail load error:', err);

		// Re-throw redirects and errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Generic error fallback
		throw error(500, {
			message: 'Failed to load document details. Please try again later.'
		});
	}
};
