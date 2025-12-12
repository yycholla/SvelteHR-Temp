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

import { getGraphQLEndpoint } from '$lib/server/api-url';
import { logTaskReassigned } from '$lib/server/audit/task-audit-service';
import type { Task } from '$lib/types/task';
import { logger } from '$lib/utils/logger';

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

/**
 * Get all tasks assigned to a specific user
 */
async function getTasksAssignedToUser(userId: string): Promise<Task[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetUserTasks($userId: UUID!) {
						allTasks(
							condition: { assigneeId: $userId, archived: false }
							orderBy: CREATED_AT_DESC
						) {
							nodes {
								id
								title
								assigneeId
								creatorId
								taskTypeId
								status
								priority
								dueDate
								parentTaskId
								requiresManualReassignment
								createdAt
								updatedAt
							}
						}
					}
				`,
				variables: { userId }
			})
		});

		if (!response.ok) {
			logger.error('[ORG CHANGE] Failed to fetch user tasks');
			return [];
		}

		const data = await response.json();
		return data?.data?.allTasks?.nodes || [];
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching user tasks:',
			error instanceof Error ? error : new Error(String(error))
		);
		return [];
	}
}

/**
 * Get department manager ID
 */
async function getDepartmentManager(departmentId: string): Promise<string | null> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetDepartmentManager($departmentId: UUID!) {
						departmentById(id: $departmentId) {
							id
							managerId
						}
					}
				`,
				variables: { departmentId }
			})
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data?.data?.departmentById?.managerId || null;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching department manager:',
			error instanceof Error ? error : new Error(String(error))
		);
		return null;
	}
}

/**
 * Get all employee IDs in a department
 */
async function getDepartmentEmployees(departmentId: string): Promise<string[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetDepartmentEmployees($departmentId: UUID!) {
						allUsers(condition: { departmentId: $departmentId }) {
							nodes {
								id
							}
						}
					}
				`,
				variables: { departmentId }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		const users = data?.data?.allUsers?.nodes || [];
		return users.map((user: any) => user.id);
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching department employees:',
			error instanceof Error ? error : new Error(String(error))
		);
		return [];
	}
}

/**
 * Reassign a task to a new user
 */
async function reassignTask(
	taskId: string,
	oldAssigneeId: string,
	newAssigneeId: string,
	performedBy: string,
	reason: string
): Promise<boolean> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					mutation ReassignTask($input: UpdateTaskInput!) {
						updateTaskById(input: $input) {
							task {
								id
								assigneeId
								updatedAt
							}
						}
					}
				`,
				variables: {
					input: {
						id: taskId,
						taskPatch: {
							assigneeId: newAssigneeId,
							updatedAt: new Date().toISOString()
						}
					}
				}
			})
		});

		if (!response.ok) {
			logger.error('[ORG CHANGE] Failed to reassign task:', undefined, { taskId });
			return false;
		}

		const data = await response.json();

		if (data.errors) {
			logger.error('[ORG CHANGE] GraphQL errors reassigning task:', undefined, {
				errors: data.errors
			});
			return false;
		}

		// Log the reassignment in audit trail
		await logTaskReassigned(taskId, performedBy, oldAssigneeId, newAssigneeId, reason);

		return true;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error reassigning task:',
			error instanceof Error ? error : new Error(String(error))
		);
		return false;
	}
}

/**
 * Flag a task for manual reassignment
 */
async function flagTaskForManualReassignment(
	taskId: string,
	performedBy: string
): Promise<boolean> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					mutation FlagTaskForReassignment($input: UpdateTaskInput!) {
						updateTaskById(input: $input) {
							task {
								id
								requiresManualReassignment
								updatedAt
							}
						}
					}
				`,
				variables: {
					input: {
						id: taskId,
						taskPatch: {
							requiresManualReassignment: true,
							updatedAt: new Date().toISOString()
						}
					}
				}
			})
		});

		if (!response.ok) {
			logger.error('[ORG CHANGE] Failed to flag task for manual reassignment:', undefined, {
				taskId
			});
			return false;
		}

		const data = await response.json();

		if (data.errors) {
			logger.error('[ORG CHANGE] GraphQL errors flagging task:', undefined, {
				errors: data.errors
			});
			return false;
		}

		logger.info('[ORG CHANGE] Flagged task for manual reassignment:', { taskId });
		return true;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error flagging task:',
			error instanceof Error ? error : new Error(String(error))
		);
		return false;
	}
}

/**
 * Get tasks requiring manual reassignment
 */
export async function getTasksRequiringManualReassignment(departmentId?: string): Promise<Task[]> {
	try {
		const graphqlEndpoint = getGraphQLEndpoint();

		const condition: any = {
			requiresManualReassignment: true,
			archived: false
		};

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: `
					query GetTasksRequiringReassignment($condition: TaskCondition!) {
						allTasks(
							condition: $condition
							orderBy: CREATED_AT_DESC
						) {
							nodes {
								id
								title
								description
								assigneeId
								creatorId
								taskTypeId
								status
								priority
								dueDate
								parentTaskId
								requiresManualReassignment
								createdAt
								updatedAt
								userByAssigneeId {
									id
									displayName
									email
									departmentId
								}
								taskTypeByTaskTypeId {
									id
									name
								}
							}
						}
					}
				`,
				variables: { condition }
			})
		});

		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		let tasks = data?.data?.allTasks?.nodes || [];

		// Filter by department if specified
		if (departmentId) {
			tasks = tasks.filter((task: any) => task.userByAssigneeId?.departmentId === departmentId);
		}

		return tasks;
	} catch (error) {
		logger.error(
			'[ORG CHANGE] Error fetching tasks requiring reassignment:',
			error instanceof Error ? error : new Error(String(error))
		);
		return [];
	}
}

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
