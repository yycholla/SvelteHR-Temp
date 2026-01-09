import { logger } from '$lib/utils/logger';
import type { TaskReassignmentResult } from './types';
import {
	getTasksAssignedToUser,
	getDepartmentManager,
	getDepartmentEmployees,
	reassignTask,
	flagTaskForManualReassignment
} from './data-access';

/**
 * Handle manager change in a department
 *
 * When a department gets a new manager, tasks assigned to the old manager
 * should be reassigned to the new manager (unless requires_manual_reassignment is true).
 */
export async function handleManagerChange(
	departmentId: string,
	oldManagerId: string,
	newManagerId: string,
	performedBy: string,
	reason?: string
): Promise<TaskReassignmentResult[]> {
	const results: TaskReassignmentResult[] = [];

	try {
		// Get all tasks assigned to the old manager in this department
		const tasks = await getTasksAssignedToUser(oldManagerId);

		for (const task of tasks) {
			if (task.requiresManualReassignment) {
				// Flag for manual reassignment
				await flagTaskForManualReassignment(task.id, performedBy);

				results.push({
					taskId: task.id,
					previousAssigneeId: oldManagerId,
					newAssigneeId: null,
					requiresManualReassignment: true,
					reassignedAutomatically: false
				});
			} else {
				// Automatically reassign to new manager
				const success = await reassignTask(
					task.id,
					oldManagerId,
					newManagerId,
					performedBy,
					reason || `Manager change in department`
				);

				results.push({
					taskId: task.id,
					previousAssigneeId: oldManagerId,
					newAssigneeId: success ? newManagerId : null,
					requiresManualReassignment: false,
					reassignedAutomatically: success,
					error: success ? undefined : 'Reassignment failed'
				});
			}
		}

		logger.info(`[ORG CHANGE] Handled manager change: ${results.length} tasks processed`, {
			departmentId,
			oldManagerId,
			newManagerId,
			automaticReassignments: results.filter((r) => r.reassignedAutomatically).length,
			manualReassignments: results.filter((r) => r.requiresManualReassignment).length
		});
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error handling manager change:',
			error instanceof Error ? error : new Error(String(error))
		);
	}

	return results;
}

/**
 * Handle employee department change
 *
 * When an employee moves to a new department, their tasks should be reviewed.
 * Tasks that are department-specific should be reassigned to someone in the old department.
 */
export async function handleEmployeeDepartmentChange(
	employeeId: string,
	oldDepartmentId: string,
	newDepartmentId: string,
	performedBy: string
): Promise<TaskReassignmentResult[]> {
	const results: TaskReassignmentResult[] = [];

	try {
		// Get all tasks assigned to the employee
		const tasks = await getTasksAssignedToUser(employeeId);

		// Get the old department manager for reassignment
		const oldDepartmentManager = await getDepartmentManager(oldDepartmentId);

		for (const task of tasks) {
			if (task.requiresManualReassignment) {
				// Flag for manual review
				await flagTaskForManualReassignment(task.id, performedBy);

				results.push({
					taskId: task.id,
					previousAssigneeId: employeeId,
					newAssigneeId: null,
					requiresManualReassignment: true,
					reassignedAutomatically: false
				});
			} else if (oldDepartmentManager) {
				// Reassign to old department manager
				const success = await reassignTask(
					task.id,
					employeeId,
					oldDepartmentManager,
					performedBy,
					`Employee moved to new department`
				);

				results.push({
					taskId: task.id,
					previousAssigneeId: employeeId,
					newAssigneeId: success ? oldDepartmentManager : null,
					requiresManualReassignment: false,
					reassignedAutomatically: success,
					error: success ? undefined : 'Reassignment failed'
				});
			} else {
				// No manager found, flag for manual reassignment
				await flagTaskForManualReassignment(task.id, performedBy);

				results.push({
					taskId: task.id,
					previousAssigneeId: employeeId,
					newAssigneeId: null,
					requiresManualReassignment: true,
					reassignedAutomatically: false,
					error: 'No manager found for old department'
				});
			}
		}

		logger.info(
			`[ORG CHANGE] Handled employee department change: ${results.length} tasks processed`,
			{
				employeeId,
				oldDepartmentId,
				newDepartmentId
			}
		);
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error handling employee department change:',
			error instanceof Error ? error : new Error(String(error))
		);
	}

	return results;
}

/**
 * Handle employee termination/archival
 *
 * When an employee is terminated, all their tasks must be reassigned.
 * Tasks are automatically reassigned to their manager or flagged for manual reassignment.
 */
export async function handleEmployeeTermination(
	employeeId: string,
	departmentId: string,
	performedBy: string
): Promise<TaskReassignmentResult[]> {
	const results: TaskReassignmentResult[] = [];

	try {
		// Get all tasks assigned to the employee
		const tasks = await getTasksAssignedToUser(employeeId);

		// Get the department manager for reassignment
		const departmentManager = await getDepartmentManager(departmentId);

		for (const task of tasks) {
			if (task.requiresManualReassignment || !departmentManager) {
				// Flag for manual reassignment
				await flagTaskForManualReassignment(task.id, performedBy);

				results.push({
					taskId: task.id,
					previousAssigneeId: employeeId,
					newAssigneeId: null,
					requiresManualReassignment: true,
					reassignedAutomatically: false
				});
			} else {
				// Automatically reassign to manager
				const success = await reassignTask(
					task.id,
					employeeId,
					departmentManager,
					performedBy,
					`Employee terminated`
				);

				results.push({
					taskId: task.id,
					previousAssigneeId: employeeId,
					newAssigneeId: success ? departmentManager : null,
					requiresManualReassignment: false,
					reassignedAutomatically: success,
					error: success ? undefined : 'Reassignment failed'
				});
			}
		}

		logger.info(`[ORG CHANGE] Handled employee termination: ${results.length} tasks processed`, {
			employeeId,
			departmentId
		});
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error handling employee termination:',
			error instanceof Error ? error : new Error(String(error))
		);
	}

	return results;
}

/**
 * Handle department dissolution
 *
 * When a department is dissolved, all tasks assigned to department members
 * should be flagged for manual reassignment to ensure proper handling.
 */
export async function handleDepartmentDissolution(
	departmentId: string,
	performedBy: string
): Promise<TaskReassignmentResult[]> {
	const results: TaskReassignmentResult[] = [];

	try {
		// Get all employees in the department
		const departmentEmployees = await getDepartmentEmployees(departmentId);

		// For each employee, flag all their tasks for manual reassignment
		for (const employeeId of departmentEmployees) {
			const tasks = await getTasksAssignedToUser(employeeId);

			for (const task of tasks) {
				await flagTaskForManualReassignment(task.id, performedBy);

				results.push({
					taskId: task.id,
					previousAssigneeId: employeeId,
					newAssigneeId: null,
					requiresManualReassignment: true,
					reassignedAutomatically: false
				});
			}
		}

		logger.info(`[ORG CHANGE] Handled department dissolution: ${results.length} tasks flagged`, {
			departmentId,
			employeeCount: departmentEmployees.length
		});
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error handling department dissolution:',
			error instanceof Error ? error : new Error(String(error))
		);
	}

	return results;
}
