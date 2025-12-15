import { gql } from '@urql/svelte';

// Mutation: Update user profile
export const UPDATE_USER_PROFILE = gql`
	mutation UpdateUserProfile($id: UUID!, $input: UpdateUserInput!) {
		users {
			updateUser(id: $id, input: $input) {
				id
				email
				displayName
				firstName
				lastName
				phone
				jobTitle
				themePreference
			}
		}
	}
`;

// Mutation: Update user preferences (theme)
export const UPDATE_USER_PREFERENCES = gql`
	mutation UpdateUserPreferences($id: UUID!, $input: UpdateUserInput!) {
		users {
			updateUser(id: $id, input: $input) {
				id
				themePreference
			}
		}
	}
`;

// Mutation: Update system settings
export const UPDATE_SYSTEM_SETTINGS = gql`
	mutation UpdateSystemSettings($input: UpdateSystemSettingsInput!) {
		updateSystemSettings(input: $input) {
			id
			category
			settings
		}
	}
`;

// Mutation: Update notification settings
export const UPDATE_NOTIFICATION_SETTINGS = gql`
	mutation UpdateNotificationSettings($input: UpdateSystemSettingsInput!) {
		updateSystemSettings(input: $input) {
			id
			category
			settings
		}
	}
`;

// Mutation: Update privacy settings
export const UPDATE_PRIVACY_SETTINGS = gql`
	mutation UpdatePrivacySettings($input: UpdateSystemSettingsInput!) {
		updateSystemSettings(input: $input) {
			id
			category
			settings
		}
	}
`;

// Mutation: Update appearance settings
export const UPDATE_APPEARANCE_SETTINGS = gql`
	mutation UpdateAppearanceSettings($input: UpdateSystemSettingsInput!) {
		updateSystemSettings(input: $input) {
			id
			category
			settings
		}
	}
`;

// Mutation: Change password (placeholder - may not be implemented in Rust backend yet)
export const CHANGE_PASSWORD = gql`
	mutation ChangePassword($input: UpdateSystemSettingsInput!) {
		updateSystemSettings(input: $input) {
			id
			category
			settings
		}
	}
`;

// Mutation: Export user data (placeholder - may not be implemented in Rust backend yet)
export const EXPORT_USER_DATA = gql`
	mutation ExportUserData($input: UpdateSystemSettingsInput!) {
		updateSystemSettings(input: $input) {
			id
			category
			settings
		}
	}
`;
