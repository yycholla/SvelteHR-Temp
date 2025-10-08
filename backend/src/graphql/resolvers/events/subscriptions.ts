/**
 * GraphQL Subscription Resolvers for Events
 * Feature: 025-events-flesh-out
 *
 * Implements real-time subscriptions using PostgreSQL LISTEN/NOTIFY.
 */

import type { Pool } from 'pg';

interface Context {
	pgPool: Pool;
	currentUserId?: string;
	pubsub?: any; // PubSub instance for GraphQL subscriptions
}

interface EventUpdatedArgs {
	eventId?: string;
}

interface NotificationReceivedArgs {
	userId?: string;
}

/**
 * Subscription: eventUpdated
 * Subscribes to real-time event updates
 *
 * Triggers when:
 * - Event details change (title, time, location, etc.)
 * - RSVP status changes
 * - Attendees added/removed
 * - Waitlist changes
 * - Comments added
 */
export const eventUpdated = {
	subscribe: async (parent: any, args: EventUpdatedArgs, context: Context) => {
		const { pgPool, currentUserId, pubsub } = context;
		const { eventId } = args;

		if (!currentUserId) {
			throw new Error('Authentication required');
		}

		// If specific eventId provided, check access
		if (eventId) {
			const accessCheck = await pgPool.query(
				`SELECT e.id
				FROM events e
				LEFT JOIN event_attendees ea ON ea.event_id = e.id
				WHERE e.id = $1
					AND (
						e.visibility = 'public'
						OR ea.employee_id = $2
						OR e.created_by = $2
					)`,
				[eventId, currentUserId]
			);

			if (accessCheck.rows.length === 0) {
				throw new Error('Event not found or access denied');
			}
		}

		// Set up PostgreSQL LISTEN channel
		const client = await pgPool.connect();

		try {
			const channelName = eventId ? `event_updated_${eventId}` : 'event_updated';
			await client.query(`LISTEN ${channelName}`);

			// Return AsyncIterator for GraphQL subscription
			return {
				[Symbol.asyncIterator]: async function* () {
					client.on('notification', (msg) => {
						if (msg.channel === channelName) {
							const payload = JSON.parse(msg.payload || '{}');

							// Filter events based on user access
							// (In production, implement more robust access control)
							if (
								payload.visibility === 'public' ||
								payload.attendeeIds?.includes(currentUserId) ||
								payload.createdBy === currentUserId
							) {
								return {
									eventUpdated: payload
								};
							}
						}
					});

					// Keep connection alive
					while (true) {
						yield new Promise((resolve) => {
							client.once('notification', (msg) => {
								if (msg.channel === channelName) {
									const payload = JSON.parse(msg.payload || '{}');
									resolve({ eventUpdated: payload });
								}
							});
						});
					}
				}
			};
		} catch (error) {
			client.release();
			console.error('Error setting up event subscription:', error);
			throw new Error('Failed to subscribe to event updates');
		}
	},

	resolve: (payload: any) => {
		return payload.eventUpdated;
	}
};

/**
 * Subscription: notificationReceived
 * Subscribes to real-time notifications for the current user
 *
 * Triggers when:
 * - Event invitations
 * - RSVP changes
 * - Waitlist promotions
 * - Comment mentions
 * - Reminders
 */
export const notificationReceived = {
	subscribe: async (parent: any, args: NotificationReceivedArgs, context: Context) => {
		const { pgPool, currentUserId, pubsub } = context;
		const { userId } = args;

		if (!currentUserId) {
			throw new Error('Authentication required');
		}

		// Users can only subscribe to their own notifications
		const targetUserId = userId || currentUserId;

		if (targetUserId !== currentUserId) {
			throw new Error('You can only subscribe to your own notifications');
		}

		// Set up PostgreSQL LISTEN channel
		const client = await pgPool.connect();

		try {
			const channelName = `notification_${targetUserId}`;
			await client.query(`LISTEN ${channelName}`);

			// Return AsyncIterator for GraphQL subscription
			return {
				[Symbol.asyncIterator]: async function* () {
					client.on('notification', (msg) => {
						if (msg.channel === channelName) {
							const payload = JSON.parse(msg.payload || '{}');
							return {
								notificationReceived: payload
							};
						}
					});

					// Keep connection alive
					while (true) {
						yield new Promise((resolve) => {
							client.once('notification', (msg) => {
								if (msg.channel === channelName) {
									const payload = JSON.parse(msg.payload || '{}');
									resolve({ notificationReceived: payload });
								}
							});
						});
					}
				}
			};
		} catch (error) {
			client.release();
			console.error('Error setting up notification subscription:', error);
			throw new Error('Failed to subscribe to notifications');
		}
	},

	resolve: (payload: any) => {
		return payload.notificationReceived;
	}
};

/**
 * Helper function to publish event update notification
 * Called by mutation resolvers to trigger subscriptions
 */
export async function publishEventUpdate(pgPool: Pool, eventId: string, updateData: any) {
	try {
		const payload = JSON.stringify({
			eventId,
			timestamp: new Date().toISOString(),
			...updateData
		});

		await pgPool.query(`NOTIFY event_updated_${eventId}, '${payload}'`);
		await pgPool.query(`NOTIFY event_updated, '${payload}'`);
	} catch (error) {
		console.error('Error publishing event update:', error);
		// Don't throw - subscription publishing should not block mutations
	}
}

/**
 * Helper function to publish notification
 * Called by NotificationService to trigger subscriptions
 */
export async function publishNotification(
	pgPool: Pool,
	userId: string,
	notificationData: any
) {
	try {
		const payload = JSON.stringify({
			userId,
			timestamp: new Date().toISOString(),
			...notificationData
		});

		await pgPool.query(`NOTIFY notification_${userId}, '${payload}'`);
	} catch (error) {
		console.error('Error publishing notification:', error);
		// Don't throw - notification publishing should not block operations
	}
}

/**
 * Export all subscription resolvers
 */
export const subscriptionResolvers = {
	eventUpdated,
	notificationReceived
};

/**
 * Export helper functions for mutation resolvers
 */
export { publishEventUpdate, publishNotification };
