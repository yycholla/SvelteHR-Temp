// Workflow Store - Workflow management and orchestration
// Created: 2025-12-08

import { derived, writable } from 'svelte/store';

// ===========================
// Type Definitions
// ===========================

export type WorkflowTriggerType =
	| 'DOCUMENT_SIGNED'
	| 'DOCUMENT_UPLOADED'
	| 'EMPLOYEE_HIRED'
	| 'EMPLOYEE_TERMINATED'
	| 'GOAL_COMPLETED'
	| 'GOAL_CREATED'
	| 'MANUAL_TRIGGER'
	| 'PAYROLL_PROCESSED'
	| 'REVIEW_COMPLETED'
	| 'REVIEW_CREATED'
	| 'SCHEDULED_TRIGGER'
	| 'TIME_OFF_APPROVED'
	| 'TIME_OFF_REJECTED'
	| 'TIME_OFF_REQUESTED'
	| 'USER_CREATED';

export interface WorkflowDefinitionWithStats {
	id: string;
	name: string;
	description?: string;
	category?: string | null;
	triggerType: WorkflowTriggerType;
	triggerConditions?: Record<string, any>;
	definition: Record<string, any>;
	isTemplate: boolean;
	timeoutMinutes?: number;
	maxRetries?: number;
	retryDelayMinutes?: number;
	status: 'draft' | 'active' | 'inactive';
	version: number;
	createdBy?: string;
	departmentId?: string | null;
	createdAt: string;
	updatedAt: string;
	// Stats
	instanceCount?: number;
	successRate?: number;
	userByCreatedBy?: {
		id: string;
		displayName: string;
		email: string;
	};
}

export interface WorkflowInstance {
	id: string;
	workflowDefinitionId: string;
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
	startedAt?: string;
	completedAt?: string;
	triggeredBy?: string;
	triggeredByUserId?: string;
	triggeredByEvent?: string;
	triggerData?: Record<string, any>;
	contextData?: Record<string, any>;
	currentStep?: string;
	currentStepId?: string;
	stepData?: Record<string, any>;
	error?: string;
	errorMessage?: string;
	instanceName?: string;
	retryCount?: number;
	workflowDefinition?: WorkflowDefinitionWithStats;
	// PostGraphile relationship fields
	workflowDefinitionByWorkflowDefinitionId?: WorkflowDefinitionWithStats;
	userByTriggeredByUserId?: {
		id: string;
		displayName?: string;
		email?: string;
	};
	createdAt: string;
	updatedAt: string;
}

export type WorkflowTaskStatus =
	| 'pending'
	| 'running'
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'skipped';

export interface WorkflowTask {
	id: string;
	workflowInstanceId: string;
	stepName: string;
	stepType: string;
	status: WorkflowTaskStatus;
	assignedTo?: string;
	assignedToId?: string;
	assignedById?: string;
	priority?: string | null;
	title: string;
	description?: string;
	dueDate?: string;
	taskType?: string;
	taskData?: Record<string, any>;
	completionCriteria?: Record<string, any>;
	startedAt?: string;
	completedAt?: string;
	input?: Record<string, any>;
	output?: Record<string, any>;
	error?: string;
	workflowInstance?: WorkflowInstance;
	// PostGraphile relationship fields
	workflowInstanceByWorkflowInstanceId?: WorkflowInstance;
	userByAssignedToId?: {
		id: string;
		displayName?: string;
		email?: string;
	};
	userByAssignedById?: {
		id: string;
		displayName?: string;
		email?: string;
	};
	createdAt: string;
	updatedAt: string;
}

export interface WorkflowStats {
	totalDefinitions: number;
	activeDefinitions: number;
	totalInstances: number;
	runningInstances: number;
	completedInstances: number;
	failedInstances: number;
	averageSuccessRate: number;
	// Nested statistics for UI components
	definitions: {
		total: number;
		active: number;
		inactive: number;
		draft: number;
	};
	instances: {
		total: number;
		running: number;
		completed: number;
		failed: number;
		pending: number;
		cancelled: number;
		successRate: number;
	};
	tasks: {
		total: number;
		pending: number;
		inProgress: number;
		completed: number;
		failed: number;
		skipped: number;
		completionRate: number;
	};
}

// ===========================
// Workflow Store
// ===========================

function createWorkflowStore() {
	const definitions = writable<WorkflowDefinitionWithStats[]>([]);
	const instances = writable<WorkflowInstance[]>([]);
	const tasks = writable<WorkflowTask[]>([]);
	const loading = writable<boolean>(false);
	const error = writable<string | null>(null);
	const filters = writable<Record<string, any>>({});

	return {
		definitions,
		instances,
		tasks,
		loading,
		error,
		filters
	};
}

export const workflowStore = createWorkflowStore();

// ===========================
// Derived Stores
// ===========================

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

// ===========================
// Workflow Actions
// ===========================

export const workflowActions = {
	/**
	 * Create a new workflow definition
	 */
	async createDefinition(input: {
		workflowDefinition: Partial<WorkflowDefinitionWithStats>;
	}): Promise<boolean> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would make an API call
			const newDefinition: WorkflowDefinitionWithStats = {
				id: `wf_${Date.now()}`,
				name: input.workflowDefinition.name || '',
				description: input.workflowDefinition.description,
				category: input.workflowDefinition.category,
				triggerType: input.workflowDefinition.triggerType || 'MANUAL_TRIGGER',
				triggerConditions: input.workflowDefinition.triggerConditions,
				definition: input.workflowDefinition.definition || {},
				isTemplate: input.workflowDefinition.isTemplate || false,
				timeoutMinutes: input.workflowDefinition.timeoutMinutes,
				maxRetries: input.workflowDefinition.maxRetries,
				retryDelayMinutes: input.workflowDefinition.retryDelayMinutes,
				status: input.workflowDefinition.status || 'draft',
				version: input.workflowDefinition.version || 1,
				createdBy: input.workflowDefinition.createdBy,
				departmentId: input.workflowDefinition.departmentId,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
				instanceCount: 0,
				successRate: 0
			};

			workflowStore.definitions.update((defs) => [...defs, newDefinition]);

			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to create workflow';
			workflowStore.error.set(errorMessage);
			return false;
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Update an existing workflow definition
	 */
	async updateDefinition(
		definitionId: string,
		updates: Partial<WorkflowDefinitionWithStats>
	): Promise<boolean> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would make an API call
			workflowStore.definitions.update((defs) =>
				defs.map((def) =>
					def.id === definitionId
						? {
								...def,
								...updates,
								updatedAt: new Date().toISOString()
							}
						: def
				)
			);

			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to update workflow';
			workflowStore.error.set(errorMessage);
			return false;
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Delete a workflow definition
	 */
	async deleteDefinition(definitionId: string): Promise<boolean> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would make an API call
			workflowStore.definitions.update((defs) => defs.filter((def) => def.id !== definitionId));

			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to delete workflow';
			workflowStore.error.set(errorMessage);
			return false;
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Start a new workflow instance
	 */
	async startInstance(
		definitionId: string,
		triggerData?: Record<string, any>
	): Promise<WorkflowInstance | null> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would make an API call
			const newInstance: WorkflowInstance = {
				id: `wfi_${Date.now()}`,
				workflowDefinitionId: definitionId,
				status: 'pending',
				triggeredBy: undefined,
				triggerData,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			workflowStore.instances.update((instances) => [...instances, newInstance]);

			return newInstance;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to start workflow instance';
			workflowStore.error.set(errorMessage);
			return null;
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Update workflow instance status
	 */
	async updateInstance(instanceId: string, updates: Partial<WorkflowInstance>): Promise<boolean> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would make an API call
			workflowStore.instances.update((instances) =>
				instances.map((instance) =>
					instance.id === instanceId
						? {
								...instance,
								...updates,
								updatedAt: new Date().toISOString()
							}
						: instance
				)
			);

			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to update instance';
			workflowStore.error.set(errorMessage);
			return false;
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Complete a workflow task
	 */
	async completeTask(taskId: string, output?: Record<string, any>): Promise<boolean> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would make an API call
			workflowStore.tasks.update((tasks) =>
				tasks.map((task) =>
					task.id === taskId
						? {
								...task,
								status: 'completed' as const,
								output,
								completedAt: new Date().toISOString(),
								updatedAt: new Date().toISOString()
							}
						: task
				)
			);

			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
			workflowStore.error.set(errorMessage);
			return false;
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Update a workflow task
	 */
	async updateTask(taskId: string, updates: Partial<WorkflowTask>): Promise<boolean> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would make an API call
			workflowStore.tasks.update((tasks) =>
				tasks.map((task) =>
					task.id === taskId
						? {
								...task,
								...updates,
								updatedAt: new Date().toISOString()
							}
						: task
				)
			);

			return true;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
			workflowStore.error.set(errorMessage);
			return false;
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Load workflow definitions from API
	 */
	async loadDefinitions(limit?: number): Promise<void> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would fetch from API
			// For now, just clear the error state
			// The limit parameter can be used for pagination
			workflowStore.error.set(null);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load workflows';
			workflowStore.error.set(errorMessage);
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Load workflow instances from API
	 */
	async loadInstances(definitionId?: string): Promise<void> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would fetch from API
			// For now, just clear the error state
			workflowStore.error.set(null);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load instances';
			workflowStore.error.set(errorMessage);
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Load workflow tasks from API
	 */
	async loadTasks(limit?: number, condition?: Record<string, any>): Promise<void> {
		try {
			workflowStore.loading.set(true);
			workflowStore.error.set(null);

			// Mock implementation - in real app, this would fetch from API
			// For now, just clear the error state
			workflowStore.error.set(null);
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
			workflowStore.error.set(errorMessage);
		} finally {
			workflowStore.loading.set(false);
		}
	},

	/**
	 * Set filters for workflow data
	 */
	setFilters(filters: Record<string, any>): void {
		workflowStore.filters.update((current) => ({ ...current, ...filters }));
	},

	/**
	 * Clear all filters
	 */
	clearFilters(): void {
		workflowStore.filters.set({});
	}
};
