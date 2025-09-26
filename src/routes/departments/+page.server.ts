// Redirect to dashboard departments page
// T036: Department page moved to dashboard layout

import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	// Redirect to the new dashboard departments location
	// Preserve any search parameters
	const searchParams = event.url.searchParams.toString();
	const redirectUrl = searchParams
		? `/dashboard/departments?${searchParams}`
		: '/dashboard/departments';

	throw redirect(301, redirectUrl);
};
