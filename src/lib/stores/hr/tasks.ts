// Modernized to use Svelte 5 runes instead of Svelte 4 writable stores

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

// Svelte 5 runes-based task store
let taskState = $state<TaskState>(initialState);

// Derived computed properties
export const tasks = $derived(taskState.tasks);
export const selectedTask = $derived(taskState.selectedTask);
export const filters = $derived(taskState.filters);
export const isLoading = $derived(taskState.loading);
export const total = $derived(taskState.total);

// Computed derived values
export const filteredTasks = $derived(() => {
	let filtered = taskState.tasks;
	
	if (taskState.filters.search) {
		const search = taskState.filters.search.toLowerCase();
		filtered = filtered.filter(task => 
			task.title.toLowerCase().includes(search) ||
			task.description.toLowerCase().includes(search)
		);
	}
	
	if (taskState.filters.status) {
		filtered = filtered.filter(task => task.status === taskState.filters.status);
	}
	
	if (taskState.filters.priority) {
		filtered = filtered.filter(task => task.priority === taskState.filters.priority);
	}
	
	if (taskState.filters.assigned_to) {
		filtered = filtered.filter(task => task.assigned_to === taskState.filters.assigned_to);
	}
	
	if (taskState.filters.category) {
		filtered = filtered.filter(task => task.category === taskState.filters.category);
	}
	
	return filtered;
});

export const pendingTasks = $derived(
	taskState.tasks.filter(task => task.status === 'pending')
);

export const completedTasks = $derived(
	taskState.tasks.filter(task => task.status === 'completed')
);

export const urgentTasks = $derived(
	taskState.tasks.filter(task => task.priority === 'urgent')
);

export const hasTasks = $derived(taskState.tasks.length > 0);

// Store actions
export const taskActions = {
	setTasks(tasks: Task[], total: number) {
		taskState.tasks = tasks;
		taskState.total = total;
		taskState.loading = false;
	},

	setSelectedTask(task: Task | null) {
		taskState.selectedTask = task;
	},

	updateFilters(newFilters: Partial<TaskFilters>) {
		taskState.filters = { ...taskState.filters, ...newFilters };
	},

	setLoading(loading: boolean) {
		taskState.loading = loading;
	},

	addTask(task: Task) {
		taskState.tasks = [...taskState.tasks, task];
		taskState.total = taskState.total + 1;
	},

	updateTask(task: Task) {
		const index = taskState.tasks.findIndex(t => t.id === task.id);
		if (index !== -1) {
			taskState.tasks[index] = task;
		}
		
		// Update selected task if it matches
		if (taskState.selectedTask?.id === task.id) {
			taskState.selectedTask = task;
		}
	},

	removeTask(taskId: string) {
		taskState.tasks = taskState.tasks.filter(t => t.id !== taskId);
		taskState.total = taskState.total - 1;
		
		// Clear selected task if it was deleted
		if (taskState.selectedTask?.id === taskId) {
			taskState.selectedTask = null;
		}
	},

	clearTasks() {
		Object.assign(taskState, initialState);
	},

	// Utility methods
	getTaskById(id: string): Task | undefined {
		return taskState.tasks.find(t => t.id === id);
	},

	getTasksByStatus(status: Task['status']): Task[] {
		return taskState.tasks.filter(t => t.status === status);
	},

	getTasksByPriority(priority: Task['priority']): Task[] {
		return taskState.tasks.filter(t => t.priority === priority);
	}
};