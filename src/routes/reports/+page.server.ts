import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api/client';

export const load: PageServerLoad = async ({ cookies }) => {
  const token = cookies.get('auth-token');
  if (!token) {
    return {
      metrics: {
        totalEmployees: 0,
        timeOffRequests: 0,
        payrollTotal: 0,
        performanceCompletion: 0,
      },
      isUsingMockData: true
    };
  }

  const serverApiClient = apiClient.extend({
    hooks: {
      beforeRequest: [
        (request) => {
          request.headers.set('Authorization', `Bearer ${token}`);
          request.headers.set('Content-Type', 'application/json');
        }
      ]
    }
  });

  try {
    const [exec, hr, headcount] = await Promise.all([
      serverApiClient.get('reports/dashboard/executive').json<any>().catch(() => null),
      serverApiClient.get('reports/dashboard/hr').json<any>().catch(() => null),
      serverApiClient.get('reports/headcount-trends').json<any>().catch(() => null)
    ]);

    const metrics = {
      totalEmployees: headcount?.currentHeadcount ?? hr?.employeeCount ?? exec?.employeeCount ?? 0,
      timeOffRequests: hr?.timeOffRequestsPending ?? 0,
      payrollTotal: exec?.currentPayrollTotal ?? 0,
      performanceCompletion: hr?.performanceReviewCompletionRate ?? 0,
    };

    return { metrics, isUsingMockData: false };
  } catch {
    return {
      metrics: {
        totalEmployees: 0,
        timeOffRequests: 0,
        payrollTotal: 0,
        performanceCompletion: 0,
      },
      isUsingMockData: true
    };
  }
};
