import { GRAPHQL_OPERATION_CONSTANTS } from '$lib/types/graphql-contracts';
import type { CacheConfig } from './types';

export const DEFAULT_CACHE_CONFIG: CacheConfig = {
	defaultTTL: GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES, // 30 minutes
	maxTTL: GRAPHQL_OPERATION_CONSTANTS.MAX_CACHE_TTL_MINUTES,
	enableStaleWhileRevalidate: true,
	enableCacheWarming: false, // Disabled by default for performance
	invalidationStrategies: [
		{
			name: 'user_data',
			pattern: /^(getUser|getCurrentUser|getUserProfile)/,
			scope: 'user',
			cascading: true
		},
		{
			name: 'employee_data',
			pattern: /^(getEmployee|getEmployees|createEmployee|updateEmployee)/,
			scope: 'department',
			cascading: true
		},
		{
			name: 'department_data',
			pattern: /^(getDepartment|getDepartments|createDepartment)/,
			scope: 'global',
			cascading: true
		},
		{
			name: 'dashboard_data',
			pattern: /^(getDashboard|getCompleteDashboardData)/,
			scope: 'user',
			cascading: false
		}
	],
	performanceTracking: true
};
