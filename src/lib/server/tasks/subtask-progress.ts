/**
 * Subtask Progress Calculation Service
 * Feature: 028-task-system-expansion - T025
 *
 * Provides comprehensive subtask progress tracking and calculation
 * for task hierarchies. Supports recursive progress calculation up to 3 levels
 * and provides progress summaries for parent tasks.
 */

// Export types
export type {
	TaskProgress,
	HierarchicalProgressSummary,
	ProgressStatistics
} from './progress/types';

// Export calculators
export { calculateSubtaskProgress } from './progress/calculators';

// Export fetchers
export {
	getTaskProgress,
	getHierarchicalProgress,
	getUserTaskStatistics,
	getDepartmentTaskStatistics,
	getTopLevelTasksProgress
} from './progress/fetchers';

// Export formatters
export { formatProgressPercentage, getProgressColor, isTaskOnTrack } from './progress/formatters';
