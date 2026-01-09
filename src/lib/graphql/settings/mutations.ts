import { gql } from '@urql/svelte';

/**
 * GraphQL Mutations for Settings
 *
 * Updated for Rust backend (async-graphql) schema
 * Note: User preferences (theme, notifications, privacy) are handled client-side via localStorage
 * Only user profile updates use backend mutations
 */

/**
 * Mutation: Update user profile
 * Backend: Uses updateUser from Rust GraphQL schema
 */
export const UPDATE_USER_PROFILE = gql`
	mutation UpdateUserProfile($id: UUID!, $input: UpdateUserInput!) {
		updateUser(id: $id, input: $input) {
			id
			email
			displayName
			firstName
			lastName
			fullName
			phone
			jobTitle
			departmentId
			managerId
			hireDate
			isActive
			status
			department {
				id
				name
				description
			}
			manager {
				id
				fullName
				displayName
			}
			createdAt
			updatedAt
		}
	}
`;

// =============================================================================
// CLIENT-SIDE PREFERENCE MUTATIONS - NOT USING BACKEND
// =============================================================================

/**
 * Note: The following mutations are handled client-side using localStorage
 * See queries.ts for preference management functions:
 * - saveUserPreferences(userId, preferences)
 * - saveNotificationPreferences(userId, preferences)
 * - savePrivacyPreferences(userId, preferences)
 *
 * This approach avoids the need for backend implementation of user preferences
 * and provides instant updates without network latency.
 */

/*
// These mutations would require backend implementation:

export const UPDATE_USER_PREFERENCES = gql`
	mutation UpdateUserPreferences($userId: UUID!, $input: UpdateUserPreferencesInput!) {
		updateUserPreferences(userId: $userId, input: $input) {
			id
			userId
			theme
			language
			timezone
			dateFormat
			timeFormat
			compactView
			sidebarCollapsed
			fontSize
			colorScheme
			updatedAt
		}
	}
`;

export const UPDATE_NOTIFICATION_PREFERENCES = gql`
	mutation UpdateNotificationPreferences($userId: UUID!, $input: UpdateNotificationPreferencesInput!) {
		updateNotificationPreferences(userId: $userId, input: $input) {
			id
			userId
			email
			push
			sms
			leaveReminders
			performanceUpdates
			systemAlerts
			teamUpdates
			eventReminders
			taskReminders
			updatedAt
		}
	}
`;

export const UPDATE_PRIVACY_PREFERENCES = gql`
	mutation UpdatePrivacyPreferences($userId: UUID!, $input: UpdatePrivacyPreferencesInput!) {
		updatePrivacyPreferences(userId: $userId, input: $input) {
			id
			userId
			profileVisibility
			showOnlineStatus
			allowDirectMessages
			dataSharing
			analyticsOptOut
			updatedAt
		}
	}
`;

// Password change mutation - would require backend implementation
export const CHANGE_PASSWORD = gql`
	mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
		changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
			success
			message
		}
	}
`;

// Data export mutation - would require backend implementation
export const EXPORT_USER_DATA = gql`
	mutation ExportUserData($userId: UUID!, $format: String!) {
		exportUserData(userId: $userId, format: $format) {
			downloadUrl
			expiresAt
		}
	}
`;
*/
