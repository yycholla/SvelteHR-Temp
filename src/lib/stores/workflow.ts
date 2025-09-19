/**
 * Workflow Automation Store
 * Manages workflow definitions, instances, and tasks for the HR system
 */

import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { createUrqlClient } from '$lib/graphql/client';
import {
	GET_WORKFLOW_DEFINITIONS,
	GET_WORKFLOW_DEFINITION_BY_ID,
	GET_WORKFLOW_INSTANCES,
	GET_WORKFLOW_TASKS,
	CREATE_WORKFLOW_DEFINITION,
	UPDATE_WORKFLOW_DEFINITION,
	START_WORKFLOW_INSTANCE,
	UPDATE_WORKFLOW_TASK
} from '$lib/graphql/postgraphile-operations';
import type {
	WorkflowDefinition,
	WorkflowInstance,
	WorkflowTask,
	CreateWorkflowDefinitionInput,
	UpdateWorkflowDefinitionInput,
	CreateWorkflowInstanceInput,
	UpdateWorkflowTaskInput
} from '$lib/generated/types';

// Workflow state interfaces
export interface WorkflowDefinitionWithStats extends WorkflowDefinition {
	instanceCount?: number;
	activeInstanceCount?: number;
	successRate?: number;
}

export interface WorkflowState {
	definitions: WorkflowDefinitionWithStats[];
	instances: WorkflowInstance[];
	tasks: WorkflowTask[];
	currentDefinition: WorkflowDefinition | null;
	currentInstance: WorkflowInstance | null;
	isLoading: boolean;
	error: string | null;
	filters: {
		definitionStatus?: string;
		instanceStatus?: string;
		taskStatus?: string;
		category?: string;
		assignedToId?: string;
	};
}

// Initial state
const initialState: WorkflowState = {
	definitions: [],
	instances: [],
	tasks: [],
	currentDefinition: null,
	currentInstance: null,
	isLoading: false,
	error: null,
	filters: {}
};

// Create the main workflow store
export const workflowStore = writable<WorkflowState>(initialState);

// Derived stores for convenience
export const workflowDefinitions = derived(workflowStore, ($workflow) => $workflow.definitions);
export const workflowInstances = derived(workflowStore, ($workflow) => $workflow.instances);
export const workflowTasks = derived(workflowStore, ($workflow) => $workflow.tasks);
export const currentWorkflowDefinition = derived(
	workflowStore,
	($workflow) => $workflow.currentDefinition
);
export const currentWorkflowInstance = derived(
	workflowStore,
	($workflow) => $workflow.currentInstance
);
export const isWorkflowLoading = derived(workflowStore, ($workflow) => $workflow.isLoading);
export const workflowError = derived(workflowStore, ($workflow) => $workflow.error);

// Filtered data derived stores
export const filteredDefinitions = derived(workflowStore, ($workflow) => {
	let filtered = $workflow.definitions;

	if ($workflow.filters.definitionStatus) {
		filtered = filtered.filter((def) => def.status === $workflow.filters.definitionStatus);
	}

	if ($workflow.filters.category) {
		filtered = filtered.filter((def) => def.category === $workflow.filters.category);
	}

	return filtered;
});

export const filteredInstances = derived(workflowStore, ($workflow) => {
	let filtered = $workflow.instances;

	if ($workflow.filters.instanceStatus) {
		filtered = filtered.filter((instance) => instance.status === $workflow.filters.instanceStatus);
	}

	return filtered;
});

export const filteredTasks = derived(workflowStore, ($workflow) => {
	let filtered = $workflow.tasks;

	if ($workflow.filters.taskStatus) {
		filtered = filtered.filter((task) => task.status === $workflow.filters.taskStatus);
	}

	if ($workflow.filters.assignedToId) {
		filtered = filtered.filter((task) => task.assignedToId === $workflow.filters.assignedToId);
	}

	return filtered;
});

// Statistics derived stores
export const workflowStats = derived(workflowStore, ($workflow) => {
	const totalDefinitions = $workflow.definitions.length;
	const activeDefinitions = $workflow.definitions.filter((def) => def.status === 'active').length;
	const totalInstances = $workflow.instances.length;
	const runningInstances = $workflow.instances.filter(
		(instance) => instance.status === 'running'
	).length;
	const completedInstances = $workflow.instances.filter(
		(instance) => instance.status === 'completed'
	).length;
	const failedInstances = $workflow.instances.filter(
		(instance) => instance.status === 'failed'
	).length;
	const totalTasks = $workflow.tasks.length;
	const pendingTasks = $workflow.tasks.filter((task) => task.status === 'pending').length;
	const inProgressTasks = $workflow.tasks.filter((task) => task.status === 'in_progress').length;
	const completedTasks = $workflow.tasks.filter((task) => task.status === 'completed').length;

	return {
		definitions: {
			total: totalDefinitions,
			active: activeDefinitions,
			inactive: totalDefinitions - activeDefinitions
		},
		instances: {
			total: totalInstances,
			running: runningInstances,
			completed: completedInstances,
			failed: failedInstances,
			successRate: totalInstances > 0 ? (completedInstances / totalInstances) * 100 : 0
		},
		tasks: {
			total: totalTasks,
			pending: pendingTasks,
			inProgress: inProgressTasks,
			completed: completedTasks,
			completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
		}
	};
});

// Workflow actions
export const workflowActions = {
	/**
	 * Set loading state
	 */
	setLoading: (loading: boolean) => {
		workflowStore.update((state) => ({ ...state, isLoading: loading }));
	},

	/**
	 * Set error state
	 */
	setError: (error: string | null) => {
		workflowStore.update((state) => ({ ...state, error }));
	},

	/**
	 * Set filters
	 */
	setFilters: (filters: Partial<WorkflowState['filters']>) => {
		workflowStore.update((state) => ({
			...state,
			filters: { ...state.filters, ...filters }
		}));
	},

	/**
	 * Clear filters
	 */
	clearFilters: () => {
		workflowStore.update((state) => ({ ...state, filters: {} }));
	},

	/**
	 * Load workflow definitions
	 */
	loadDefinitions: async (first: number = 50): Promise<void> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.query(GET_WORKFLOW_DEFINITIONS, { first }).toPromise();

			if (result.data?.allWorkflowDefinitions?.nodes) {
				workflowStore.update((state) => ({
					...state,
					definitions: result.data.allWorkflowDefinitions.nodes,
					isLoading: false
				}));
			} else {
				workflowActions.setError('Failed to load workflow definitions');
			}
		} catch (error) {
			console.error('Error loading workflow definitions:', error);
			workflowActions.setError('Failed to load workflow definitions');
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Load specific workflow definition
	 */
	loadDefinition: async (id: string): Promise<void> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.query(GET_WORKFLOW_DEFINITION_BY_ID, { id }).toPromise();

			if (result.data?.workflowDefinitionById) {
				workflowStore.update((state) => ({
					...state,
					currentDefinition: result.data.workflowDefinitionById,
					isLoading: false
				}));
			} else {
				workflowActions.setError('Workflow definition not found');
			}
		} catch (error) {
			console.error('Error loading workflow definition:', error);
			workflowActions.setError('Failed to load workflow definition');
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Load workflow instances
	 */
	loadInstances: async (first: number = 50): Promise<void> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.query(GET_WORKFLOW_INSTANCES, { first }).toPromise();

			if (result.data?.allWorkflowInstances?.nodes) {
				workflowStore.update((state) => ({
					...state,
					instances: result.data.allWorkflowInstances.nodes,
					isLoading: false
				}));
			} else {
				workflowActions.setError('Failed to load workflow instances');
			}
		} catch (error) {
			console.error('Error loading workflow instances:', error);
			workflowActions.setError('Failed to load workflow instances');
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Load workflow tasks
	 */
	loadTasks: async (first: number = 50, condition?: any): Promise<void> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.query(GET_WORKFLOW_TASKS, { first, condition }).toPromise();

			if (result.data?.allWorkflowTasks?.nodes) {
				workflowStore.update((state) => ({
					...state,
					tasks: result.data.allWorkflowTasks.nodes,
					isLoading: false
				}));
			} else {
				workflowActions.setError('Failed to load workflow tasks');
			}
		} catch (error) {
			console.error('Error loading workflow tasks:', error);
			workflowActions.setError('Failed to load workflow tasks');
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Create workflow definition
	 */
	createDefinition: async (input: CreateWorkflowDefinitionInput): Promise<boolean> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.mutation(CREATE_WORKFLOW_DEFINITION, { input }).toPromise();

			if (result.data?.createWorkflowDefinition?.workflowDefinition) {
				// Add to current definitions
				workflowStore.update((state) => ({
					...state,
					definitions: [
						result.data.createWorkflowDefinition.workflowDefinition,
						...state.definitions
					],
					isLoading: false
				}));
				return true;
			} else {
				workflowActions.setError('Failed to create workflow definition');
				return false;
			}
		} catch (error) {
			console.error('Error creating workflow definition:', error);
			workflowActions.setError('Failed to create workflow definition');
			return false;
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Update workflow definition
	 */
	updateDefinition: async (id: string, patch: any): Promise<boolean> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.mutation(UPDATE_WORKFLOW_DEFINITION, { id, patch }).toPromise();

			if (result.data?.updateWorkflowDefinitionById?.workflowDefinition) {
				const updated = result.data.updateWorkflowDefinitionById.workflowDefinition;

				// Update in current definitions
				workflowStore.update((state) => ({
					...state,
					definitions: state.definitions.map((def) => (def.id === id ? updated : def)),
					currentDefinition: state.currentDefinition?.id === id ? updated : state.currentDefinition,
					isLoading: false
				}));
				return true;
			} else {
				workflowActions.setError('Failed to update workflow definition');
				return false;
			}
		} catch (error) {
			console.error('Error updating workflow definition:', error);
			workflowActions.setError('Failed to update workflow definition');
			return false;
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Start workflow instance
	 */
	startInstance: async (input: CreateWorkflowInstanceInput): Promise<boolean> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.mutation(START_WORKFLOW_INSTANCE, { input }).toPromise();

			if (result.data?.createWorkflowInstance?.workflowInstance) {
				// Add to current instances
				workflowStore.update((state) => ({
					...state,
					instances: [result.data.createWorkflowInstance.workflowInstance, ...state.instances],
					isLoading: false
				}));
				return true;
			} else {
				workflowActions.setError('Failed to start workflow instance');
				return false;
			}
		} catch (error) {
			console.error('Error starting workflow instance:', error);
			workflowActions.setError('Failed to start workflow instance');
			return false;
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Update workflow task
	 */
	updateTask: async (id: string, patch: any): Promise<boolean> => {
		workflowActions.setLoading(true);
		workflowActions.setError(null);

		try {
			const client = createUrqlClient();
			const result = await client.mutation(UPDATE_WORKFLOW_TASK, { id, patch }).toPromise();

			if (result.data?.updateWorkflowTaskById?.workflowTask) {
				const updated = result.data.updateWorkflowTaskById.workflowTask;

				// Update in current tasks
				workflowStore.update((state) => ({
					...state,
					tasks: state.tasks.map((task) => (task.id === id ? updated : task)),
					isLoading: false
				}));
				return true;
			} else {
				workflowActions.setError('Failed to update workflow task');
				return false;
			}
		} catch (error) {
			console.error('Error updating workflow task:', error);
			workflowActions.setError('Failed to update workflow task');
			return false;
		} finally {
			workflowActions.setLoading(false);
		}
	},

	/**
	 * Refresh all workflow data
	 */
	refreshAll: async (): Promise<void> => {
		await Promise.all([
			workflowActions.loadDefinitions(),
			workflowActions.loadInstances(),
			workflowActions.loadTasks()
		]);
	}
};

// Export store as default
export { workflowStore as default };

// Utility functions
export const getWorkflowState = (): WorkflowState => get(workflowStore);
export const getWorkflowStats = () => get(workflowStats);
