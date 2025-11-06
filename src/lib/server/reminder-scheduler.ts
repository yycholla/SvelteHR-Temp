/**
 * Event Reminder Scheduler Service
 * Feature: 026-integrate-ui-components
 * Updated: Migrated to Rust GraphQL backend
 *
 * Background service that runs periodically to check for event reminders
 * that need to be sent and creates notifications for users.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { withExponentialBackoff } from './backend-health';

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
	private static cronTask: ScheduledTask | null = null;
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
	 * Query database for pending reminders using Rust GraphQL backend
	 * Finds events where: NOW() >= (start_time - reminder_time * interval '1 minute')
	 * AND NOW() < start_time (event hasn't started yet)
	 */
	private static async getPendingReminders(): Promise<PendingReminder[]> {
		try {
			// Get service authentication key from environment
			const serviceKey = process.env.SERVICE_AUTH_KEY || 'fallback-dev-key';

			// Get GraphQL endpoint
			const graphqlEndpoint = process.env.VITE_API_URL
				? `${process.env.VITE_API_URL}/graphql`
				: 'http://localhost:4000/graphql';

			// Fetch with exponential backoff to handle backend startup delays
			const data = await withExponentialBackoff(
				async () => {
					// Fetch all attendees with reminders set using Rust GraphQL
					// NOTE: Updated to match Rust GraphQL schema (idiomatic naming)
					// NOTE: Rust doesn't have a direct "pending reminders" query, so we fetch all attendees with reminders
					const response = await fetch(graphqlEndpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${serviceKey}`
						},
						body: JSON.stringify({
							query: `
								query GetEventAttendeesWithReminders($reminderTimeIsNull: Boolean, $limit: Int) {
									eventAttendees(
										reminderTimeIsNull: $reminderTimeIsNull
										limit: $limit
									) {
										id
										employeeId
										eventId
										reminderTime
										responseStatus
										event {
											id
											title
											startTime
											endTime
											status
										}
										employee {
											id
											displayName
											email
										}
									}
								}
							`,
							variables: {
								reminderTimeIsNull: false,
								limit: 1000
							}
						})
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}

					return await response.json();
				},
				{
					maxRetries: 5,
					initialDelay: 2000,
					maxDelay: 30000
				}
			);

			if (data.errors) {
				console.error('[ReminderScheduler] GraphQL errors:', data.errors);
				return [];
			}

			const attendees = data?.data?.eventAttendees || [];

			// Filter and map to PendingReminder format
			const pendingReminders: PendingReminder[] = attendees
				.filter((attendee: any) => {
					// Skip if no reminder time set
					if (!attendee.reminderTime || attendee.reminderTime === null) return false;

					const event = attendee.event;
					if (!event) return false;

					const now = new Date();
					const eventStart = new Date(event.startTime);

					// Skip if event has already started
					if (now >= eventStart) return false;

					// Skip if event is cancelled or completed
					// NOTE: Rust Event status enum values are lowercase: "draft", "scheduled", "in_progress", "completed", "cancelled"
					if (event.status === 'cancelled' || event.status === 'completed') return false;

					return true;
				})
				.map((attendee: any) => ({
					attendeeId: attendee.id,
					userId: attendee.employeeId,
					eventId: attendee.eventId,
					eventTitle: attendee.event.title,
					eventStartTime: new Date(attendee.event.startTime),
					reminderTime: attendee.reminderTime,
					userEmail: attendee.employee.email,
					userName: attendee.employee.displayName
				}));

			return pendingReminders;
		} catch (error) {
			console.error('[ReminderScheduler] Error fetching pending reminders:', error);
			// Return empty array instead of throwing - scheduler will try again next minute
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
	 * Create a notification record in the database using Rust GraphQL backend
	 */
	private static async createNotificationRecord(options: {
		userId: string;
		eventId: string;
		type: string;
		message: string;
	}): Promise<void> {
		try {
			// Get service authentication key from environment
			const serviceKey = process.env.SERVICE_AUTH_KEY || 'fallback-dev-key';

			// Get GraphQL endpoint
			const graphqlEndpoint = process.env.VITE_API_URL
				? `${process.env.VITE_API_URL}/graphql`
				: 'http://localhost:4000/graphql';

			// Create notification with retry logic
			const data = await withExponentialBackoff(
				async () => {
					// Create the notification using Rust GraphQL
					// NOTE: Updated to match Rust GraphQL schema (idiomatic naming)
					// NOTE: Rust uses lowercase enum values for notification types
					const response = await fetch(graphqlEndpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `Bearer ${serviceKey}`
						},
						body: JSON.stringify({
							query: `
								mutation CreateEventReminder($input: CreateNotificationInput!) {
									createNotification(input: $input) {
										notification {
											id
											recipientId
											type
											category
											title
											message
										}
									}
								}
							`,
							variables: {
								input: {
									notification: {
										recipientId: options.userId,
										type: 'event_reminder',
										category: 'event',
										title: 'Event Reminder',
										message: options.message,
										relatedResourceType: 'event',
										relatedResourceId: options.eventId,
										readStatus: false
									}
								}
							}
						})
					});

					if (!response.ok) {
						throw new Error(`HTTP ${response.status}: ${response.statusText}`);
					}

					return await response.json();
				},
				{
					maxRetries: 3,
					initialDelay: 1000,
					maxDelay: 10000
				}
			);

			if (data.errors) {
				console.error('[ReminderScheduler] GraphQL errors:', data.errors);
				throw new Error(data.errors[0]?.message || 'Failed to create notification');
			}

			const notificationId = data?.data?.createNotification?.notification?.id;
			console.log('[ReminderScheduler] Created notification:', notificationId);
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
