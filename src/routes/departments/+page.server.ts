import type { PageServerLoad } from './$types';
import { mountianHRApiClient } from '$lib/api/client';
import { withAuthGuard, roleChecks } from '$lib/auth/guards';

export const load: PageServerLoad = withAuthGuard(
	roleChecks.any(['admin', 'hr', 'hr_admin', 'hr_manager', 'manager']),
	async ({ cookies }) => {
		const token = cookies.get('auth_token');

		if (token) {
			mountianHRApiClient.setToken(token);

			try {
				// Load initial departments data
				const [departmentsResponse] = await Promise.allSettled([
					mountianHRApiClient.get('/api/v2/departments?active_only=true')
				]);

				return {
					initialDepartments:
						departmentsResponse.status === 'fulfilled'
							? departmentsResponse.value
							: { departments: [], count: 0 },
					error:
						departmentsResponse.status === 'rejected' ? departmentsResponse.reason?.message : null
				};
			} catch (error) {
				console.error('Failed to load departments:', error);
				return {
					initialDepartments: { departments: [], count: 0 },
					error: 'Failed to load departments'
				};
			}
		}

		return {
			initialDepartments: { departments: [], count: 0 },
			error: null
		};
	}
);
