/**
 * Event Reminder Scheduler Service
 * Feature: 026-integrate-ui-components
 *
 * Background service that runs periodically to check for event reminders
 * that need to be sent and creates notifications for users.
 */

import cron from 'node-cron';
import { EventsOperations } from '$lib/graphql/events-operations';
import { createUrqlClient } from '$lib/graphql/client';
import type { UserCredentials } from '$lib/models/data-request';

export interface PendingReminder {
	attendeeId: string;
	userId: string;
	eventId: string;
	eventTitle: string;
	eventStartTime: Date;
	reminderTime: number; // Minutes before event
	userEmail: string;
	userName: string;
}

/**
 * Reminder Scheduler Service
 * Runs every minute to check for pending event reminders
 */
export class ReminderScheduler {
	private static cronTask: cron.ScheduledTask | null = null;
	private static isRunning = false;
	private static processedReminders = new Set<string>(); // Track sent reminders

	/**
	 * Start the reminder scheduler
	 * Runs every minute to check for pending reminders
	 */
	static start(): void {
		if (this.cronTask) {
			console.log('[ReminderScheduler] Already running');
			return;
		}

		console.log('[ReminderScheduler] Starting event reminder scheduler');

		// Run every minute
		this.cronTask = cron.schedule('* * * * *', async () => {
			await this.checkAndSendReminders();
		});

		// Run once immediately on startup
		this.checkAndSendReminders();
	}

	/**
	 * Stop the reminder scheduler
	 */
	static stop(): void {
		if (this.cronTask) {
			this.cronTask.stop();
			this.cronTask = null;
			console.log('[ReminderScheduler] Stopped');
		}
	}

	/**
	 * Check for pending reminders and send notifications
	 */
	private static async checkAndSendReminders(): Promise<void> {
		if (this.isRunning) {
			console.log('[ReminderScheduler] Previous check still running, skipping...');
			return;
		}

		this.isRunning = true;

		try {
			const pendingReminders = await this.getPendingReminders();

			if (pendingReminders.length === 0) {
				console.log('[ReminderScheduler] No pending reminders');
				return;
			}

			console.log(`[ReminderScheduler] Found ${pendingReminders.length} pending reminders`);

			for (const reminder of pendingReminders) {
				await this.sendReminder(reminder);
			}
		} catch (error) {
			console.error('[ReminderScheduler] Error checking reminders:', error);
		} finally {
			this.isRunning = false;
		}
	}

	/**
	 * Query database for pending reminders
	 * Finds events where: NOW() >= (start_time - reminder_time * interval '1 minute')
	 * AND NOW() < start_time (event hasn't started yet)
	 */
	private static async getPendingReminders(): Promise<PendingReminder[]> {
		try {
			// Create GraphQL client and operations instance
			const client = createUrqlClient();
			const eventsOps = new EventsOperations(client);

			// Use system user credentials for scheduler
			// Note: GraphQL endpoint currently doesn't require JWT authentication
			const systemCredentials: UserCredentials = {
				token: 'scheduler-service',
				userId: 'system-scheduler',
				roles: ['system'],
				jwtToken: 'scheduler-service-token', // Dummy JWT - GraphQL endpoint doesn't enforce it yet
				permissions: [],
				isAuthenticated: true
			};

			// Fetch all attendees with reminders set
			const attendees = await eventsOps.getPendingReminders({
				userCredentials: systemCredentials
			});

			// Filter and map to PendingReminder format
			const pendingReminders: PendingReminder[] = attendees
				.filter((attendee: any) => {
				// Skip if no reminder time set
				if (!attendee.reminderTime || attendee.reminderTime === null) return false;

					const event = attendee.eventByEventId;
					if (!event) return false;

					const now = new Date();
					const eventStart = new Date(event.startTime);

					// Skip if event has already started
					if (now >= eventStart) return false;

					// Skip if event is cancelled
					if (event.status === 'cancelled') return false;

					return true;
				})
				.map((attendee: any) => ({
					attendeeId: attendee.id,
					userId: attendee.employeeId,
					eventId: attendee.eventId,
					eventTitle: attendee.eventByEventId.title,
					eventStartTime: new Date(attendee.eventByEventId.startTime),
					reminderTime: attendee.reminderTime,
					userEmail: attendee.userByEmployeeId.email,
					userName: attendee.userByEmployeeId.displayName
				}));

			return pendingReminders;
		} catch (error) {
			console.error('[ReminderScheduler] Error fetching pending reminders:', error);
			return [];
		}
	}

	/**
	 * Send a reminder notification
	 */
	private static async sendReminder(reminder: PendingReminder): Promise<void> {
		try {
			// Create unique key for this reminder to avoid duplicates
			const reminderKey = `${reminder.attendeeId}-${reminder.eventId}-${reminder.reminderTime}`;

			// Check if we've already sent this reminder
			if (this.processedReminders.has(reminderKey)) {
				return;
			}

			// Check if it's time to send this reminder
			const now = new Date();
			const eventStart = new Date(reminder.eventStartTime);
			const reminderMinutes = reminder.reminderTime;
			const sendTime = new Date(eventStart.getTime() - reminderMinutes * 60 * 1000);

			// Only send if:
			// 1. Current time >= send time
			// 2. Event hasn't started yet
			// 3. Send time is within the last 2 minutes (to avoid sending old reminders)
			const timeDiff = now.getTime() - sendTime.getTime();
			const twoMinutesMs = 2 * 60 * 1000;

			if (timeDiff < 0 || timeDiff > twoMinutesMs || now >= eventStart) {
				return;
			}

			// Format time description
			const timeDescription = this.formatReminderTime(reminderMinutes);

			// Create notification record in database
			await this.createNotificationRecord({
				userId: reminder.userId,
				eventId: reminder.eventId,
				type: 'reminder',
				message: `Reminder: "${reminder.eventTitle}" starts in ${timeDescription}`
			});

			// Mark as processed
			this.processedReminders.add(reminderKey);

			// Clean up old processed reminders (keep only last 1000)
			if (this.processedReminders.size > 1000) {
				const entries = Array.from(this.processedReminders);
				this.processedReminders = new Set(entries.slice(-1000));
			}

			console.log(
				`[ReminderScheduler] Sent reminder to ${reminder.userName} for event "${reminder.eventTitle}"`
			);
		} catch (error) {
			console.error('[ReminderScheduler] Error sending reminder:', error);
		}
	}

	/**
	 * Create a notification record in the database
	 */
	private static async createNotificationRecord(options: {
		userId: string;
		eventId: string;
		type: string;
		message: string;
	}): Promise<void> {
		try {
			// Create GraphQL client and operations instance
			const client = createUrqlClient();
			const eventsOps = new EventsOperations(client);

			// Use system user credentials for scheduler
			// Note: GraphQL endpoint currently doesn't require JWT authentication
			const systemCredentials: UserCredentials = {
				token: 'scheduler-service',
				userId: 'system-scheduler',
				roles: ['system'],
				jwtToken: 'scheduler-service-token', // Dummy JWT - GraphQL endpoint doesn't enforce it yet
				permissions: [],
				isAuthenticated: true
			};

			// Create the notification
			const result = await eventsOps.createEventNotification({
				userId: options.userId,
				eventId: options.eventId,
				type: options.type,
				message: options.message,
				userCredentials: systemCredentials
			});

			if (!result.success) {
				throw new Error(result.error || 'Failed to create notification');
			}

			console.log('[ReminderScheduler] Created notification:', result.notificationId);
		} catch (error) {
			console.error('[ReminderScheduler] Error creating notification:', error);
			throw error;
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
}
