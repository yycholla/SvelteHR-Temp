/**
 * Organizational Change Handlers for Task Management
 * Feature: 028-task-system-expansion - T022
 *
 * Handles automatic task reassignment when organizational changes occur:
 * - Manager reassignment/removal
 * - Employee department changes
 * - Employee termination/archival
 * - Department dissolution
 *
 * Tasks can be automatically reassigned or flagged for manual reassignment
 * based on the requires_manual_reassignment flag.
 */

// Export types
export type {
	OrganizationalChangeType,
	OrganizationalChangeEvent,
	TaskReassignmentResult
} from './org-changes/types';

// Export handlers
export {
	handleManagerChange,
	handleEmployeeDepartmentChange,
	handleEmployeeTermination,
	handleDepartmentDissolution
} from './org-changes/handlers';

// Export data access utilities
export { getTasksRequiringManualReassignment } from './org-changes/data-access';

// Export main processor
export { processOrganizationalChange } from './org-changes/processor';
