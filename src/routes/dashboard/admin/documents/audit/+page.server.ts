// Audit log page server-side loader (Feature 024)
// Server-side data loading for audit logs with session-based authentication (HR/Admin only)

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { transaction } from '$lib/server/db';

export const load: PageServerLoad = async (event) => {
	const { url, locals, fetch } = event;

	// Check authentication and permissions
	PermissionChecks.adminRead(event);

	const userId = locals.user.id;
	const userPermissions = locals.permissions || [];
	const userRoles = locals.roles || [];

	if (false) {
		// Log access attempt for audit purposes
		console.warn('[DOCUMENT AUDIT ACCESS DENIED]', {
			userId: locals.user.id,
			userEmail: locals.user.email,
			userRole: locals.user.role,
			roles: userRoles,
			permissions: userPermissions,
			timestamp: new Date().toISOString()
		});

		error(403, {
			message: 'Insufficient permissions. Document audit logs require system administrator access.'
		});
	}

	// Log successful access
	console.info('[DOCUMENT AUDIT ACCESS GRANTED]', {
		userId: locals.user.id,
		userEmail: locals.user.email,
		timestamp: new Date().toISOString()
	});

	try {
		// Step 3: Parse query parameters
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const documentId = url.searchParams.get('documentId') || null;
		const filterUserId = url.searchParams.get('userId') || null;
		const accessType = url.searchParams.get('accessType') || null;
		const dateFrom = url.searchParams.get('dateFrom') || null;
		const dateTo = url.searchParams.get('dateTo') || null;

		// Step 4: Query access logs from database (no RLS needed - permission already checked)
		const { accessLogs, totalCount } = await transaction(async (client) => {
			// Build WHERE clause dynamically
			const conditions: string[] = [];
			const params: any[] = [];
			let paramIndex = 1;

			if (documentId) {
				conditions.push(`dal.document_id = $${paramIndex++}`);
				params.push(documentId);
			}

			if (filterUserId) {
				conditions.push(`dal.user_id = $${paramIndex++}`);
				params.push(filterUserId);
			}

			if (accessType) {
				conditions.push(`dal.access_type = $${paramIndex++}`);
				params.push(accessType);
			}

			if (dateFrom) {
				conditions.push(`dal.created_at >= $${paramIndex++}`);
				params.push(new Date(dateFrom));
			}

			if (dateTo) {
				const endDate = new Date(dateTo);
				endDate.setHours(23, 59, 59, 999); // End of day
				conditions.push(`dal.created_at <= $${paramIndex++}`);
				params.push(endDate);
			}

			const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

			// Get total count
			const countResult = await client.query(
				`SELECT COUNT(*) as count
				 FROM hr_public.document_access_logs dal
				 ${whereClause}`,
				params
			);

			const total = parseInt(countResult.rows[0].count);

			// Get paginated logs
			const offset = (page - 1) * limit;
			params.push(limit, offset);

			const logsResult = await client.query(
				`SELECT
					dal.id,
					dal.document_id,
					dal.user_id,
					dal.access_type,
					dal.created_at as accessed_at,
					dal.ip_address,
					u.email as user_email,
					u.first_name,
					u.last_name,
					d.title as document_title,
					d.mime_type as document_type
				 FROM hr_public.document_access_logs dal
				 LEFT JOIN hr_public.users u ON dal.user_id = u.id
				 LEFT JOIN hr_public.documents d ON dal.document_id = d.id
				 ${whereClause}
				 ORDER BY dal.created_at DESC
				 LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
				params
			);

			return {
				accessLogs: logsResult.rows,
				totalCount: total
			};
		});

		// Step 5: Return data
		return {
			accessLogs,
			totalCount,
			page,
			limit,
			filters: {
				documentId,
				userId: filterUserId,
				accessType,
				dateFrom,
				dateTo
			},
			user: locals.user,
			userPermissions,
			userRoles,
			isSystemAdmin
		};
	} catch (err) {
		console.error('Audit log load error:', err);

		// Re-throw redirects and errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Generic error fallback
		error(500, {
			message: 'Failed to load audit logs. Please try again later.'
		});
	}
};
