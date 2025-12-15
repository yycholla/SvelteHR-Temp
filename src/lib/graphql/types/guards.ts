import type { Event } from './events';
import type { Notification } from './notifications';
import type { Task } from './tasks';

/**
 * Check if a task is assigned to an employee (vs department)
 */
export function isEmployeeTask(task: Task): boolean {
	return !!task.assigneeId && !task.assignedToDepartmentId;
}

/**
 * Check if a task is assigned to a department
 */
export function isDepartmentTask(task: Task): boolean {
	return !!task.assignedToDepartmentId && !task.assigneeId;
}

/**
 * Check if an event is visible to all employees
 */
export function isCompanyWideEvent(event: Event): boolean {
	return event.visibilityType === 'company';
}

/**
 * Check if an event is department-specific
 */
export function isDepartmentEvent(event: Event): boolean {
	return event.visibilityType === 'department';
}

/**
 * Check if an event is for specific people only
 */
export function isSpecificPeopleEvent(event: Event): boolean {
	return event.visibilityType === 'specific';
}

/**
 * Check if a notification is unread
 */
export function isUnreadNotification(notification: Notification): boolean {
	return !notification.readStatus;
}

/**
 * Check if a notification is an email notification
 */
export function isEmailNotification(notification: Notification): boolean {
	return notification.type === 'email';
}

/**
 * Check if a notification is an in-app notification
 */
export function isInAppNotification(notification: Notification): boolean {
	return notification.type === 'in_app';
}
