// Task Create Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T036
// Purpose: Load initial data for task creation form

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { PermissionChecks } from '$lib/server/rbac-utils';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication and permissions
	if (!locals.user) {
		redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	PermissionChecks.tasksWrite({ locals, url, cookies } as any);

	try {
		// TODO: Fetch list of employees for assignee selection
		// const urqlClient = createUrqlClient(token);
		// const employees = await fetchEmployees(urqlClient);

		// TODO: Fetch list of departments for department task assignment
		// const departments = await fetchDepartments(urqlClient);

		// For now, return basic data
		return {
			user: locals.user,
			// employees: [],
			// departments: [],
			minDate: new Date().toISOString().split('T')[0], // Today's date for date picker min
			defaultDueDate: getDefaultDueDate()
		};
	} catch (err: any) {
		logger.error('Error loading task creation page:', err as Error);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		error(500, {
			message: 'Failed to load task creation form. Please try again later.'
		});
	}
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
		super_admin: 200, // Highest level - system administrator
		admin: 100,
		hr_manager: 80,
		manager: 60,
		employee: 20
	};

	return roleLevels[role?.toLowerCase() || 'employee'] || 20;
}

// Helper to get default due date (7 days from now)
function getDefaultDueDate(): string {
	const date = new Date();
	date.setDate(date.getDate() + 7);
	return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
}
