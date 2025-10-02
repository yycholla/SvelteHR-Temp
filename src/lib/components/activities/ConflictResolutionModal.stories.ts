/**
 * ConflictResolutionModal Component Storybook Stories
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T024
 * Created: 2025-10-02
 *
 * Storybook stories for ConflictResolutionModal component visualization.
 * Component implementation pending (T040).
 */

import type { Meta, StoryObj } from '@storybook/svelte';
// @ts-expect-error - Component not yet implemented (T040 pending)
import ConflictResolutionModal from './ConflictResolutionModal.svelte';

const meta = {
	title: 'Activities/ConflictResolutionModal',
	component: ConflictResolutionModal,
	tags: ['autodocs'],
	argTypes: {
		isOpen: {
			control: 'boolean',
			description: 'Whether the modal is open'
		}
	}
} satisfies Meta<typeof ConflictResolutionModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Simple conflict - single field changed
 */
export const SimpleConflict: Story = {
	args: {
		isOpen: true,
		logId: 'log-001',
		conflicts: {
			hasConflicts: true,
			conflictFields: ['salary'],
			conflicts: [
				{
					field: 'salary',
					currentValue: 85000,
					targetValue: 75000,
					snapshotValue: 75000
				}
			],
			currentState: {
				id: 'emp-123',
				full_name: 'John Doe',
				salary: 85000,
				department_id: 'dept-001'
			},
			targetState: {
				id: 'emp-123',
				full_name: 'John Doe',
				salary: 75000,
				department_id: 'dept-001'
			}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};

/**
 * Multiple field conflicts
 */
export const MultipleConflicts: Story = {
	args: {
		isOpen: true,
		logId: 'log-002',
		conflicts: {
			hasConflicts: true,
			conflictFields: ['salary', 'department_id', 'job_title'],
			conflicts: [
				{
					field: 'salary',
					currentValue: 85000,
					targetValue: 75000,
					snapshotValue: 75000
				},
				{
					field: 'department_id',
					currentValue: 'dept-002',
					targetValue: 'dept-001',
					snapshotValue: 'dept-001'
				},
				{
					field: 'job_title',
					currentValue: 'Senior Engineer',
					targetValue: 'Engineer',
					snapshotValue: 'Engineer'
				}
			],
			currentState: {
				id: 'emp-123',
				full_name: 'John Doe',
				salary: 85000,
				department_id: 'dept-002',
				job_title: 'Senior Engineer'
			},
			targetState: {
				id: 'emp-123',
				full_name: 'John Doe',
				salary: 75000,
				department_id: 'dept-001',
				job_title: 'Engineer'
			}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};

/**
 * Nested object conflict
 */
export const NestedObjectConflict: Story = {
	args: {
		isOpen: true,
		logId: 'log-003',
		conflicts: {
			hasConflicts: true,
			conflictFields: ['address.city', 'address.zip_code'],
			conflicts: [
				{
					field: 'address.city',
					currentValue: 'San Francisco',
					targetValue: 'Oakland',
					snapshotValue: 'Oakland'
				},
				{
					field: 'address.zip_code',
					currentValue: '94102',
					targetValue: '94612',
					snapshotValue: '94612'
				}
			],
			currentState: {
				id: 'emp-123',
				full_name: 'John Doe',
				address: {
					street: '123 Main St',
					city: 'San Francisco',
					state: 'CA',
					zip_code: '94102'
				}
			},
			targetState: {
				id: 'emp-123',
				full_name: 'John Doe',
				address: {
					street: '123 Main St',
					city: 'Oakland',
					state: 'CA',
					zip_code: '94612'
				}
			}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};

/**
 * Type change conflict (string to number)
 */
export const TypeChangeConflict: Story = {
	args: {
		isOpen: true,
		logId: 'log-004',
		conflicts: {
			hasConflicts: true,
			conflictFields: ['employee_id'],
			conflicts: [
				{
					field: 'employee_id',
					currentValue: 12345,
					targetValue: 'EMP-12345',
					snapshotValue: 'EMP-12345'
				}
			],
			currentState: {
				id: 'emp-123',
				full_name: 'John Doe',
				employee_id: 12345
			},
			targetState: {
				id: 'emp-123',
				full_name: 'John Doe',
				employee_id: 'EMP-12345'
			}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};

/**
 * Array conflict
 */
export const ArrayConflict: Story = {
	args: {
		isOpen: true,
		logId: 'log-005',
		conflicts: {
			hasConflicts: true,
			conflictFields: ['skills'],
			conflicts: [
				{
					field: 'skills',
					currentValue: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
					targetValue: ['JavaScript', 'TypeScript', 'React'],
					snapshotValue: ['JavaScript', 'TypeScript', 'React']
				}
			],
			currentState: {
				id: 'emp-123',
				full_name: 'John Doe',
				skills: ['JavaScript', 'TypeScript', 'React', 'Node.js']
			},
			targetState: {
				id: 'emp-123',
				full_name: 'John Doe',
				skills: ['JavaScript', 'TypeScript', 'React']
			}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};

/**
 * Null to value conflict
 */
export const NullToValueConflict: Story = {
	args: {
		isOpen: true,
		logId: 'log-006',
		conflicts: {
			hasConflicts: true,
			conflictFields: ['manager_id'],
			conflicts: [
				{
					field: 'manager_id',
					currentValue: 'mgr-456',
					targetValue: null,
					snapshotValue: null
				}
			],
			currentState: {
				id: 'emp-123',
				full_name: 'John Doe',
				manager_id: 'mgr-456'
			},
			targetState: {
				id: 'emp-123',
				full_name: 'John Doe',
				manager_id: null
			}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};

/**
 * Many conflicts (7+ fields)
 */
export const ManyConflicts: Story = {
	args: {
		isOpen: true,
		logId: 'log-007',
		conflicts: {
			hasConflicts: true,
			conflictFields: [
				'salary',
				'department_id',
				'job_title',
				'manager_id',
				'office_location',
				'phone_number',
				'emergency_contact'
			],
			conflicts: [
				{
					field: 'salary',
					currentValue: 95000,
					targetValue: 75000,
					snapshotValue: 75000
				},
				{
					field: 'department_id',
					currentValue: 'dept-003',
					targetValue: 'dept-001',
					snapshotValue: 'dept-001'
				},
				{
					field: 'job_title',
					currentValue: 'Lead Engineer',
					targetValue: 'Engineer',
					snapshotValue: 'Engineer'
				},
				{
					field: 'manager_id',
					currentValue: 'mgr-789',
					targetValue: 'mgr-123',
					snapshotValue: 'mgr-123'
				},
				{
					field: 'office_location',
					currentValue: 'Building B',
					targetValue: 'Building A',
					snapshotValue: 'Building A'
				},
				{
					field: 'phone_number',
					currentValue: '555-9999',
					targetValue: '555-1234',
					snapshotValue: '555-1234'
				},
				{
					field: 'emergency_contact',
					currentValue: 'Jane Doe (555-8888)',
					targetValue: 'Jane Doe (555-5678)',
					snapshotValue: 'Jane Doe (555-5678)'
				}
			],
			currentState: {
				id: 'emp-123',
				full_name: 'John Doe',
				salary: 95000,
				department_id: 'dept-003',
				job_title: 'Lead Engineer',
				manager_id: 'mgr-789',
				office_location: 'Building B',
				phone_number: '555-9999',
				emergency_contact: 'Jane Doe (555-8888)'
			},
			targetState: {
				id: 'emp-123',
				full_name: 'John Doe',
				salary: 75000,
				department_id: 'dept-001',
				job_title: 'Engineer',
				manager_id: 'mgr-123',
				office_location: 'Building A',
				phone_number: '555-1234',
				emergency_contact: 'Jane Doe (555-5678)'
			}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};

/**
 * Closed modal
 */
export const Closed: Story = {
	args: {
		isOpen: false,
		logId: 'log-008',
		conflicts: {
			hasConflicts: true,
			conflictFields: ['salary'],
			conflicts: [
				{
					field: 'salary',
					currentValue: 85000,
					targetValue: 75000,
					snapshotValue: 75000
				}
			],
			currentState: {},
			targetState: {}
		},
		onResolve: async (strategy, mergeFields) =>
			console.log('Resolve:', strategy, mergeFields),
		onCancel: () => console.log('Cancel')
	}
};
