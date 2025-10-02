/**
 * BulkRollbackDialog Component Storybook Stories
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T023
 * Created: 2025-10-02
 *
 * Storybook stories for BulkRollbackDialog component visualization.
 * Component implementation pending (T039).
 */

import type { Meta, StoryObj } from '@storybook/svelte';
// @ts-expect-error - Component not yet implemented (T039 pending)
import BulkRollbackDialog from './BulkRollbackDialog.svelte';

const meta = {
	title: 'Activities/BulkRollbackDialog',
	component: BulkRollbackDialog,
	tags: ['autodocs'],
	argTypes: {
		isOpen: {
			control: 'boolean',
			description: 'Whether the dialog is open'
		},
		userRole: {
			control: 'select',
			options: ['super_admin', 'hr_admin', 'admin'],
			description: 'Current user role'
		}
	}
} satisfies Meta<typeof BulkRollbackDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockLogs = [
	{
		id: 'log-001',
		action: 'DELETE' as const,
		resourceType: 'employees',
		resourceId: 'emp-123',
		employeeName: 'John Doe',
		createdAt: new Date('2024-10-02T10:30:00Z').toISOString()
	},
	{
		id: 'log-002',
		action: 'UPDATE' as const,
		resourceType: 'employees',
		resourceId: 'emp-456',
		employeeName: 'Jane Smith',
		createdAt: new Date('2024-10-02T11:00:00Z').toISOString()
	},
	{
		id: 'log-003',
		action: 'DELETE' as const,
		resourceType: 'employees',
		resourceId: 'emp-789',
		employeeName: 'Bob Johnson',
		createdAt: new Date('2024-10-02T11:15:00Z').toISOString()
	},
	{
		id: 'log-004',
		action: 'CREATE' as const,
		resourceType: 'employees',
		resourceId: 'emp-101',
		employeeName: 'Alice Williams',
		createdAt: new Date('2024-10-02T11:30:00Z').toISOString()
	},
	{
		id: 'log-005',
		action: 'UPDATE' as const,
		resourceType: 'employees',
		resourceId: 'emp-202',
		employeeName: 'Charlie Brown',
		createdAt: new Date('2024-10-02T11:45:00Z').toISOString()
	}
];

const largeMockLogs = Array.from({ length: 150 }, (_, i) => ({
	id: `log-${String(i + 1).padStart(3, '0')}`,
	action: (['CREATE', 'UPDATE', 'DELETE'] as const)[i % 3],
	resourceType: 'employees',
	resourceId: `emp-${i + 1}`,
	employeeName: `Employee ${i + 1}`,
	createdAt: new Date(Date.now() - i * 60000).toISOString()
}));

/**
 * Initial state - dialog open with log selection
 */
export const InitialSelection: Story = {
	args: {
		logs: mockLogs,
		isOpen: true,
		userRole: 'super_admin',
		onClose: () => console.log('Dialog closed'),
		onComplete: (batchId) => console.log('Batch completed:', batchId)
	}
};

/**
 * Dialog closed state
 */
export const Closed: Story = {
	args: {
		logs: mockLogs,
		isOpen: false,
		userRole: 'super_admin'
	}
};

/**
 * Large list of logs (150 items, max 100 can be selected)
 */
export const LargeLogList: Story = {
	args: {
		logs: largeMockLogs,
		isOpen: true,
		userRole: 'super_admin'
	}
};

/**
 * Single log selection
 */
export const SingleLog: Story = {
	args: {
		logs: [mockLogs[0]],
		isOpen: true,
		userRole: 'super_admin'
	}
};

/**
 * Empty log list
 */
export const EmptyList: Story = {
	args: {
		logs: [],
		isOpen: true,
		userRole: 'super_admin'
	}
};

/**
 * In progress state with SSE updates (simulated)
 */
export const InProgress: Story = {
	args: {
		logs: mockLogs,
		isOpen: true,
		userRole: 'super_admin'
	},
	parameters: {
		docs: {
			description: {
				story:
					'Shows the dialog in progress state with real-time updates from SSE. Progress bar, counts, and current log ID are displayed.'
			}
		}
	}
};

/**
 * Completed state with summary
 */
export const Completed: Story = {
	args: {
		logs: mockLogs,
		isOpen: true,
		userRole: 'super_admin'
	},
	parameters: {
		docs: {
			description: {
				story:
					'Shows the dialog after successful completion with final statistics: 5 processed, 5 successful, 0 failed.'
			}
		}
	}
};

/**
 * Partial success state (some failures)
 */
export const PartialSuccess: Story = {
	args: {
		logs: mockLogs,
		isOpen: true,
		userRole: 'super_admin'
	},
	parameters: {
		docs: {
			description: {
				story:
					'Shows the dialog after completion with some failures: 5 processed, 3 successful, 2 failed with error details.'
			}
		}
	}
};

/**
 * Failed state with error message
 */
export const Failed: Story = {
	args: {
		logs: mockLogs,
		isOpen: true,
		userRole: 'super_admin'
	},
	parameters: {
		docs: {
			description: {
				story:
					'Shows the dialog after critical failure with error message and retry option.'
			}
		}
	}
};

/**
 * HR Admin view (super_admin only feature)
 */
export const HRAdminView: Story = {
	args: {
		logs: mockLogs,
		isOpen: true,
		userRole: 'hr_admin'
	},
	parameters: {
		docs: {
			description: {
				story:
					'HR admins should not be able to access bulk rollback dialog (super_admin only feature).'
			}
		}
	}
};

/**
 * Admin view (super_admin only feature)
 */
export const AdminView: Story = {
	args: {
		logs: mockLogs,
		isOpen: true,
		userRole: 'admin'
	},
	parameters: {
		docs: {
			description: {
				story:
					'Admins should not be able to access bulk rollback dialog (super_admin only feature).'
			}
		}
	}
};

/**
 * All logs mixed types
 */
export const MixedActionTypes: Story = {
	args: {
		logs: [
			...mockLogs,
			{
				id: 'log-006',
				action: 'CREATE' as const,
				resourceType: 'departments',
				resourceId: 'dept-001',
				employeeName: 'System Admin',
				createdAt: new Date('2024-10-02T12:00:00Z').toISOString()
			},
			{
				id: 'log-007',
				action: 'UPDATE' as const,
				resourceType: 'tasks',
				resourceId: 'task-001',
				employeeName: 'Project Manager',
				createdAt: new Date('2024-10-02T12:15:00Z').toISOString()
			},
			{
				id: 'log-008',
				action: 'DELETE' as const,
				resourceType: 'events',
				resourceId: 'evt-001',
				employeeName: 'HR Manager',
				createdAt: new Date('2024-10-02T12:30:00Z').toISOString()
			}
		],
		isOpen: true,
		userRole: 'super_admin'
	}
};
