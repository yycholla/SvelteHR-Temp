import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const query = event.url.searchParams.toString();
	throw redirect(308, query ? `/dashboard/tasks?${query}` : '/dashboard/tasks');
};
