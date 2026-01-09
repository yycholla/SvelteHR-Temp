import { gql } from '@urql/svelte';

/**
 * GraphQL Mutations for Notifications
 *
 * Updated for Rust backend (async-graphql) schema
 */

/**
 * Mutation: Mark notification as read
 * Backend: Uses updateNotification from Rust GraphQL schema
 */
export const MARK_NOTIFICATION_READ = gql`
	mutation MarkNotificationRead($id: UUID!, $input: UpdateNotificationInput!) {
		updateNotification(id: $id, input: $input) {
			id
			isRead
			readAt
		}
	}
`;

/**
 * Mutation: Mark notification as unread
 * Backend: Uses updateNotification from Rust GraphQL schema
 */
export const MARK_NOTIFICATION_UNREAD = gql`
	mutation MarkNotificationUnread($id: UUID!, $input: UpdateNotificationInput!) {
		updateNotification(id: $id, input: $input) {
			id
			isRead
			readAt
		}
	}
`;

/**
 * Mutation: Mark all notifications as read
 * Backend: Uses updateNotification from Rust GraphQL schema
 * Note: This mutation needs to be called for each notification individually
 */
export const MARK_ALL_NOTIFICATIONS_READ = gql`
	mutation MarkAllNotificationsRead($id: UUID!, $input: UpdateNotificationInput!) {
		updateNotification(id: $id, input: $input) {
			id
			isRead
			readAt
		}
	}
`;

/**
 * Mutation: Delete notification
 * Backend: Uses deleteNotification from Rust GraphQL schema
 */
export const DELETE_NOTIFICATION = gql`
	mutation DeleteNotification($id: UUID!) {
		deleteNotification(id: $id)
	}
`;

/**
 * Mutation: Create notification
 * Backend: Uses createNotification from Rust GraphQL schema
 */
export const CREATE_NOTIFICATION = gql`
	mutation CreateNotification($input: CreateNotificationInput!) {
		createNotification(input: $input) {
			id
			userId
			title
			message
			type
			priority
			isRead
			actionUrl
			createdAt
		}
	}
`;
