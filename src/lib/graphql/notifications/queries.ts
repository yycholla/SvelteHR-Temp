import { gql } from '@urql/svelte';

/**
 * Query: Get user notifications (unread + recent read)
 * RLS Policy: notification_recipient_access (user sees only their own notifications)
 * PostGraphile: Uses allNotifications and NotificationCondition
 */
export const GET_USER_NOTIFICATIONS = gql`
	query GetUserNotifications(
		$first: Int = 50
		$offset: Int = 0
		$orderBy: [NotificationsOrderBy!] = [CREATED_AT_DESC]
		$condition: NotificationCondition
	) {
		allNotifications(first: $first, offset: $offset, orderBy: $orderBy, condition: $condition) {
			nodes {
				id
				recipientId
				type
				category
				title
				message
				relatedResourceType
				relatedResourceId
				readStatus
				deliveredAt
				readAt
				createdAt
			}
			totalCount
			pageInfo {
				hasNextPage
				hasPreviousPage
			}
		}
	}
`;

/**
 * Query: Get unread notification count
 * PostGraphile: Uses condition with direct values
 */
export const GET_UNREAD_COUNT = gql`
	query GetUnreadCount($condition: NotificationCondition) {
		allNotifications(condition: $condition) {
			totalCount
		}
	}
`;

/**
 * Query: Get single notification by ID
 * PostGraphile: Uses notificationById(id)
 */
export const GET_NOTIFICATION_BY_ID = gql`
	query GetNotificationById($id: UUID!) {
		notificationById(id: $id) {
			id
			recipientId
			type
			category
			title
			message
			relatedResourceType
			relatedResourceId
			readStatus
			deliveredAt
			readAt
			createdAt
		}
	}
`;
