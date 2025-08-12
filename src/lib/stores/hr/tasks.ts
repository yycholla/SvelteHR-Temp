import { writable } from 'svelte/store';

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

function createTaskStore() {
	const { subscribe, set, update } = writable<{
		tasks: Task[];
		selectedTask: Task | null;
		filters: TaskFilters;
		loading: boolean;
		total: number;
	}>({
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
	});

	return {
		subscribe,
		setTasks: (tasks: Task[], total: number) => {
			update(state => ({ ...state, tasks, total, loading: false }));
		},
		setSelectedTask: (task: Task | null) => {
			update(state => ({ ...state, selectedTask: task }));
		},
		updateFilters: (newFilters: Partial<TaskFilters>) => {
			update(state => ({
				...state,
				filters: { ...state.filters, ...newFilters }
			}));
		},
		setLoading: (loading: boolean) => {
			update(state => ({ ...state, loading }));
		},
		addTask: (task: Task) => {
			update(state => ({
				...state,
				tasks: [...state.tasks, task],
				total: state.total + 1
			}));
		},
		updateTask: (task: Task) => {
			update(state => ({
				...state,
				tasks: state.tasks.map(t => t.id === task.id ? task : t),
				selectedTask: state.selectedTask?.id === task.id ? task : state.selectedTask
			}));
		},
		removeTask: (taskId: string) => {
			update(state => ({
				...state,
				tasks: state.tasks.filter(t => t.id !== taskId),
				total: state.total - 1,
				selectedTask: state.selectedTask?.id === taskId ? null : state.selectedTask
			}));
		}
	};
}

export const taskStore = createTaskStore();