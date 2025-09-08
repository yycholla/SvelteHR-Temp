// Enhanced notification system with proper toast integration
import {
	showSuccess,
	showError,
	showWarning,
	showInfo,
	clearToasts,
	type Toast
} from '$lib/utils/errors';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
	title?: string;
	message: string;
	type: NotificationType;
	duration?: number;
	persistent?: boolean;
	action?: {
		label: string;
		handler: () => void;
	};
}

// Enhanced notification function with toast support
export function showNotification(options: NotificationOptions) {
	const { title, message, type, duration, persistent, action } = options;

	const toastOptions = {
		title,
		timeout: persistent ? 0 : duration || getDefaultTimeout(type),
		dismissible: true
	};

	// Convert action to toast action format
	const actions = action
		? [
				{
					label: action.label,
					action: action.handler,
					variant: 'primary' as const
				}
			]
		: undefined;

	switch (type) {
		case 'success':
			showSuccess(message, toastOptions);
			break;
		case 'error':
			showError(message, toastOptions);
			break;
		case 'warning':
			showWarning(message, toastOptions);
			break;
		case 'info':
		default:
			showInfo(message, toastOptions);
			break;
	}
}

function getDefaultTimeout(type: NotificationType): number {
	switch (type) {
		case 'success':
			return 3000;
		case 'error':
			return 5000;
		case 'warning':
			return 4000;
		case 'info':
			return 4000;
		default:
			return 4000;
	}
}

// Predefined notification functions
export const notifications = {
	success: (message: string, title?: string) => {
		showNotification({ message, title, type: 'success' });
	},

	error: (message: string, title?: string) => {
		showNotification({ message, title, type: 'error' });
	},

	warning: (message: string, title?: string) => {
		showNotification({ message, title, type: 'warning' });
	},

	info: (message: string, title?: string) => {
		showNotification({ message, title, type: 'info' });
	},

	// Specific HR notifications
	employeeCreated: (employeeName: string) => {
		notifications.success(`Employee ${employeeName} has been created successfully`);
	},

	employeeUpdated: (employeeName: string) => {
		notifications.success(`Employee ${employeeName} has been updated successfully`);
	},

	employeeDeleted: (employeeName: string) => {
		notifications.success(`Employee ${employeeName} has been deleted successfully`);
	},

	taskCreated: (taskTitle: string) => {
		notifications.success(`Task "${taskTitle}" has been created successfully`);
	},

	taskUpdated: (taskTitle: string) => {
		notifications.success(`Task "${taskTitle}" has been updated successfully`);
	},

	taskCompleted: (taskTitle: string) => {
		notifications.success(`Task "${taskTitle}" has been marked as completed`);
	},

	taskAssigned: (taskTitle: string, assigneeName: string) => {
		notifications.success(`Task "${taskTitle}" has been assigned to ${assigneeName}`);
	},

	leaveRequestSubmitted: () => {
		notifications.success('Leave request has been submitted for approval');
	},

	leaveRequestApproved: () => {
		notifications.success('Leave request has been approved');
	},

	leaveRequestDenied: () => {
		notifications.warning('Leave request has been denied');
	},

	documentUploaded: (fileName: string) => {
		notifications.success(`Document "${fileName}" has been uploaded successfully`);
	},

	documentDeleted: (fileName: string) => {
		notifications.success(`Document "${fileName}" has been deleted`);
	},

	// Error notifications
	apiError: (message: string = 'An error occurred while processing your request') => {
		notifications.error(message, 'API Error');
	},

	validationError: (message: string = 'Please check your input and try again') => {
		notifications.error(message, 'Validation Error');
	},

	networkError: () => {
		notifications.error('Please check your internet connection and try again', 'Network Error');
	},

	permissionError: () => {
		notifications.error('You do not have permission to perform this action', 'Permission Denied');
	},

	// Persistent notifications for critical actions
	confirmDelete: (itemName: string, onConfirm: () => void) => {
		showNotification({
			message: `Are you sure you want to delete "${itemName}"? This action cannot be undone.`,
			type: 'warning',
			persistent: true,
			action: {
				label: 'Delete',
				handler: onConfirm
			}
		});
	},

	// Progress notifications
	loading: (message: string = 'Processing...') => {
		showNotification({
			message,
			type: 'info',
			persistent: true
		});
	},

	// Utility function to clear all toasts
	clear: () => {
		clearToasts();
	}
};

// Notification queue for batch operations
class NotificationQueue {
	private queue: NotificationOptions[] = [];
	private processing = false;

	add(notification: NotificationOptions) {
		this.queue.push(notification);
		this.process();
	}

	private async process() {
		if (this.processing || this.queue.length === 0) return;

		this.processing = true;

		while (this.queue.length > 0) {
			const notification = this.queue.shift()!;
			showNotification(notification);

			// Add delay between notifications to prevent overwhelming the user
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		this.processing = false;
	}
}

export const notificationQueue = new NotificationQueue();

// Batch notification helpers
export function showBatchNotifications(notifications: NotificationOptions[]) {
	notifications.forEach((notification) => {
		notificationQueue.add(notification);
	});
}

// Notification factory for consistent messaging
export function createNotification(
	operation: string,
	entity: string,
	entityName?: string
): { success: string; error: string } {
	const name = entityName ? ` "${entityName}"` : '';

	return {
		success: `${entity}${name} ${operation} successfully`,
		error: `Failed to ${operation.toLowerCase()} ${entity.toLowerCase()}${name}`
	};
}
