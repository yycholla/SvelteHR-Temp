// TaskCard Storybook Stories
// Feature: 019-we-need-to - Task T022

import type { Meta, StoryObj } from '@storybook/svelte';
import TaskCard from './TaskCard.svelte';
import type { Task } from '$lib/graphql/types';

// Mock task data
const baseTask: Task = {
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
		email: 'sarah.manager@company.com',
		jobTitle: 'Engineering Manager'
	},
	departmentId: 'dept-1',
	department: {
		id: 'dept-1',
		name: 'Engineering'
	},
	title: 'Implement user authentication',
	description:
		'Add JWT-based authentication system with login, logout, and session management. Include password reset functionality and email verification.',
	priority: 'high',
	status: 'in_progress',
	dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
	createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
	updatedAt: new Date().toISOString(),
	completedAt: undefined
};

const meta = {
	title: 'Tasks/TaskCard',
	component: TaskCard,
	tags: ['autodocs'],
	argTypes: {
		task: {
			control: 'object',
			description: 'Task object with all task details'
		},
		compact: {
			control: 'boolean',
			description: 'Compact view with minimal details'
		},
		showAssignee: {
			control: 'boolean',
			description: 'Show assignee information'
		},
		showDescription: {
			control: 'boolean',
			description: 'Show task description'
		},
		onClick: {
			action: 'clicked',
			description: 'Click handler for the card'
		},
		onStatusChange: {
			action: 'status-changed',
			description: 'Handler for status changes'
		}
	}
} satisfies Meta<TaskCard>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default task card
export const Default: Story = {
	args: {
		task: baseTask,
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Todo status
export const Todo: Story = {
	args: {
		task: {
			...baseTask,
			status: 'todo',
			title: 'Review pull request #123'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// In progress status
export const InProgress: Story = {
	args: {
		task: baseTask,
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Completed status
export const Completed: Story = {
	args: {
		task: {
			...baseTask,
			status: 'completed',
			completedAt: new Date().toISOString(),
			title: 'Update dependencies'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Cancelled status
export const Cancelled: Story = {
	args: {
		task: {
			...baseTask,
			status: 'cancelled',
			title: 'Migrate to new API (cancelled)'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Urgent priority
export const Urgent: Story = {
	args: {
		task: {
			...baseTask,
			priority: 'urgent',
			title: 'Fix production bug - users cannot login',
			dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours from now
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// High priority
export const High: Story = {
	args: {
		task: {
			...baseTask,
			priority: 'high'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Medium priority
export const Medium: Story = {
	args: {
		task: {
			...baseTask,
			priority: 'medium',
			title: 'Refactor database queries'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Low priority
export const Low: Story = {
	args: {
		task: {
			...baseTask,
			priority: 'low',
			title: 'Update README documentation'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Overdue task
export const Overdue: Story = {
	args: {
		task: {
			...baseTask,
			title: 'Submit quarterly report',
			dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
			priority: 'urgent'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Due soon
export const DueSoon: Story = {
	args: {
		task: {
			...baseTask,
			title: 'Prepare for client meeting',
			dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
			priority: 'high'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Department task
export const DepartmentTask: Story = {
	args: {
		task: {
			...baseTask,
			assigneeId: undefined,
			assignee: undefined,
			assignedToDepartmentId: 'dept-1',
			assignedToDepartment: {
				id: 'dept-1',
				name: 'Engineering'
			},
			title: 'Department-wide code review',
			description: 'All team members should review and update coding standards documentation.'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// No due date
export const NoDueDate: Story = {
	args: {
		task: {
			...baseTask,
			title: 'Research new technologies',
			dueDate: undefined,
			priority: 'low'
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// No description
export const NoDescription: Story = {
	args: {
		task: {
			...baseTask,
			title: 'Quick bug fix',
			description: undefined
		},
		compact: false,
		showAssignee: true,
		showDescription: true
	}
};

// Compact view
export const Compact: Story = {
	args: {
		task: baseTask,
		compact: true,
		showAssignee: true,
		showDescription: true
	}
};

// Without assignee
export const WithoutAssignee: Story = {
	args: {
		task: baseTask,
		compact: false,
		showAssignee: false,
		showDescription: true
	}
};

// Without description
export const WithoutDescription: Story = {
	args: {
		task: baseTask,
		compact: false,
		showAssignee: true,
		showDescription: false
	}
};

// Interactive with status change
export const Interactive: Story = {
	args: {
		task: baseTask,
		compact: false,
		showAssignee: true,
		showDescription: true,
		onClick: () => alert('Task card clicked!'),
		onStatusChange: (newStatus) => {
			alert(`Status changed to: ${newStatus}`);
		}
	}
};

// Multiple tasks comparison
export const TasksComparison: Story = {
	render: () => ({
		Component: TaskCard,
		props: {}
	}),
	decorators: [
		() => ({
			template: `
				<div class="space-y-4">
					<TaskCard
						task={{
							...baseTask,
							status: 'todo',
							priority: 'urgent',
							title: 'Fix critical production bug'
						}}
					/>
					<TaskCard
						task={{
							...baseTask,
							status: 'in_progress',
							priority: 'high',
							title: 'Implement new feature'
						}}
					/>
					<TaskCard
						task={{
							...baseTask,
							status: 'completed',
							priority: 'medium',
							title: 'Update documentation',
							completedAt: new Date().toISOString()
						}}
					/>
				</div>
			`
		})
	]
};
