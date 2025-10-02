/**
 * RollbackButton Component Storybook Stories
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T021
 * Created: 2025-10-02
 *
 * Storybook stories for RollbackButton component visualization.
 * Component implementation pending (T037).
 */

import type { Meta, StoryObj } from '@storybook/svelte';
// @ts-expect-error - Component not yet implemented (T037 pending)
import RollbackButton from './RollbackButton.svelte';

const meta = {
	title: 'Activities/RollbackButton',
	component: RollbackButton,
	tags: ['autodocs'],
	argTypes: {
		logId: {
			control: 'text',
			description: 'Activity log ID to rollback'
		},
		userRole: {
			control: 'select',
			options: ['super_admin', 'hr_admin', 'admin', 'manager', 'employee'],
			description: 'Current user role (only super_admin can see button)'
		},
		action: {
			control: 'select',
			options: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
			description: 'Action type of the log entry'
		},
		isRollback: {
			control: 'boolean',
			description: 'Whether this is already a rollback entry'
		}
	}
} satisfies Meta<typeof RollbackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Super admin viewing a CREATE operation - button should be enabled
 */
export const SuperAdminCreate: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174000',
		userRole: 'super_admin',
		action: 'CREATE',
		isRollback: false
	}
};

/**
 * Super admin viewing an UPDATE operation - button should be enabled
 */
export const SuperAdminUpdate: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174001',
		userRole: 'super_admin',
		action: 'UPDATE',
		isRollback: false
	}
};

/**
 * Super admin viewing a DELETE operation - button should be enabled
 */
export const SuperAdminDelete: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174002',
		userRole: 'super_admin',
		action: 'DELETE',
		isRollback: false
	}
};

/**
 * Super admin viewing a READ operation - button should be disabled
 * (cannot rollback read operations)
 */
export const DisabledReadOperation: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174003',
		userRole: 'super_admin',
		action: 'READ',
		isRollback: false
	}
};

/**
 * Super admin viewing a rollback entry - button should be disabled
 * (cannot rollback a rollback)
 */
export const DisabledRollbackEntry: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174004',
		userRole: 'super_admin',
		action: 'UPDATE',
		isRollback: true
	}
};

/**
 * Admin user viewing a CREATE operation - button should NOT be visible
 * (only super_admin can see rollback button)
 */
export const AdminNotVisible: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174005',
		userRole: 'admin',
		action: 'CREATE',
		isRollback: false
	}
};

/**
 * HR Admin viewing an UPDATE operation - button should NOT be visible
 */
export const HRAdminNotVisible: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174006',
		userRole: 'hr_admin',
		action: 'UPDATE',
		isRollback: false
	}
};

/**
 * Manager viewing a DELETE operation - button should NOT be visible
 */
export const ManagerNotVisible: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174007',
		userRole: 'manager',
		action: 'DELETE',
		isRollback: false
	}
};

/**
 * Employee viewing any operation - button should NOT be visible
 */
export const EmployeeNotVisible: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174008',
		userRole: 'employee',
		action: 'CREATE',
		isRollback: false
	}
};

/**
 * Loading state during rollback execution
 */
export const LoadingState: Story = {
	args: {
		logId: '123e4567-e89b-12d3-a456-426614174009',
		userRole: 'super_admin',
		action: 'UPDATE',
		isRollback: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Shows the button in a loading state when rollback is in progress'
			}
		}
	}
};
