import type { PerformanceBudget } from './types';

// Performance targets aligned with requirements (Updated to be more forgiving)
export const PERFORMANCE_BUDGET: PerformanceBudget = {
	pageLoad: 2000, // 2 seconds
	graphqlResponse: 500, // 500ms
	componentRender: 100, // 100ms
	realTimeUpdate: 200, // 200ms
	exportOperation: 5000, // 5 seconds
	memoryLimit: 100 * 1024 * 1024 // 100MB
};
