import type { PageServerLoad } from './$types';
import { MountainHRApiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies }) => {
  const apiClient = new MountainHRApiClient();
  const token = cookies.get('hr_token');
  
  if (token) {
    apiClient.setToken(token);
  }

  try {
    // Load basic data for HR dashboard
    const [employeesResponse, tasksResponse] = await Promise.allSettled([
      apiClient.get('/api/v2/employees', { pageSize: 10 }),
      apiClient.get('/api/v2/tasks', { pageSize: 10 })
    ]);

    return {
      employees: employeesResponse.status === 'fulfilled' ? employeesResponse.value.data : { total: 0, data: [] },
      tasks: tasksResponse.status === 'fulfilled' ? tasksResponse.value.data : { total: 0, data: [] }
    };
  } catch (error) {
    console.error('Failed to load HR dashboard data:', error);
    return {
      employees: { total: 0, data: [] },
      tasks: { total: 0, data: [] }
    };
  }
};