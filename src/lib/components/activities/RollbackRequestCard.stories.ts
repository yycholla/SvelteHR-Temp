/**
 * RollbackRequestCard Component Storybook Stories
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T022
 * Created: 2025-10-02
 *
 * Storybook stories for RollbackRequestCard component visualization.
 * Component implementation pending (T038).
 */

import type { Meta, StoryObj } from '@storybook/svelte';
// @ts-expect-error - Component not yet implemented (T038 pending)
import RollbackRequestCard from './RollbackRequestCard.svelte';

const meta = {
	title: 'Activities/RollbackRequestCard',
	component: RollbackRequestCard,
	tags: ['autodocs'],
	argTypes: {
		userRole: {
			control: 'select',
			options: ['super_admin', 'hr_admin', 'admin', 'manager', 'employee'],
			description: 'Current user role (only super_admin can approve/reject)'
		}
	}
} satisfies Meta<typeof RollbackRequestCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockRequest = {
	id: '550e8400-e29b-41d4-a716-446655440000',
	activityLogId: '123e4567-e89b-12d3-a456-426614174000',
	requestedBy: {
		id: 'usr-001',
		fullName: 'John Doe',
		email: 'john.doe@company.com',
		department: 'Engineering'
	},
	requestedAt: new Date().toISOString(),
	reason: 'Accidental deletion of critical employee record',
	activityLog: {
		action: 'DELETE' as const,
		resourceType: 'employees',
		resourceId: 'emp-123',
		beforeSnapshot: {
			id: 'emp-123',
			full_name: 'Jane Smith',
			email: 'jane.smith@company.com',
			department_id: 'dept-001',
			salary: 75000,
			hire_date: '2023-01-15'
		},
		afterSnapshot: null
	}
};

/**
 * Pending request viewed by super admin - shows approve/reject buttons
 */
export const PendingSuperAdmin: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending'
		},
		userRole: 'super_admin'
	}
};

/**
 * Pending request viewed by admin - no action buttons shown
 */
export const PendingAdmin: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending'
		},
		userRole: 'admin'
	}
};

/**
 * Approved request with reviewer information
 */
export const Approved: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'approved',
			reviewedBy: {
				id: 'usr-super-001',
				fullName: 'Sarah Admin'
			},
			reviewedAt: new Date().toISOString(),
			reviewReason: 'Valid reason for rollback. Approved.'
		},
		userRole: 'super_admin'
	}
};

/**
 * Rejected request with rejection reason
 */
export const Rejected: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'rejected',
			reviewedBy: {
				id: 'usr-super-001',
				fullName: 'Sarah Admin'
			},
			reviewedAt: new Date().toISOString(),
			reviewReason: 'Insufficient justification. Record was deleted for compliance reasons.'
		},
		userRole: 'super_admin'
	}
};

/**
 * UPDATE operation request
 */
export const UpdateRequest: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending',
			reason: 'Incorrect salary adjustment needs to be reverted',
			activityLog: {
				action: 'UPDATE' as const,
				resourceType: 'employees',
				resourceId: 'emp-456',
				beforeSnapshot: {
					id: 'emp-456',
					full_name: 'Bob Johnson',
					salary: 65000
				},
				afterSnapshot: {
					id: 'emp-456',
					full_name: 'Bob Johnson',
					salary: 85000 // Incorrect salary
				}
			}
		},
		userRole: 'super_admin'
	}
};

/**
 * CREATE operation request
 */
export const CreateRequest: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending',
			reason: 'Duplicate employee record created by mistake',
			activityLog: {
				action: 'CREATE' as const,
				resourceType: 'employees',
				resourceId: 'emp-789',
				beforeSnapshot: null,
				afterSnapshot: {
					id: 'emp-789',
					full_name: 'Alice Williams',
					email: 'alice.williams@company.com',
					department_id: 'dept-002',
					hire_date: '2024-10-01'
				}
			}
		},
		userRole: 'super_admin'
	}
};

/**
 * Request with long reason text
 */
export const LongReason: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending',
			reason:
				'This employee record was deleted during a bulk operation that was supposed to only affect terminated employees. However, due to a filter misconfiguration, several active employees were also deleted. This particular employee, Jane Smith, is a critical team member leading the Q4 project and needs to be restored immediately to prevent disruption to ongoing work. The deletion occurred at 2:30 PM today and we need to restore the record as soon as possible.',
			activityLog: {
				...mockRequest.activityLog,
				action: 'DELETE' as const
			}
		},
		userRole: 'super_admin'
	}
};

/**
 * HR Admin viewing request - no action buttons
 */
export const HRAdminView: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending'
		},
		userRole: 'hr_admin'
	}
};

/**
 * Manager viewing request - no action buttons
 */
export const ManagerView: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending'
		},
		userRole: 'manager'
	}
};

/**
 * Recently submitted request (< 1 hour ago)
 */
export const RecentRequest: Story = {
	args: {
		request: {
			...mockRequest,
			status: 'pending',
			requestedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
		},
		userRole: 'super_admin'
	}
};
