import { derived } from 'svelte/store';
import { workflowStore } from './store';
import type { WorkflowStats } from './types';

export const workflowStats = derived(
	[workflowStore.definitions, workflowStore.instances, workflowStore.tasks],
	([$definitions, $instances, $tasks]) => {
		// Count definitions by status
		const activeDefinitions = $definitions.filter((d) => d.status === 'active').length;
		const inactiveDefinitions = $definitions.filter((d) => d.status === 'inactive').length;
		const draftDefinitions = $definitions.filter((d) => d.status === 'draft').length;

		// Count instances by status
		const runningInstances = $instances.filter((i) => i.status === 'running').length;
		const completedInstances = $instances.filter((i) => i.status === 'completed').length;
		const failedInstances = $instances.filter((i) => i.status === 'failed').length;
		const pendingInstances = $instances.filter((i) => i.status === 'pending').length;
		const cancelledInstances = $instances.filter((i) => i.status === 'cancelled').length;

		// Count tasks by status
		const pendingTasks = $tasks.filter((t) => t.status === 'pending').length;
		const inProgressTasks = $tasks.filter((t) => t.status === 'running').length;
		const completedTasks = $tasks.filter((t) => t.status === 'completed').length;
		const failedTasks = $tasks.filter((t) => t.status === 'failed').length;
		const skippedTasks = $tasks.filter((t) => t.status === 'skipped').length;

		// Calculate success rate for instances
		const totalCompletedOrFailed = completedInstances + failedInstances;
		const instanceSuccessRate =
			totalCompletedOrFailed > 0 ? (completedInstances / totalCompletedOrFailed) * 100 : 0;

		// Calculate completion rate for tasks
		const totalTasksCompleted = completedTasks + failedTasks + skippedTasks;
		const taskCompletionRate =
			totalTasksCompleted > 0 ? (completedTasks / totalTasksCompleted) * 100 : 0;

		// Calculate average success rate from definitions
		let averageSuccessRate = 0;
		if ($definitions.length > 0) {
			const totalSuccessRate = $definitions.reduce((acc, def) => acc + (def.successRate || 0), 0);
			averageSuccessRate = totalSuccessRate / $definitions.length;
		}

		const stats: WorkflowStats = {
			// Flat properties (for backwards compatibility)
			totalDefinitions: $definitions.length,
			activeDefinitions,
			totalInstances: $instances.length,
			runningInstances,
			completedInstances,
			failedInstances,
			averageSuccessRate,

			// Nested statistics for UI components
			definitions: {
				total: $definitions.length,
				active: activeDefinitions,
				inactive: inactiveDefinitions,
				draft: draftDefinitions
			},
			instances: {
				total: $instances.length,
				running: runningInstances,
				completed: completedInstances,
				failed: failedInstances,
				pending: pendingInstances,
				cancelled: cancelledInstances,
				successRate: instanceSuccessRate
			},
			tasks: {
				total: $tasks.length,
				pending: pendingTasks,
				inProgress: inProgressTasks,
				completed: completedTasks,
				failed: failedTasks,
				skipped: skippedTasks,
				completionRate: taskCompletionRate
			}
		};

		return stats;
	}
);

export const workflowError = derived(workflowStore.error, ($error) => $error);

export const isWorkflowLoading = derived(workflowStore.loading, ($loading) => $loading);

// Filtered definitions based on current filters
export const filteredDefinitions = derived(
	[workflowStore.definitions, workflowStore.filters],
	([$definitions, $filters]) => {
		let filtered = $definitions;

		if ($filters.definitionStatus) {
			filtered = filtered.filter((def) => def.status === $filters.definitionStatus);
		}

		if ($filters.category) {
			filtered = filtered.filter((def) => def.category === $filters.category);
		}

		return filtered;
	}
);

// Filtered instances based on current filters
export const filteredInstances = derived(
	[workflowStore.instances, workflowStore.filters],
	([$instances, $filters]) => {
		let filtered = $instances;

		if ($filters.instanceStatus) {
			filtered = filtered.filter((inst) => inst.status === $filters.instanceStatus);
		}

		if ($filters.workflowDefinitionId) {
			filtered = filtered.filter(
				(inst) => inst.workflowDefinitionId === $filters.workflowDefinitionId
			);
		}

		return filtered;
	}
);

// Filtered tasks based on current filters
export const filteredTasks = derived(
	[workflowStore.tasks, workflowStore.filters],
	([$tasks, $filters]) => {
		let filtered = $tasks;

		if ($filters.taskStatus) {
			filtered = filtered.filter((task) => task.status === $filters.taskStatus);
		}

		if ($filters.workflowInstanceId) {
			filtered = filtered.filter((task) => task.workflowInstanceId === $filters.workflowInstanceId);
		}

		if ($filters.assignedTo) {
			filtered = filtered.filter((task) => task.assignedTo === $filters.assignedTo);
		}

		return filtered;
	}
);
