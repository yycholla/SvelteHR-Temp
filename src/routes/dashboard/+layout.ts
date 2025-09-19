import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url, parent }) => {
	// Wait for parent layout data (including auth state)
	await parent();

	// This load function ensures the dashboard layout is properly rendered
	// and handles any dashboard-specific data loading

	return {
		// Dashboard-specific metadata
		dashboardMeta: {
			title: 'Dashboard',
			description: 'HR Management Dashboard',
			currentPath: url.pathname
		}
	};
};
