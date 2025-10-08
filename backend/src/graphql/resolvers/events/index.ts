/**
 * Events GraphQL Resolvers - Main Export
 * Feature: 025-events-flesh-out
 *
 * Aggregates all query, mutation, and subscription resolvers for events.
 */

import { queryResolvers } from './queries';
import { mutationResolvers } from './mutations';
import { imageMutationResolvers } from './images';
import { subscriptionResolvers } from './subscriptions';

/**
 * Combined GraphQL Resolvers for Events
 */
export const eventsResolvers = {
	Query: {
		// Query resolvers (T026-T029)
		events: queryResolvers.events,
		myEvents: queryResolvers.myEvents,
		recurringEventInstances: queryResolvers.recurringEventInstances,
		conflictingEvents: queryResolvers.conflictingEvents
	},

	Mutation: {
		// Event CRUD mutations (T030-T031)
		createEvent: mutationResolvers.createEvent,
		createRecurringEvent: mutationResolvers.createRecurringEvent,

		// RSVP mutations (T032)
		updateRsvpStatus: mutationResolvers.updateRsvpStatus,

		// Waitlist mutations (T033)
		joinWaitlist: mutationResolvers.joinWaitlist,
		leaveWaitlist: mutationResolvers.leaveWaitlist,

		// Attendee management (T034)
		addAttendees: mutationResolvers.addAttendees,

		// Comment mutations (T035-T036)
		createEventComment: mutationResolvers.createEventComment,
		updateEventComment: mutationResolvers.updateEventComment,
		deleteEventComment: mutationResolvers.deleteEventComment,

		// Image upload mutations (T037)
		uploadEventImage: imageMutationResolvers.uploadEventImage,
		deleteEventImage: imageMutationResolvers.deleteEventImage
	},

	Subscription: {
		// Real-time subscriptions (T038-T039)
		eventUpdated: subscriptionResolvers.eventUpdated,
		notificationReceived: subscriptionResolvers.notificationReceived
	}
};

/**
 * Export individual resolver groups for testing
 */
export { queryResolvers, mutationResolvers, imageMutationResolvers, subscriptionResolvers };

/**
 * Export helper functions for publishing subscription events
 */
export { publishEventUpdate, publishNotification } from './subscriptions';
