// Audit log page server-side loader (Feature 024)
// Server-side data loading for audit logs with RBAC checks (HR/Admin only)

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals, fetch }) => {
	// Step 1: Validate authentication
	if (!locals.user) {
		throw redirect(303, '/login?redirectTo=/dashboard/documents/audit');
	}

	const userId = locals.user.id;
	const userRole = locals.user.role || 'employee';

	// Step 2: Check user permissions - only admin and super_admin can access audit logs
	const canAccessAuditLog = userRole === 'super_admin' || userRole === 'admin';

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

		// Step 4: Build query for access logs
		// TODO: Replace with actual database query
		// SELECT * FROM hr_public.document_access_logs
		// WHERE (documentId IS NULL OR document_id = documentId)
		//   AND (filterUserId IS NULL OR user_id = filterUserId)
		//   AND (accessType IS NULL OR access_type = accessType)
		//   AND (dateFrom IS NULL OR access_timestamp >= dateFrom)
		//   AND (dateTo IS NULL OR access_timestamp <= dateTo)
		// ORDER BY access_timestamp DESC
		// LIMIT limit OFFSET (page - 1) * limit

		// Mock data for now
		const accessLogs = [
			{
				id: 'log-1',
				document_id: 'doc-123',
				user_id: userId,
				access_type: 'download' as const,
				access_timestamp: new Date().toISOString(),
				access_outcome: 'success' as const,
				ip_address: '127.0.0.1',
				user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
				denial_reason: null
			},
			{
				id: 'log-2',
				document_id: 'doc-456',
				user_id: 'user-456',
				access_type: 'preview' as const,
				access_timestamp: new Date(Date.now() - 3600000).toISOString(),
				access_outcome: 'success' as const,
				ip_address: '192.168.1.100',
				user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
				denial_reason: null
			},
			{
				id: 'log-3',
				document_id: 'doc-789',
				user_id: 'user-789',
				access_type: 'download' as const,
				access_timestamp: new Date(Date.now() - 7200000).toISOString(),
				access_outcome: 'denied' as const,
				ip_address: '10.0.0.50',
				user_agent: 'Mozilla/5.0 (X11; Linux x86_64)',
				denial_reason: 'Insufficient permissions - document not assigned to user'
			}
		];

		// Apply client-side filtering for demo (would be done in database query)
		let filteredLogs = accessLogs;

		if (documentId) {
			filteredLogs = filteredLogs.filter(log => log.document_id === documentId);
		}

		if (filterUserId) {
			filteredLogs = filteredLogs.filter(log => log.user_id === filterUserId);
		}

		if (accessType) {
			filteredLogs = filteredLogs.filter(log => log.access_type === accessType);
		}

		if (dateFrom) {
			const fromDate = new Date(dateFrom);
			filteredLogs = filteredLogs.filter(log => new Date(log.access_timestamp) >= fromDate);
		}

		if (dateTo) {
			const toDate = new Date(dateTo);
			toDate.setHours(23, 59, 59, 999); // End of day
			filteredLogs = filteredLogs.filter(log => new Date(log.access_timestamp) <= toDate);
		}

		const totalCount = filteredLogs.length;

		// Apply pagination
		const startIndex = (page - 1) * limit;
		const endIndex = startIndex + limit;
		const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

		// Step 5: Return data
		return {
			accessLogs: paginatedLogs,
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
			userRole
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
