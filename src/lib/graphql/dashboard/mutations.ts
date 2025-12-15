import { gql } from '@urql/core';

/**
 * Update dashboard preferences
 */
export const UPDATE_DASHBOARD_PREFERENCES = gql`
	mutation UpdateDashboardPreferences($input: UpdateDashboardPreferencesInput!) {
		updateDashboardPreferences(input: $input) {
			preferences {
				id
				userId
				layout
				widgets
				refreshInterval
				theme
				notifications
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Mark notification as read
 */
export const MARK_NOTIFICATION_READ = gql`
	mutation MarkDashboardNotificationRead($input: MarkNotificationReadInput!) {
		markNotificationRead(input: $input) {
			notification {
				id
				isRead
				readAt
			}
			clientMutationId
		}
	}
`;

/**
 * Dismiss notification
 */
export const DISMISS_NOTIFICATION = gql`
	mutation DismissNotification($input: DismissNotificationInput!) {
		dismissNotification(input: $input) {
			notification {
				id
				isDismissed
				dismissedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Create dashboard widget
 */
export const CREATE_DASHBOARD_WIDGET = gql`
	mutation CreateDashboardWidget($input: CreateDashboardWidgetInput!) {
		createDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				createdAt
			}
			clientMutationId
		}
	}
`;

/**
 * Update dashboard widget
 */
export const UPDATE_DASHBOARD_WIDGET = gql`
	mutation UpdateDashboardWidget($input: UpdateDashboardWidgetInput!) {
		updateDashboardWidget(input: $input) {
			widget {
				id
				name
				type
				configuration
				position
				size
				isVisible
				updatedAt
			}
			clientMutationId
		}
	}
`;

/**
 * Delete dashboard widget
 */
export const DELETE_DASHBOARD_WIDGET = gql`
	mutation DeleteDashboardWidget($input: DeleteDashboardWidgetInput!) {
		deleteDashboardWidget(input: $input) {
			widget {
				id
			}
			clientMutationId
		}
	}
`;
