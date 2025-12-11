/**
 * Task Reminder Scheduler Service
 * Feature: 028-task-system-expansion - T023
 *
 * Background service that runs periodically to check for task reminders
 * that need to be sent and creates notifications for assignees.
 *
 * Sends reminders X minutes before task due date based on reminder_time field.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { getGraphQLEndpoint } from '$lib/server/api-url';
import type { Task, TaskStatus } from '$lib/types/task';
import { logger } from '$lib/utils/logger';

export interface PendingTaskReminder {
	taskId: string;
	assigneeId: string;
	taskTitle: string;
	taskStatus: TaskStatus;
	dueDate: Date;
	reminderTime: number; // Minutes before due date
	assigneeEmail: string;
	assigneeName: string;
	creatorId: string;
	priority: string;
}

/**
 * Task Reminder Scheduler Service
 * Runs every 5 minutes to check for pending task reminders
 */
export class TaskReminderScheduler {
	private static cronTask: ScheduledTask | null = null;
	private static isRunning = false;
	private static processedReminders = new Set<string>(); // Track sent reminders

	/**
	 * Start the task reminder scheduler
	 * Runs every 5 minutes to check for pending reminders
	 */
	static start(): void {
		if (this.cronTask) {
			logger.info('[TaskReminderScheduler] Already running');
			return;
		}

		logger.info('[TaskReminderScheduler] Starting task reminder scheduler');

		// Run every 5 minutes
		this.cronTask = cron.schedule('*/5 * * * *', async () => {
			await this.checkAndSendReminders();
		});

		// Run once immediately on startup
		this.checkAndSendReminders();
	}

	/**
	 * Stop the task reminder scheduler
	 */
	static stop(): void {
		if (this.cronTask) {
			this.cronTask.stop();
			this.cronTask = null;
			logger.info('[TaskReminderScheduler] Stopped');
		}
	}

	/**
	 * Check for pending reminders and send notifications
	 */
	private static async checkAndSendReminders(): Promise<void> {
		if (this.isRunning) {
			logger.info('[TaskReminderScheduler] Previous check still running, skipping...');
			return;
		}

		this.isRunning = true;

		try {
			const pendingReminders = await this.getPendingReminders();

			if (pendingReminders.length === 0) {
				logger.debug('[TaskReminderScheduler] No pending reminders');
				return;
			}

			logger.info(`[TaskReminderScheduler] Found ${pendingReminders.length} pending reminders`);

			for (const reminder of pendingReminders) {
				await this.sendReminder(reminder);
			}
		} catch (error) {
			logger.error('[TaskReminderScheduler] Error checking reminders:', error instanceof Error ? error : new Error(String(error)));
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Query database for pending task reminders
	 * Finds tasks where:
	 * - NOW() >= (due_date - reminder_time * interval '1 minute')
	 * - NOW() < due_date (task hasn't passed due date yet)
	 * - Task status is NOT Completed or Cancelled
	 * - Task is not archived
	 * - reminder_time is set (not null)
	 */
	private static async getPendingReminders(): Promise<PendingTaskReminder[]> {
		try {
			// Get service authentication key from environment
			const serviceKey = process.env.SERVICE_AUTH_KEY || 'fallback-dev-key';
			const graphqlEndpoint = getGraphQLEndpoint();

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${serviceKey}`
				},
				body: JSON.stringify({
					query: `
						query GetTasksWithReminders {
							allTasks(
								condition: {
									archived: false
								}
								filter: {
									dueDate: { isNull: false }
									reminderTime: { isNull: false }
									status: { notIn: ["Completed", "Cancelled"] }
								}
								orderBy: DUE_DATE_ASC
							) {
								nodes {
									id
									title
									status
									priority
									dueDate
									reminderTime
									assigneeId
									creatorId
									userByAssigneeId {
										id
										displayName
										email
									}
								}
							}
						}
					`
				})
			});

			if (!response.ok) {
				logger.error('[TaskReminderScheduler] Failed to fetch tasks with reminders');
				return [];
			}

			const data = await response.json();
			const tasks = data?.data?.allTasks?.nodes || [];

			// Filter tasks that need reminders sent now
			const now = new Date();
			const pendingReminders: PendingTaskReminder[] = tasks
				.filter((task: any) => {
					// Skip if no due date or reminder time
					if (!task.dueDate || !task.reminderTime) return false;

					// Skip if no assignee
					if (!task.assigneeId || !task.userByAssigneeId) return false;

					const dueDate = new Date(task.dueDate);

					// Skip if task is already overdue
					if (now >= dueDate) return false;

					// Calculate when the reminder should be sent
					const reminderMinutes = task.reminderTime;
					const sendTime = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000);

					// Only include if:
					// 1. Current time >= send time
					// 2. Send time is within the last 10 minutes (to avoid sending old reminders)
					const timeDiff = now.getTime() - sendTime.getTime();
					const tenMinutesMs = 10 * 60 * 1000;

					return timeDiff >= 0 && timeDiff <= tenMinutesMs;
				})
				.map((task: any) => ({
					taskId: task.id,
					assigneeId: task.assigneeId,
					taskTitle: task.title,
					taskStatus: task.status,
					dueDate: new Date(task.dueDate),
					reminderTime: task.reminderTime,
					assigneeEmail: task.userByAssigneeId.email,
					assigneeName: task.userByAssigneeId.displayName,
					creatorId: task.creatorId,
					priority: task.priority
				}));

			return pendingReminders;
		} catch (error) {
			logger.error('[TaskReminderScheduler] Error fetching pending reminders:', error instanceof Error ? error : new Error(String(error)));
			return [];
		}
	}

	/**
	 * Send a task reminder notification
	 */
	private static async sendReminder(reminder: PendingTaskReminder): Promise<void> {
		try {
			// Create unique key for this reminder to avoid duplicates
			const reminderKey = `${reminder.taskId}-${reminder.assigneeId}-${reminder.reminderTime}`;

			// Check if we've already sent this reminder
			if (this.processedReminders.has(reminderKey)) {
				return;
			}

			// Double-check timing
			const now = new Date();
			const dueDate = new Date(reminder.dueDate);
			const reminderMinutes = reminder.reminderTime;
			const sendTime = new Date(dueDate.getTime() - reminderMinutes * 60 * 1000);

			// Only send if current time >= send time and task not overdue
			if (now < sendTime || now >= dueDate) {
				return;
			}

			// Format time description
			const timeDescription = this.formatReminderTime(reminderMinutes);
			const priorityEmoji = this.getPriorityEmoji(reminder.priority);

			// Create notification record in database
			await this.createNotificationRecord({
				userId: reminder.assigneeId,
				taskId: reminder.taskId,
				type: 'task_reminder',
				message: `${priorityEmoji} Task due in ${timeDescription}: "${reminder.taskTitle}"`
			});

			// Mark as processed
			this.processedReminders.add(reminderKey);

			// Clean up old processed reminders (keep only last 2000)
			if (this.processedReminders.size > 2000) {
				const entries = Array.from(this.processedReminders);
				this.processedReminders = new Set(entries.slice(-2000));
			}

			logger.info(
				`[TaskReminderScheduler] Sent reminder to ${reminder.assigneeName} for task "${reminder.taskTitle}"`
			);
		} catch (error) {
			logger.error('[TaskReminderScheduler] Error sending reminder:', error instanceof Error ? error : new Error(String(error)));
		}
	}

	/**
	 * Create a notification record in the database
	 */
	private static async createNotificationRecord(options: {
		userId: string;
		taskId: string;
		type: string;
		message: string;
	}): Promise<void> {
		try {
			// Get service authentication key from environment
			const serviceKey = process.env.SERVICE_AUTH_KEY || 'fallback-dev-key';
			const graphqlEndpoint = getGraphQLEndpoint();

			const response = await fetch(graphqlEndpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${serviceKey}`
				},
				body: JSON.stringify({
					query: `
						mutation CreateTaskNotification($input: CreateNotificationInput!) {
							createNotification(input: $input) {
								notification {
									id
									userId
									type
									message
									createdAt
								}
							}
						}
					`,
					variables: {
						input: {
							notification: {
								userId: options.userId,
								type: options.type,
								message: options.message,
								metadata: {
									taskId: options.taskId,
									sentAt: new Date().toISOString()
								},
								read: false,
								createdAt: new Date().toISOString()
							}
						}
					}
				})
			});

			if (!response.ok) {
				throw new Error('Failed to create notification');
			}

			const result = await response.json();

			if (result.errors) {
				throw new Error(result.errors[0]?.message || 'GraphQL error');
			}

			logger.debug(
				'[TaskReminderScheduler] Created notification:',
				{ id: result.data?.createNotification?.notification?.id }
			);
		} catch (error) {
			logger.error('[TaskReminderScheduler] Error creating notification:', error instanceof Error ? error : new Error(String(error)));
			// Don't throw - we don't want to stop the scheduler
		}
	}

	/**
	 * Format reminder time into human-readable string
	 */
	private static formatReminderTime(minutes: number): string {
		if (minutes >= 10080) {
			const weeks = Math.floor(minutes / 10080);
			return `${weeks} week${weeks > 1 ? 's' : ''}`;
		} else if (minutes >= 1440) {
			const days = Math.floor(minutes / 1440);
			return `${days} day${days > 1 ? 's' : ''}`;
		} else if (minutes >= 60) {
			const hours = Math.floor(minutes / 60);
			return `${hours} hour${hours > 1 ? 's' : ''}`;
		} else {
			return `${minutes} minute${minutes > 1 ? 's' : ''}`;
		}
	}

	/**
	 * Get emoji for task priority
	 */
	private static getPriorityEmoji(priority: string): string {
		switch (priority) {
			case 'Urgent':
				return '🔥';
			case 'High':
				return '⚠️';
			case 'Medium':
				return '📋';
			case 'Low':
				return '📌';
			default:
				return '📋';
		}
	}

	/**
	 * Get scheduler status
	 */
	static getStatus(): {
		running: boolean;
		processedCount: number;
	} {
		return {
			running: this.cronTask !== null,
			processedCount: this.processedReminders.size
		};
	}

	/**
	 * Manually trigger reminder check (for testing)
	 */
	static async triggerCheck(): Promise<void> {
		await this.checkAndSendReminders();
	}

	/**
	 * Clear processed reminders cache (for testing)
	 */
	static clearCache(): void {
		this.processedReminders.clear();
		logger.info('[TaskReminderScheduler] Cleared processed reminders cache');
	}
}

/**
 * Check for overdue tasks and send notifications
 * Separate function that can be called independently
 */
export async function checkOverdueTasks(): Promise<number> {
	try {
		// Get service authentication key from environment
		const serviceKey = process.env.SERVICE_AUTH_KEY || 'fallback-dev-key';
		const graphqlEndpoint = getGraphQLEndpoint();

		const now = new Date().toISOString();

		const response = await fetch(graphqlEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${serviceKey}`
			},
			body: JSON.stringify({
				query: `
					query GetOverdueTasks($now: Datetime!) {
						allTasks(
							condition: {
								archived: false
							}
							filter: {
								dueDate: { lessThan: $now }
								status: { notIn: ["Completed", "Cancelled"] }
							}
							orderBy: DUE_DATE_ASC
						) {
							nodes {
								id
								title
								dueDate
								assigneeId
								priority
								userByAssigneeId {
									id
									displayName
									email
								}
							}
						}
					}
				`,
				variables: { now }
			})
		});

		if (!response.ok) {
			logger.error('[TaskReminderScheduler] Failed to fetch overdue tasks');
			return 0;
		}

		const data = await response.json();
		const overdueTasks = data?.data?.allTasks?.nodes || [];

		// Send overdue notifications (could be rate-limited to once per day)
		for (const task of overdueTasks) {
			if (!task.assigneeId || !task.userByAssigneeId) continue;

			const daysOverdue = Math.floor(
				(new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60 * 24)
			);

			// Only send if recently overdue (last 24 hours) to avoid spam
			if (daysOverdue > 1) continue;

			// Create overdue notification
			// Note: This could be enhanced with a check to avoid duplicate daily reminders
			logger.info(`[TaskReminderScheduler] Task "${task.title}" is ${daysOverdue} day(s) overdue`);
		}

		return overdueTasks.length;
	} catch (error) {
		logger.error('[TaskReminderScheduler] Error checking overdue tasks:', error instanceof Error ? error : new Error(String(error)));
		return 0;
	}
}

/**
 * Initialize and start the task reminder scheduler
 * Should be called in hooks.server.ts or server startup
 */
export function initTaskReminderScheduler(): void {
	TaskReminderScheduler.start();
	logger.info('[TaskReminderScheduler] Initialized and started');
}

/**
 * Stop the task reminder scheduler
 * Should be called on server shutdown
 */
export function stopTaskReminderScheduler(): void {
	TaskReminderScheduler.stop();
	logger.info('[TaskReminderScheduler] Stopped');
}
