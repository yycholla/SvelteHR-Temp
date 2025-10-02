// TaskList Storybook Stories
// Feature: 019-we-need-to - Task T023

import type { Meta, StoryObj } from '@storybook/svelte';
import TaskList from './TaskList.svelte';
import type { Task } from '$lib/graphql/types';

// Mock tasks data
const mockTasks: Task[] = [
	{
		id: '1',
		assigneeId: 'emp-1',
		assignee: {
			id: 'emp-1',
			displayName: 'John Doe',
			email: 'john.doe@company.com',
			jobTitle: 'Software Engineer'
		},
		assignerId: 'mgr-1',
		assigner: {
			id: 'mgr-1',
			displayName: 'Sarah Manager',
			email: 'sarah.manager@company.com'
		},
		departmentId: 'dept-1',
		department: { id: 'dept-1', name: 'Engineering' },
		title: 'Fix critical production bug',
		description: 'Users cannot login to the application',
		priority: 'urgent',
		status: 'in_progress',
		dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
		createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString()
	},
	{
		id: '2',
		assigneeId: 'emp-2',
		assignee: {
			id: 'emp-2',
			displayName: 'Jane Smith',
			email: 'jane.smith@company.com',
			jobTitle: 'Senior Developer'
		},
		assignerId: 'mgr-1',
		assigner: {
			id: 'mgr-1',
			displayName: 'Sarah Manager',
			email: 'sarah.manager@company.com'
		},
		departmentId: 'dept-1',
		department: { id: 'dept-1', name: 'Engineering' },
		title: 'Implement user authentication',
		description: 'Add JWT-based authentication with session management',
		priority: 'high',
		status: 'in_progress',
		dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
		createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString()
	},
	{
		id: '3',
		assigneeId: 'emp-3',
		assignee: {
			id: 'emp-3',
			displayName: 'Mike Wilson',
			email: 'mike.wilson@company.com',
			jobTitle: 'DevOps Engineer'
		},
		assignerId: 'mgr-1',
		assigner: {
			id: 'mgr-1',
			displayName: 'Sarah Manager',
			email: 'sarah.manager@company.com'
		},
		departmentId: 'dept-1',
		department: { id: 'dept-1', name: 'Engineering' },
		title: 'Set up CI/CD pipeline',
		description: 'Configure GitHub Actions for automated testing and deployment',
		priority: 'medium',
		status: 'todo',
		dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
		createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString()
	},
	{
		id: '4',
		assigneeId: 'emp-1',
		assignee: {
			id: 'emp-1',
			displayName: 'John Doe',
			email: 'john.doe@company.com',
			jobTitle: 'Software Engineer'
		},
		assignerId: 'mgr-1',
		assigner: {
			id: 'mgr-1',
			displayName: 'Sarah Manager',
			email: 'sarah.manager@company.com'
		},
		departmentId: 'dept-1',
		department: { id: 'dept-1', name: 'Engineering' },
		title: 'Update dependencies',
		description: 'Update all npm packages to latest versions',
		priority: 'low',
		status: 'completed',
		dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
		completedAt: new Date().toISOString(),
		createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString()
	},
	{
		id: '5',
		assignedToDepartmentId: 'dept-1',
		assignedToDepartment: { id: 'dept-1', name: 'Engineering' },
		assignerId: 'mgr-1',
		assigner: {
			id: 'mgr-1',
			displayName: 'Sarah Manager',
			email: 'sarah.manager@company.com'
		},
		departmentId: 'dept-1',
		department: { id: 'dept-1', name: 'Engineering' },
		title: 'Code review for PR #234',
		description: 'Department-wide code review required',
		priority: 'high',
		status: 'todo',
		dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
		createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString()
	},
	{
		id: '6',
		assigneeId: 'emp-2',
		assignee: {
			id: 'emp-2',
			displayName: 'Jane Smith',
			email: 'jane.smith@company.com',
			jobTitle: 'Senior Developer'
		},
		assignerId: 'mgr-1',
		assigner: {
			id: 'mgr-1',
			displayName: 'Sarah Manager',
			email: 'sarah.manager@company.com'
		},
		departmentId: 'dept-1',
		department: { id: 'dept-1', name: 'Engineering' },
		title: 'Quarterly report (overdue)',
		description: 'Submit Q3 engineering metrics report',
		priority: 'urgent',
		status: 'todo',
		dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
		createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
		updatedAt: new Date().toISOString()
	}
];

const meta = {
	title: 'Tasks/TaskList',
	component: TaskList,
	tags: ['autodocs'],
	argTypes: {
		tasks: {
			control: 'object',
			description: 'Array of task objects'
		},
		sortBy: {
			control: 'select',
			options: ['priority', 'dueDate', 'created', 'status'],
			description: 'Sort tasks by field'
		},
		filterStatus: {
			control: 'select',
			options: ['all', 'todo', 'in_progress', 'completed', 'cancelled'],
			description: 'Filter by status'
		},
		filterPriority: {
			control: 'select',
			options: ['all', 'urgent', 'high', 'medium', 'low'],
			description: 'Filter by priority'
		},
		compact: {
			control: 'boolean',
			description: 'Compact view'
		},
		showStatistics: {
			control: 'boolean',
			description: 'Show statistics bar'
		},
		emptyMessage: {
			control: 'text',
			description: 'Message shown when list is empty'
		},
		onTaskClick: {
			action: 'task-clicked',
			description: 'Handler when task is clicked'
		},
		onStatusChange: {
			action: 'status-changed',
			description: 'Handler when task status changes'
		}
	}
} satisfies Meta<TaskList>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default task list
export const Default: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: false,
		showStatistics: false,
		emptyMessage: 'No tasks found'
	}
};

// With statistics
export const WithStatistics: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Sort by priority
export const SortByPriority: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Sort by due date
export const SortByDueDate: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'dueDate',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Sort by status
export const SortByStatus: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'status',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Filter by todo status
export const FilterTodo: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'todo',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Filter by in progress status
export const FilterInProgress: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'in_progress',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Filter by completed status
export const FilterCompleted: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'completed',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Filter by urgent priority
export const FilterUrgent: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'urgent',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Filter by high priority
export const FilterHigh: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'high',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found'
	}
};

// Compact view
export const Compact: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: true,
		showStatistics: false,
		emptyMessage: 'No tasks found'
	}
};

// Empty list
export const Empty: Story = {
	args: {
		tasks: [],
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: false,
		showStatistics: false,
		emptyMessage: 'No tasks assigned to you yet'
	}
};

// Interactive
export const Interactive: Story = {
	args: {
		tasks: mockTasks,
		sortBy: 'priority',
		filterStatus: 'all',
		filterPriority: 'all',
		compact: false,
		showStatistics: true,
		emptyMessage: 'No tasks found',
		onTaskClick: (task) => alert(`Clicked: ${task.title}`),
		onStatusChange: (taskId, newStatus) => alert(`Task ${taskId} status changed to ${newStatus}`)
	}
};
