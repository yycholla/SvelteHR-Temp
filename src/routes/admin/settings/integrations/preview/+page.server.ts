import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// This page is client-side interactive only
	// No initial data needed from server
	return {
		title: 'Sync Preview / Dry Run'
	};
};
