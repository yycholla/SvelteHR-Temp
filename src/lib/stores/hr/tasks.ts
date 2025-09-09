import { writable, derived } from 'svelte/store';

export interface Task {
	id: string;
	title: string;
	description: string;
	status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
	priority: 'low' | 'medium' | 'high' | 'urgent';
	assigned_to: string;
	assigned_by: string;
	due_date: string;
	category: string;
	created_at: string;
	updated_at: string;
	completed_at?: string;
}

export interface TaskFilters {
	search: string;
	status: string;
	priority: string;
	assigned_to: string;
	category: string;
	page: number;
	limit: number;
}

export interface TaskState {
	tasks: Task[];
	selectedTask: Task | null;
	filters: TaskFilters;
	loading: boolean;
	total: number;
}

const initialState: TaskState = {
	tasks: [],
	selectedTask: null,
	filters: {
		search: '',
		status: '',
		priority: '',
		assigned_to: '',
		category: '',
		page: 1,
		limit: 10
	},
	loading: false,
	total: 0
};

// Traditional Svelte store
const taskState = writable<TaskState>(initialState);

// Derived stores for computed properties
export const tasks = derived(taskState, ($state) => $state.tasks);
export const selectedTask = derived(taskState, ($state) => $state.selectedTask);
export const filters = derived(taskState, ($state) => $state.filters);
export const isLoading = derived(taskState, ($state) => $state.loading);
export const total = derived(taskState, ($state) => $state.total);

// Computed derived values
export const filteredTasks = derived(taskState, ($state) => {
	let filtered = $state.tasks;

	if ($state.filters.search) {
		const search = $state.filters.search.toLowerCase();
		filtered = filtered.filter(
			(task) =>
				task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search)
		);
	}

	if ($state.filters.status) {
		filtered = filtered.filter((task) => task.status === $state.filters.status);
	}

	if ($state.filters.priority) {
		filtered = filtered.filter((task) => task.priority === $state.filters.priority);
	}

	if ($state.filters.assigned_to) {
		filtered = filtered.filter((task) => task.assigned_to === $state.filters.assigned_to);
	}

	if ($state.filters.category) {
		filtered = filtered.filter((task) => task.category === $state.filters.category);
	}

	return filtered;
});

export const pendingTasks = derived(taskState, ($state) =>
	$state.tasks.filter((task) => task.status === 'pending')
);

export const completedTasks = derived(taskState, ($state) =>
	$state.tasks.filter((task) => task.status === 'completed')
);

export const urgentTasks = derived(taskState, ($state) =>
	$state.tasks.filter((task) => task.priority === 'urgent')
);

export const hasTasks = derived(taskState, ($state) => $state.tasks.length > 0);

// Store actions
export const taskActions = {
	setTasks(tasks: Task[], total: number) {
		taskState.update((state) => ({
			...state,
			tasks,
			total,
			loading: false
		}));
	},

	setSelectedTask(task: Task | null) {
		taskState.update((state) => ({
			...state,
			selectedTask: task
		}));
	},

	updateFilters(newFilters: Partial<TaskFilters>) {
		taskState.update((state) => ({
			...state,
			filters: { ...state.filters, ...newFilters }
		}));
	},

	setLoading(loading: boolean) {
		taskState.update((state) => ({
			...state,
			loading
		}));
	},

	addTask(task: Task) {
		taskState.update((state) => ({
			...state,
			tasks: [...state.tasks, task],
			total: state.total + 1
		}));
	},

	updateTask(task: Task) {
		taskState.update((state) => {
			const index = state.tasks.findIndex((t) => t.id === task.id);
			const updatedTasks = [...state.tasks];
			if (index !== -1) {
				updatedTasks[index] = task;
			}

			return {
				...state,
				tasks: updatedTasks,
				selectedTask: state.selectedTask?.id === task.id ? task : state.selectedTask
			};
		});
	},

	removeTask(taskId: string) {
		taskState.update((state) => ({
			...state,
			tasks: state.tasks.filter((t) => t.id !== taskId),
			total: state.total - 1,
			selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask
		}));
	},

	clearTasks() {
		taskState.set(initialState);
	}
};

// Combined task store for backwards compatibility
export const taskStore = {
	// Store subscription
	subscribe: taskState.subscribe,

	// Actions
	...taskActions
};
