import { writable } from 'svelte/store';
import type { WorkflowDefinitionWithStats, WorkflowInstance, WorkflowTask } from './types';

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
