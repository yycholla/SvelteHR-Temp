// Task Create Page Server-Side Data Loading
// Feature: 019-we-need-to - Task T036
// Purpose: Load initial data for task creation form

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { createUrqlClient } from '$lib/graphql/client';

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	// Check authentication
	if (!locals.user) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Get user credentials for GraphQL operations
	const token = cookies.get('hr_token') || cookies.get('auth-token');
	if (!token) {
		throw redirect(303, `/login?redirectTo=${url.pathname}`);
	}

	// Check if user has manager or admin privileges to create tasks
	const roleLevel = getRoleLevel(locals.user.role);
	if (roleLevel < 60) {
		// Only managers and above can create tasks
		throw error(403, {
			message: 'Access denied. Manager privileges required to create tasks.'
		});
	}

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
		console.error('Error loading task creation page:', err);

		// Handle specific error cases
		if (err.message?.includes('unauthorized') || err.message?.includes('authentication')) {
			throw redirect(303, `/login?redirectTo=${url.pathname}`);
		}

		// If it's already a SvelteKit error, rethrow it
		if (err.status) {
			throw err;
		}

		throw error(500, {
			message: 'Failed to load task creation form. Please try again later.'
		});
	}
};

// Helper function to get role level for authorization
function getRoleLevel(role: string | undefined): number {
	const roleLevels: Record<string, number> = {
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
