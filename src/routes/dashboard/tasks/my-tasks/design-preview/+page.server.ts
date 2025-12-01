import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		user: null,
		userSession: null,
		tasks: [],
		totalTasks: 0,
		taskStats: {
			total: 0,
			notStarted: 0,
			inProgress: 0,
			blocked: 0,
			review: 0,
			completed: 0,
			overdue: 0
		},
		assignees: [],
		taskTypes: [],
		filters: {
			searchTerm: '',
			statusFilter: '',
			priorityFilter: ''
		},
		loadedAt: new Date().toISOString()
	};
};
