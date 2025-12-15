import { gql } from '@urql/svelte';

// Query: Get current user profile and settings
export const GET_USER_SETTINGS = gql`
	query GetUserSettings {
		me {
			id
			email
			displayName
			firstName
			lastName
			phone
			jobTitle
			themePreference
			department {
				id
				name
			}
		}
		systemSettings {
			id
			category
			settings
		}
	}
`;

// Query: Get notification settings from system settings
export const GET_NOTIFICATION_SETTINGS = gql`
	query GetNotificationSettings {
		systemSettingsByCategory(category: "notifications") {
			id
			category
			settings
		}
	}
`;
