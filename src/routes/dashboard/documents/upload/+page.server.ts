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
	const userRole = locals.user.role || 'employee';

	// Step 2: Check user permissions - only admin and manager roles can upload
	const canUpload = ['super_admin', 'admin', 'manager'].includes(userRole);

	if (!canUpload) {
		throw error(403, {
			message: 'Insufficient permissions. You do not have permission to upload documents.'
		});
	}

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

		// Step 4: Load employees for assignment (if admin/manager)
		// TODO: Call GET /api/employees when integrated
		let employees: any[] = [];
		if (userRole === 'super_admin' || userRole === 'admin') {
			// Admin can assign to all employees
			employees = []; // Would be populated from API
		} else if (userRole === 'manager') {
			// Manager can assign to direct reports
			// TODO: Call GET /api/employees/direct-reports
			employees = []; // Would be populated from API
		}

		// Step 5: Load departments for department-wide assignment
		// TODO: Call GET /api/departments when integrated
		let departments: any[] = [];
		if (userRole === 'super_admin' || userRole === 'admin') {
			departments = []; // Would be populated from API
		}

		// Step 6: Load teams for team assignment
		// TODO: Call GET /api/teams when integrated
		let teams: any[] = [];
		if (userRole === 'super_admin' || userRole === 'admin') {
			teams = []; // Would be populated from API
		}

		// Step 7: Return data for upload page
		return {
			user: locals.user,
			userRole,
			categories,
			employees,
			departments,
			teams,
			canUpload: true
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
