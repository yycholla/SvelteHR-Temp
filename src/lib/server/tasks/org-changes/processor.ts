import { logger } from '$lib/utils/logger';
import type { OrganizationalChangeEvent, TaskReassignmentResult } from './types';
import {
	handleManagerChange,
	handleEmployeeDepartmentChange,
	handleEmployeeTermination,
	handleDepartmentDissolution
} from './handlers';
import { getTasksAssignedToUser, flagTaskForManualReassignment } from './data-access';

/**
 * Process organizational change event
 *
 * Central handler for all organizational change types
 */
export async function processOrganizationalChange(
	event: OrganizationalChangeEvent
): Promise<TaskReassignmentResult[]> {
	logger.info('[ORG CHANGE] Processing organizational change:', {
		type: event.type,
		affectedUserId: event.affectedUserId,
		affectedDepartmentId: event.affectedDepartmentId
	});

	let results: TaskReassignmentResult[] = [];

	switch (event.type) {
		case 'manager_changed':
			if (event.affectedDepartmentId && event.affectedUserId && event.newManagerId) {
				results = await handleManagerChange(
					event.affectedDepartmentId,
					event.affectedUserId,
					event.newManagerId,
					event.performedBy,
					event.reason
				);
			}
			break;

		case 'employee_department_changed':
			if (event.affectedUserId && event.affectedDepartmentId && event.newDepartmentId) {
				results = await handleEmployeeDepartmentChange(
					event.affectedUserId,
					event.affectedDepartmentId,
					event.newDepartmentId,
					event.performedBy
				);
			}
			break;

		case 'employee_terminated':
			if (event.affectedUserId && event.affectedDepartmentId) {
				results = await handleEmployeeTermination(
					event.affectedUserId,
					event.affectedDepartmentId,
					event.performedBy
				);
			}
			break;

		case 'department_dissolved':
			if (event.affectedDepartmentId) {
				results = await handleDepartmentDissolution(event.affectedDepartmentId, event.performedBy);
			}
			break;

		case 'manager_removed':
			// Similar to manager_changed, but no new manager
			if (event.affectedDepartmentId && event.affectedUserId) {
				const tasks = await getTasksAssignedToUser(event.affectedUserId);
				for (const task of tasks) {
					await flagTaskForManualReassignment(task.id, event.performedBy);
					results.push({
						taskId: task.id,
						previousAssigneeId: event.affectedUserId,
						newAssigneeId: null,
						requiresManualReassignment: true,
						reassignedAutomatically: false
					});
				}
			}
			break;

		default:
			logger.warn('[ORG CHANGE] Unknown organizational change type:', { type: event.type });
	}

	return results;
}
