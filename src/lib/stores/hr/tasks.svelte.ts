// Migrated to Svelte 5 runes for better performance and reactivity

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
		filtered = filtered.filter(
			(task) =>
				task.title.toLowerCase().includes(search) || task.description.toLowerCase().includes(search)
		);
	}

	if (taskState.filters.status) {
		filtered = filtered.filter((task) => task.status === taskState.filters.status);
	}

	if (taskState.filters.priority) {
		filtered = filtered.filter((task) => task.priority === taskState.filters.priority);
	}

	if (taskState.filters.assigned_to) {
		filtered = filtered.filter((task) => task.assigned_to === taskState.filters.assigned_to);
	}

	if (taskState.filters.category) {
		filtered = filtered.filter((task) => task.category === taskState.filters.category);
	}

	return filtered;
});

export const pendingTasks = $derived(
	taskState.tasks.filter((task) => task.status === 'pending')
);

export const completedTasks = $derived(
	taskState.tasks.filter((task) => task.status === 'completed')
);

export const urgentTasks = $derived(
	taskState.tasks.filter((task) => task.priority === 'urgent')
);

export const hasTasks = $derived(taskState.tasks.length > 0);

// Additional computed values for better UX
export const taskCount = $derived(taskState.tasks.length);
export const pendingTaskCount = $derived(pendingTasks.length);
export const completedTaskCount = $derived(completedTasks.length);
export const urgentTaskCount = $derived(urgentTasks.length);
export const selectedTaskTitle = $derived(() => {
	const task = taskState.selectedTask;
	return task ? task.title : '';
});

// Pagination derived values
export const currentPage = $derived(taskState.filters.page);
export const pageSize = $derived(taskState.filters.limit);
export const totalPages = $derived(Math.ceil(taskState.total / taskState.filters.limit));
export const hasNextPage = $derived(taskState.filters.page < totalPages);
export const hasPrevPage = $derived(taskState.filters.page > 1);

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
		const index = taskState.tasks.findIndex((t) => t.id === task.id);
		if (index !== -1) {
			// Create new array with updated task
			const updatedTasks = [...taskState.tasks];
			updatedTasks[index] = task;
			taskState.tasks = updatedTasks;

			// Update selected task if it matches
			if (taskState.selectedTask?.id === task.id) {
				taskState.selectedTask = task;
			}
		}
	},

	removeTask(taskId: string) {
		taskState.tasks = taskState.tasks.filter((t) => t.id !== taskId);
		taskState.total = taskState.total - 1;

		// Clear selected task if it was the one removed
		if (taskState.selectedTask?.id === taskId) {
			taskState.selectedTask = null;
		}
	},

	clearTasks() {
		// Reset to initial state
		Object.assign(taskState, initialState);
	},

	// Additional utility actions for better UX
	selectTaskById(taskId: string) {
		const task = taskState.tasks.find((t) => t.id === taskId);
		taskState.selectedTask = task || null;
	},

	clearSelection() {
		taskState.selectedTask = null;
	},

	clearFilters() {
		taskState.filters = { ...initialState.filters };
	},

	// Pagination actions
	nextPage() {
		if (hasNextPage) {
			taskState.filters = { 
				...taskState.filters, 
				page: taskState.filters.page + 1 
			};
		}
	},

	prevPage() {
		if (hasPrevPage) {
			taskState.filters = { 
				...taskState.filters, 
				page: taskState.filters.page - 1 
			};
		}
	},

	goToPage(page: number) {
		if (page >= 1 && page <= totalPages) {
			taskState.filters = { ...taskState.filters, page };
		}
	},

	setPageSize(limit: number) {
		taskState.filters = { ...taskState.filters, limit, page: 1 };
	},

	// Search action
	setSearch(search: string) {
		taskState.filters = { ...taskState.filters, search, page: 1 };
	},

	// Filter actions
	setStatusFilter(status: string) {
		taskState.filters = { ...taskState.filters, status, page: 1 };
	},

	setPriorityFilter(priority: string) {
		taskState.filters = { ...taskState.filters, priority, page: 1 };
	},

	setAssigneeFilter(assigned_to: string) {
		taskState.filters = { ...taskState.filters, assigned_to, page: 1 };
	},

	setCategoryFilter(category: string) {
		taskState.filters = { ...taskState.filters, category, page: 1 };
	},

	// Bulk operations
	bulkUpdateStatus(taskIds: string[], status: Task['status']) {
		taskState.tasks = taskState.tasks.map((task) =>
			taskIds.includes(task.id) ? { ...task, status, updated_at: new Date().toISOString() } : task
		);
	},

	bulkRemoveTasks(taskIds: string[]) {
		taskState.tasks = taskState.tasks.filter(
			(task) => !taskIds.includes(task.id)
		);
		taskState.total = taskState.total - taskIds.length;

		// Clear selection if selected task was removed
		if (taskState.selectedTask && taskIds.includes(taskState.selectedTask.id)) {
			taskState.selectedTask = null;
		}
	}
};

// Combined task store for backwards compatibility and convenience
export const taskStore = {
	// Provide reactive access to state
	get state() {
		return {
			tasks: tasks,
			selectedTask: selectedTask,
			filters: filters,
			loading: isLoading,
			total: total
		};
	},

	// Actions
	...taskActions
};