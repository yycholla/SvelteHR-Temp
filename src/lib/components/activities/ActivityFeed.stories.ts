// ActivityFeed Storybook Stories
// Feature: 019-we-need-to - Task T024

import type { Meta, StoryObj } from '@storybook/svelte';
import ActivityFeed from './ActivityFeed.svelte';
import type { ActivityLog } from '$lib/graphql/types';

// Mock activity data
const mockActivities: ActivityLog[] = [
	{
		id: '1',
		employeeId: 'emp-1',
		employee: {
			id: 'emp-1',
			displayName: 'John Doe',
			email: 'john.doe@company.com',
			departmentId: 'dept-1',
			department: {
				id: 'dept-1',
				name: 'Engineering'
			}
		},
		action: 'create',
		resourceType: 'task',
		resourceId: 'task-1',
		details: { title: 'Implement user authentication' },
		ipAddress: '192.168.1.100',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
	},
	{
		id: '2',
		employeeId: 'emp-2',
		employee: {
			id: 'emp-2',
			displayName: 'Jane Smith',
			email: 'jane.smith@company.com',
			departmentId: 'dept-2',
			department: {
				id: 'dept-2',
				name: 'HR'
			}
		},
		action: 'update',
		resourceType: 'employee',
		resourceId: 'emp-5',
		details: { displayName: 'Mike Wilson' },
		ipAddress: '192.168.1.101',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() // 4 hours ago
	},
	{
		id: '3',
		employeeId: 'emp-1',
		employee: {
			id: 'emp-1',
			displayName: 'John Doe',
			email: 'john.doe@company.com',
			departmentId: 'dept-1',
			department: {
				id: 'dept-1',
				name: 'Engineering'
			}
		},
		action: 'create',
		resourceType: 'event',
		resourceId: 'event-1',
		details: { title: 'Q4 Planning Meeting' },
		ipAddress: '192.168.1.100',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() // 6 hours ago
	},
	{
		id: '4',
		employeeId: 'emp-3',
		employee: {
			id: 'emp-3',
			displayName: 'Alice Johnson',
			email: 'alice.johnson@company.com',
			departmentId: 'dept-1',
			department: {
				id: 'dept-1',
				name: 'Engineering'
			}
		},
		action: 'delete',
		resourceType: 'document',
		resourceId: 'doc-5',
		details: { title: 'Old project proposal' },
		ipAddress: '192.168.1.102',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
	},
	{
		id: '5',
		employeeId: 'emp-2',
		employee: {
			id: 'emp-2',
			displayName: 'Jane Smith',
			email: 'jane.smith@company.com',
			departmentId: 'dept-2',
			department: {
				id: 'dept-2',
				name: 'HR'
			}
		},
		action: 'login',
		resourceType: 'system',
		resourceId: null,
		details: null,
		ipAddress: '192.168.1.101',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000).toISOString()
	},
	{
		id: '6',
		employeeId: 'emp-4',
		employee: {
			id: 'emp-4',
			displayName: 'Bob Brown',
			email: 'bob.brown@company.com',
			departmentId: 'dept-3',
			department: {
				id: 'dept-3',
				name: 'Sales'
			}
		},
		action: 'update',
		resourceType: 'leave_request',
		resourceId: 'leave-1',
		details: { status: 'approved' },
		ipAddress: '192.168.1.103',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
	},
	{
		id: '7',
		employeeId: 'emp-1',
		employee: {
			id: 'emp-1',
			displayName: 'John Doe',
			email: 'john.doe@company.com',
			departmentId: 'dept-1',
			department: {
				id: 'dept-1',
				name: 'Engineering'
			}
		},
		action: 'create',
		resourceType: 'performance_review',
		resourceId: 'review-1',
		details: { title: 'Q3 Performance Review' },
		ipAddress: '192.168.1.100',
		userAgent: 'Mozilla/5.0',
		createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week ago
	}
];

const meta = {
	title: 'Activities/ActivityFeed',
	component: ActivityFeed,
	tags: ['autodocs'],
	argTypes: {
		activities: {
			control: 'object',
			description: 'Array of activity log objects'
		},
		groupByDate: {
			control: 'boolean',
			description: 'Group activities by date'
		},
		showUserInfo: {
			control: 'boolean',
			description: 'Show user information in activities'
		},
		showTimestamps: {
			control: 'boolean',
			description: 'Show activity timestamps'
		},
		compact: {
			control: 'boolean',
			description: 'Compact view with reduced spacing'
		},
		maxItems: {
			control: 'number',
			description: 'Maximum number of items to display'
		},
		emptyMessage: {
			control: 'text',
			description: 'Message shown when no activities'
		},
		onActivityClick: {
			action: 'activity-clicked',
			description: 'Handler when activity is clicked'
		}
	}
} satisfies Meta<ActivityFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

// Default activity feed
export const Default: Story = {
	args: {
		activities: mockActivities,
		groupByDate: true,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No activity recorded yet'
	}
};

// Grouped by date
export const GroupedByDate: Story = {
	args: {
		activities: mockActivities,
		groupByDate: true,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No activity recorded yet'
	}
};

// Flat list (no grouping)
export const FlatList: Story = {
	args: {
		activities: mockActivities,
		groupByDate: false,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No activity recorded yet'
	}
};

// Without user info
export const WithoutUserInfo: Story = {
	args: {
		activities: mockActivities,
		groupByDate: true,
		showUserInfo: false,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No activity recorded yet'
	}
};

// Without timestamps
export const WithoutTimestamps: Story = {
	args: {
		activities: mockActivities,
		groupByDate: true,
		showUserInfo: true,
		showTimestamps: false,
		compact: false,
		emptyMessage: 'No activity recorded yet'
	}
};

// Compact view
export const Compact: Story = {
	args: {
		activities: mockActivities,
		groupByDate: true,
		showUserInfo: true,
		showTimestamps: true,
		compact: true,
		emptyMessage: 'No activity recorded yet'
	}
};

// Limited items
export const LimitedItems: Story = {
	args: {
		activities: mockActivities,
		groupByDate: false,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		maxItems: 3,
		emptyMessage: 'No activity recorded yet'
	}
};

// Empty state
export const Empty: Story = {
	args: {
		activities: [],
		groupByDate: true,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No recent activity to display'
	}
};

// Recent activities only
export const RecentOnly: Story = {
	args: {
		activities: mockActivities.slice(0, 3),
		groupByDate: false,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No activity recorded yet'
	}
};

// Create actions only
export const CreateActionsOnly: Story = {
	args: {
		activities: mockActivities.filter((a) => a.action === 'create'),
		groupByDate: false,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No create actions recorded'
	}
};

// Engineering department only
export const EngineeringOnly: Story = {
	args: {
		activities: mockActivities.filter(
			(a) => a.employee?.department?.name === 'Engineering'
		),
		groupByDate: true,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No engineering activities recorded'
	}
};

// Interactive
export const Interactive: Story = {
	args: {
		activities: mockActivities,
		groupByDate: true,
		showUserInfo: true,
		showTimestamps: true,
		compact: false,
		emptyMessage: 'No activity recorded yet',
		onActivityClick: (activity) => alert(`Clicked: ${activity.action} ${activity.resourceType}`)
	}
};
