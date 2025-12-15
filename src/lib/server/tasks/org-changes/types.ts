/**
 * Organizational change types
 */
export type OrganizationalChangeType =
	| 'manager_changed'
	| 'employee_department_changed'
	| 'employee_terminated'
	| 'department_dissolved'
	| 'manager_removed';

/**
 * Organizational change event
 */
export interface OrganizationalChangeEvent {
	type: OrganizationalChangeType;
	affectedUserId?: string; // Employee/Manager affected
	affectedDepartmentId?: string; // Department affected
	newManagerId?: string; // New manager (if applicable)
	newDepartmentId?: string; // New department (if applicable)
	performedBy: string; // Admin/HR user making the change
	reason?: string;
}

/**
 * Task reassignment result
 */
export interface TaskReassignmentResult {
	taskId: string;
	previousAssigneeId: string;
	newAssigneeId: string | null;
	requiresManualReassignment: boolean;
	reassignedAutomatically: boolean;
	error?: string;
}
