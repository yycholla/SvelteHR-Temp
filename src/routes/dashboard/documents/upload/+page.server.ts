// Document upload page server-side loader (Feature 024)
// Server-side data loading for upload page with permission checks

import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
