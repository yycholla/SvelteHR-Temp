/**
 * User Preferences GraphQL Operations
 * Handles user settings, preferences, and profile change requests
 */

import { gql } from '@urql/svelte';

// User Preferences interface
export interface UserPreferences {
	id: string;
	userId: string;
	theme: 'light' | 'dark' | 'system';
	emailNotifications: boolean;
	pushNotifications: boolean;
	leaveReminders: boolean;
	performanceUpdates: boolean;
	phone?: string;
	// Address fields
	address?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	country?: string;
	// Emergency contact fields
	emergencyContactFirstName?: string;
	emergencyContactLastName?: string;
	emergencyContactPhone?: string;
	emergencyContactEmail?: string;
	emergencyContactRelation?: string;
	// Pending changes (legacy)
	pendingFirstName?: string;
	pendingLastName?: string;
	pendingEmail?: string;
	pendingPhone?: string;
	pendingAddress?: string;
	pendingCity?: string;
	pendingState?: string;
	pendingZipCode?: string;
	pendingCountry?: string;
	pendingEmergencyContactFirstName?: string;
	pendingEmergencyContactLastName?: string;
	pendingEmergencyContactPhone?: string;
	pendingEmergencyContactEmail?: string;
	pendingEmergencyContactRelation?: string;
	pendingChangesRequestedAt?: string;
	pendingChangesApprovedBy?: string;
	pendingChangesApprovedAt?: string;
	pendingChangesRejectedAt?: string;
	pendingChangesRejectionReason?: string;
	customPreferences?: Record<string, any>;
	createdAt: string;
	updatedAt: string;
}

// GraphQL Fragments
export const USER_PREFERENCES_FRAGMENT = gql`
	fragment UserPreferencesFields on UserPreference {
		id
		userId
		theme
		emailNotifications
		pushNotifications
		leaveReminders
		performanceUpdates
		phone
		address
		city
		state
		zipCode
		country
		emergencyContactFirstName
		emergencyContactLastName
		emergencyContactPhone
		emergencyContactEmail
		emergencyContactRelation
		pendingFirstName
		pendingLastName
		pendingEmail
		pendingPhone
		pendingAddress
		pendingCity
		pendingState
		pendingZipCode
		pendingCountry
		pendingEmergencyContactFirstName
		pendingEmergencyContactLastName
		pendingEmergencyContactPhone
		pendingEmergencyContactEmail
		pendingEmergencyContactRelation
		pendingChangesRequestedAt
		pendingChangesApprovedBy
		pendingChangesApprovedAt
		pendingChangesRejectedAt
		pendingChangesRejectionReason
		customPreferences
		createdAt
		updatedAt
	}
`;

// Query to get user preferences using PostGraphile's generated queries
export const GET_USER_PREFERENCES_QUERY = gql`
	query GetUserPreferences($userId: UUID!) {
		allUserPreferences(condition: { userId: $userId }) {
			nodes {
				...UserPreferencesFields
			}
		}
	}
	${USER_PREFERENCES_FRAGMENT}
`;

// Mutation to get or create user preferences (uses our custom function)
export const GET_OR_CREATE_USER_PREFERENCES_MUTATION = gql`
	mutation GetOrCreateUserPreferences($userId: UUID!) {
		getUserPreferences(input: { targetUserId: $userId }) {
			userPreference {
				...UserPreferencesFields
			}
		}
	}
	${USER_PREFERENCES_FRAGMENT}
`;

// Mutation to update user preferences
export const UPDATE_USER_PREFERENCES_MUTATION = gql`
	mutation UpdateUserPreferences(
		$userId: UUID!
		$theme: String
		$emailNotifications: Boolean
		$pushNotifications: Boolean
		$leaveReminders: Boolean
		$performanceUpdates: Boolean
		$phone: String
		$customPreferences: JSON
	) {
		updateUserPreferences(
			input: {
				targetUserId: $userId
				newTheme: $theme
				newEmailNotifications: $emailNotifications
				newPushNotifications: $pushNotifications
				newLeaveReminders: $leaveReminders
				newPerformanceUpdates: $performanceUpdates
				newPhone: $phone
				newCustomPreferences: $customPreferences
			}
		) {
			userPreference {
				...UserPreferencesFields
			}
		}
	}
	${USER_PREFERENCES_FRAGMENT}
`;

// Mutation to request profile changes
export const REQUEST_PROFILE_CHANGES_MUTATION = gql`
	mutation RequestProfileChanges(
		$userId: UUID!
		$firstName: String
		$lastName: String
		$email: String
		$phone: String
	) {
		requestProfileChanges(
			input: {
				targetUserId: $userId
				newFirstName: $firstName
				newLastName: $lastName
				newEmail: $email
				newPhone: $phone
			}
		) {
			userPreference {
				...UserPreferencesFields
			}
		}
	}
	${USER_PREFERENCES_FRAGMENT}
`;

// Mutation to approve/reject profile changes (HR/Admin only)
export const APPROVE_PROFILE_CHANGES_MUTATION = gql`
	mutation ApproveProfileChanges($userId: UUID!, $approve: Boolean!, $rejectionReason: String) {
		approveProfileChanges(
			input: { targetUserId: $userId, approve: $approve, rejectionReason: $rejectionReason }
		) {
			userPreference {
				...UserPreferencesFields
			}
		}
	}
	${USER_PREFERENCES_FRAGMENT}
`;

// Query to get all pending profile change requests (HR/Admin only)
export const GET_PENDING_PROFILE_CHANGES_QUERY = gql`
	query GetPendingProfileChanges {
		allUserPreferences(
			filter: { pendingChangesRequestedAt: { isNull: false } }
			orderBy: PENDING_CHANGES_REQUESTED_AT_DESC
		) {
			nodes {
				...UserPreferencesFields
				userByUserId {
					id
					email
					displayName
				}
			}
		}
	}
	${USER_PREFERENCES_FRAGMENT}
`;

// Helper functions for working with preferences
export class UserPreferencesService {
	/**
	 * Get default preferences for a new user
	 */
	static getDefaultPreferences(): Partial<UserPreferences> {
		return {
			theme: 'system',
			emailNotifications: true,
			pushNotifications: false,
			leaveReminders: true,
			performanceUpdates: true,
			customPreferences: {}
		};
	}

	/**
	 * Check if user has pending profile changes
	 */
	static hasPendingChanges(preferences: UserPreferences): boolean {
		return !!preferences.pendingChangesRequestedAt;
	}

	/**
	 * Check if pending changes were approved
	 */
	static changesWereApproved(preferences: UserPreferences): boolean {
		return !!preferences.pendingChangesApprovedAt;
	}

	/**
	 * Check if pending changes were rejected
	 */
	static changesWereRejected(preferences: UserPreferences): boolean {
		return !!preferences.pendingChangesRejectedAt;
	}

	/**
	 * Get pending changes summary
	 */
	static getPendingChangesSummary(preferences: UserPreferences): string[] {
		const changes: string[] = [];

		if (preferences.pendingFirstName) {
			changes.push(`First name: ${preferences.pendingFirstName}`);
		}
		if (preferences.pendingLastName) {
			changes.push(`Last name: ${preferences.pendingLastName}`);
		}
		if (preferences.pendingEmail) {
			changes.push(`Email: ${preferences.pendingEmail}`);
		}
		if (preferences.pendingPhone) {
			changes.push(`Phone: ${preferences.pendingPhone}`);
		}

		return changes;
	}

	/**
	 * Format theme display name
	 */
	static formatThemeDisplayName(theme: string): string {
		switch (theme) {
			case 'light':
				return 'Light Mode';
			case 'dark':
				return 'Dark Mode';
			case 'system':
				return 'System Default';
			default:
				return 'Unknown';
		}
	}
}

// Export commonly used operations
export const getUserPreferences = GET_USER_PREFERENCES_QUERY;
export const updateUserPreferences = UPDATE_USER_PREFERENCES_MUTATION;
export const requestProfileChanges = REQUEST_PROFILE_CHANGES_MUTATION;
export const approveProfileChanges = APPROVE_PROFILE_CHANGES_MUTATION;
export const getPendingProfileChanges = GET_PENDING_PROFILE_CHANGES_QUERY;
