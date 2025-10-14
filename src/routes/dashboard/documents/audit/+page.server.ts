// Audit log page server-side loader (Feature 024)
// Server-side data loading for audit logs with RBAC checks (HR/Admin only)

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { transaction, setJWTClaims } from '$lib/server/db';

export const load: PageServerLoad = async ({ url, locals, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw redirect(303, '/login?redirectTo=/dashboard/documents/audit');
	}

	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';
	const userPermissions = locals.permissions || [];

	// Step 2: Check user permissions - users with audit log permissions can access
	const canAccessAuditLog =
		userPermissions.includes('*') ||
		userPermissions.includes('documents:audit') ||
		userPermissions.includes('audit:read');

	if (!canAccessAuditLog) {
		throw error(403, {
			message: 'Access denied. Only administrators can view audit logs.'
		});
	}

	try {
		// Step 3: Parse query parameters
		const page = parseInt(url.searchParams.get('page') || '1');
		const limit = parseInt(url.searchParams.get('limit') || '50');
		const documentId = url.searchParams.get('documentId') || null;
		const filterUserId = url.searchParams.get('userId') || null;
		const accessType = url.searchParams.get('accessType') || null;
		const dateFrom = url.searchParams.get('dateFrom') || null;
		const dateTo = url.searchParams.get('dateTo') || null;

		// Step 4: Query access logs from database
		const { accessLogs, totalCount } = await transaction(async (client) => {
			// Set JWT claims for RLS
			await setJWTClaims(client, userId, userRole);

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
				conditions.push(`dal.action = $${paramIndex++}`);
				params.push(accessType);
			}

			if (dateFrom) {
				conditions.push(`dal.accessed_at >= $${paramIndex++}`);
				params.push(new Date(dateFrom));
			}

			if (dateTo) {
				const endDate = new Date(dateTo);
				endDate.setHours(23, 59, 59, 999); // End of day
				conditions.push(`dal.accessed_at <= $${paramIndex++}`);
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
					dal.action,
					dal.accessed_at,
					dal.ip_address,
					dal.user_agent,
					u.email as user_email,
					d.title as document_title,
					d.mime_type as document_type
				 FROM hr_public.document_access_logs dal
				 LEFT JOIN hr_public.users u ON dal.user_id = u.id
				 LEFT JOIN hr_public.documents d ON dal.document_id = d.id
				 ${whereClause}
				 ORDER BY dal.accessed_at DESC
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
			userPermissions
		};
	} catch (err) {
		console.error('Audit log load error:', err);

		// Re-throw redirects and errors
		if (err && typeof err === 'object' && ('status' in err || 'location' in err)) {
			throw err;
		}

		// Generic error fallback
		throw error(500, {
			message: 'Failed to load audit logs. Please try again later.'
		});
	}
};
