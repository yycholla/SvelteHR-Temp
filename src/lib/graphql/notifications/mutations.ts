import { gql } from '@urql/svelte';

/**
 * Mutation: Mark notification as read
 */
export const MARK_NOTIFICATION_READ = gql`
	mutation MarkNotificationRead($input: UpdateNotificationInput!) {
		updateNotification(input: $input) {
			notification {
				id
				readStatus
				readAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mutation: Mark all user notifications as read
 * PostGraphile: Uses updateNotificationsByCondition with direct condition values
 */
export const MARK_ALL_READ = gql`
	mutation MarkAllRead($condition: NotificationCondition!, $patch: NotificationPatch!) {
		updateNotifications(condition: $condition, patch: $patch) {
			notifications {
				id
				readStatus
				readAt
			}
		}
	}
`;

/**
 * Mutation: Delete notification
 */
export const DELETE_NOTIFICATION = gql`
	mutation DeleteNotification($input: DeleteNotificationInput!) {
		deleteNotification(input: $input) {
			deletedNotificationId
			clientMutationId
		}
	}
`;
