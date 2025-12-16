import { gql } from '@urql/svelte';

/**
 * Mutation: Mark notification as read
 * Rust GraphQL Schema: updateNotification(id: UUID!, input: UpdateNotificationInput!)
 */
export const MARK_NOTIFICATION_READ = gql`
	mutation MarkNotificationRead($id: UUID!, $input: UpdateNotificationInput!) {
		updateNotification(id: $id, input: $input) {
			id
			readStatus
			readAt
		}
	}
`;

/**
 * Mutation: Delete notification
 * Rust GraphQL Schema: deleteNotification(id: UUID!)
 */
export const DELETE_NOTIFICATION = gql`
	mutation DeleteNotification($id: UUID!) {
		deleteNotification(id: $id)
	}
`;
