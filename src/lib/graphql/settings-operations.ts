// GraphQL Operations: User Settings Management
// Created: 2024-12-18
// Task: T041 - User settings and preferences GraphQL operations for /settings

import { gql } from '@urql/svelte';
import type {
	User,
	UserProfile,
	UserPreferences,
	NotificationSettings,
	PrivacySettings,
	AppearanceSettings
} from '$lib/types/graphql';

// Query: Get user profile and settings
export const GET_USER_SETTINGS = gql`
	query GetUserSettings($userId: UUID!) {
		user(id: $userId) {
			id
			email
			displayName
			firstName
			lastName
			phoneNumber
			jobTitle
			department {
				id
				name
			}
			profile {
				id
				bio
				avatar
				timezone
				locale
				dateFormat
				timeFormat
			}
			preferences {
				id
				theme
				compactView
				language
				notifications {
					email
					push
					sms
					leaveReminders
					performanceUpdates
					systemAlerts
					teamUpdates
				}
				privacy {
					profileVisibility
					showOnlineStatus
					allowDirectMessages
					dataSharing
					analyticsOptOut
				}
				appearance {
					darkMode
					fontSize
					colorScheme
					sidebarCollapsed
				}
			}
			createdAt
			updatedAt
		}
	}
`;

// Query: Get notification preferences
export const GET_NOTIFICATION_SETTINGS = gql`
	query GetNotificationSettings($userId: UUID!) {
		user(id: $userId) {
			id
			preferences {
				notifications {
					email
					push
					sms
					leaveReminders
					performanceUpdates
					systemAlerts
					teamUpdates
				}
			}
		}
	}
`;

// Mutation: Update user profile
export const UPDATE_USER_PROFILE = gql`
	mutation UpdateUserProfile($input: UpdateUserProfileInput!) {
		updateUserProfile(input: $input) {
			user {
				id
				email
				displayName
				firstName
				lastName
				phoneNumber
				jobTitle
				profile {
					bio
					avatar
					timezone
					locale
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update user preferences
export const UPDATE_USER_PREFERENCES = gql`
	mutation UpdateUserPreferences($input: UpdateUserPreferencesInput!) {
		updateUserPreferences(input: $input) {
			userPreferences {
				id
				theme
				compactView
				language
				notifications {
					email
					push
					sms
					leaveReminders
					performanceUpdates
					systemAlerts
					teamUpdates
				}
				privacy {
					profileVisibility
					showOnlineStatus
					allowDirectMessages
					dataSharing
					analyticsOptOut
				}
				appearance {
					darkMode
					fontSize
					colorScheme
					sidebarCollapsed
				}
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update notification settings
export const UPDATE_NOTIFICATION_SETTINGS = gql`
	mutation UpdateNotificationSettings($input: UpdateNotificationSettingsInput!) {
		updateNotificationSettings(input: $input) {
			notificationSettings {
				email
				push
				sms
				leaveReminders
				performanceUpdates
				systemAlerts
				teamUpdates
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update privacy settings
export const UPDATE_PRIVACY_SETTINGS = gql`
	mutation UpdatePrivacySettings($input: UpdatePrivacySettingsInput!) {
		updatePrivacySettings(input: $input) {
			privacySettings {
				profileVisibility
				showOnlineStatus
				allowDirectMessages
				dataSharing
				analyticsOptOut
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Update appearance settings
export const UPDATE_APPEARANCE_SETTINGS = gql`
	mutation UpdateAppearanceSettings($input: UpdateAppearanceSettingsInput!) {
		updateAppearanceSettings(input: $input) {
			appearanceSettings {
				darkMode
				fontSize
				colorScheme
				sidebarCollapsed
				updatedAt
			}
			clientMutationId
		}
	}
`;

// Mutation: Change password
export const CHANGE_PASSWORD = gql`
	mutation ChangePassword($input: ChangePasswordInput!) {
		changePassword(input: $input) {
			success
			message
			clientMutationId
		}
	}
`;

// Mutation: Export user data
export const EXPORT_USER_DATA = gql`
	mutation ExportUserData($input: ExportUserDataInput!) {
		exportUserData(input: $input) {
			exportUrl
			expiresAt
			clientMutationId
		}
	}
`;

// TypeScript interfaces for inputs
export interface UpdateUserProfileInput {
	clientMutationId?: string;
	userId: string;
	profile: {
		firstName?: string;
		lastName?: string;
		displayName?: string;
		phoneNumber?: string;
		bio?: string;
		timezone?: string;
		locale?: string;
		dateFormat?: string;
		timeFormat?: string;
	};
}

export interface UpdateUserPreferencesInput {
	clientMutationId?: string;
	userId: string;
	preferences: {
		theme?: string;
		compactView?: boolean;
		language?: string;
		notifications?: NotificationSettingsInput;
		privacy?: PrivacySettingsInput;
		appearance?: AppearanceSettingsInput;
	};
}

export interface NotificationSettingsInput {
	email?: boolean;
	push?: boolean;
	sms?: boolean;
	leaveReminders?: boolean;
	performanceUpdates?: boolean;
	systemAlerts?: boolean;
	teamUpdates?: boolean;
}

export interface PrivacySettingsInput {
	profileVisibility?: 'public' | 'team' | 'managers' | 'private';
	showOnlineStatus?: boolean;
	allowDirectMessages?: boolean;
	dataSharing?: boolean;
	analyticsOptOut?: boolean;
}

export interface AppearanceSettingsInput {
	darkMode?: boolean;
	fontSize?: 'small' | 'medium' | 'large';
	colorScheme?: 'blue' | 'green' | 'purple' | 'orange';
	sidebarCollapsed?: boolean;
}

export interface ChangePasswordInput {
	clientMutationId?: string;
	userId: string;
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface ExportUserDataInput {
	clientMutationId?: string;
	userId: string;
	dataTypes: string[];
	format: 'json' | 'csv' | 'pdf';
}

// Utility constants
export const profileVisibilityOptions = [
	{ value: 'public', label: 'Everyone', description: 'Visible to all users in the organization' },
	{ value: 'team', label: 'Team Members Only', description: 'Visible to your direct team members' },
	{ value: 'managers', label: 'Managers Only', description: 'Visible only to managers and HR' },
	{ value: 'private', label: 'Private', description: 'Visible only to HR administrators' }
];

export const languageOptions = [
	{ value: 'en', label: 'English', flag: '🇺🇸' },
	{ value: 'es', label: 'Español', flag: '🇪🇸' },
	{ value: 'fr', label: 'Français', flag: '🇫🇷' },
	{ value: 'de', label: 'Deutsch', flag: '🇩🇪' },
	{ value: 'it', label: 'Italiano', flag: '🇮🇹' },
	{ value: 'pt', label: 'Português', flag: '🇵🇹' },
	{ value: 'ja', label: '日本語', flag: '🇯🇵' },
	{ value: 'ko', label: '한국어', flag: '🇰🇷' }
];

export const timezoneOptions = [
	{ value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
	{ value: 'America/Chicago', label: 'Central Time (CT)', offset: '-06:00' },
	{ value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-07:00' },
	{ value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00' },
	{ value: 'Europe/London', label: 'Greenwich Mean Time (GMT)', offset: '+00:00' },
	{ value: 'Europe/Paris', label: 'Central European Time (CET)', offset: '+01:00' },
	{ value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)', offset: '+09:00' },
	{ value: 'Asia/Shanghai', label: 'China Standard Time (CST)', offset: '+08:00' },
	{ value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)', offset: '+10:00' }
];

export const colorSchemeOptions = [
	{
		value: 'blue',
		label: 'Ocean Blue',
		color: '#3B82F6',
		description: 'Classic professional blue'
	},
	{
		value: 'green',
		label: 'Forest Green',
		color: '#10B981',
		description: 'Calm and natural green'
	},
	{
		value: 'purple',
		label: 'Royal Purple',
		color: '#8B5CF6',
		description: 'Creative and modern purple'
	},
	{
		value: 'orange',
		label: 'Sunset Orange',
		color: '#F59E0B',
		description: 'Energetic and warm orange'
	}
];

export const fontSizeOptions = [
	{ value: 'small', label: 'Small', description: '14px - Compact text for more content' },
	{ value: 'medium', label: 'Medium', description: '16px - Standard comfortable reading' },
	{ value: 'large', label: 'Large', description: '18px - Larger text for better readability' }
];

/**
 * T041: Standardized Settings Operations with Error Handling
 *
 * Implements standardized user settings operations with comprehensive error handling,
 * timeout enforcement, and retry logic following the T021-T024 entity model patterns.
 */

import type { Client } from '@urql/core';
import type { DataRequest, UserCredentials } from '$lib/models/data-request';
import type { ErrorResponse } from '$lib/models/error-response';

export class SettingsOperations {
	private client: Client | null;

	constructor(client: Client | null) {
		this.client = client;
	}

	/**
	 * Get user settings with standardized error handling
	 */
	async getUserSettings(params: {
		userId: string;
		userCredentials: UserCredentials;
	}): Promise<any> {
		// Import required models for standardized error handling
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		// Create data request with standard timeout and retry configuration
		const dataRequest = createDataRequest({
			operationName: 'GetUserSettings',
			variables: {
				userId: params.userId
			},
			userCredentials: params.userCredentials,
			timeoutMs: 5000,
			retryAttempts: 0,
			maxRetries: 3
		});

		// Retry handler with exponential backoff
		class SettingsRetryHandler {
			private attempts = 0;

			async execute<T>(fn: () => Promise<T>, request: DataRequest): Promise<T> {
				while (this.attempts <= request.maxRetries) {
					try {
						// Update request status
						(request as any).status = 'pending';

						// Execute with timeout
						const result = await Promise.race([
							fn(),
							new Promise<never>((_, reject) =>
								setTimeout(() => reject(new Error('Settings query timeout')), request.timeoutMs)
							)
						]);

						(request as any).status = 'completed';
						return result;
					} catch (error) {
						this.attempts++;
						(request as any).retryAttempts = this.attempts;

						if (this.attempts > request.maxRetries) {
							(request as any).status = 'failed';

							// Create structured error response
							const errorResponse = createErrorResponse(error, {
								type: error.message.includes('timeout') ? 'TIMEOUT_ERROR' : 'SETTINGS_ERROR',
								userMessage: 'Unable to load user settings. Please try again or contact support.'
							});

							console.error('Settings query error:', errorResponse.toLogEntry());
							throw errorResponse;
						}

						// Exponential backoff: 1s, 2s, 4s
						const delay = Math.min(1000 * Math.pow(2, this.attempts - 1), 4000);
						await new Promise((resolve) => setTimeout(resolve, delay));
					}
				}
				throw new Error('Max retries exceeded');
			}
		}

		const retryHandler = new SettingsRetryHandler();

		return retryHandler.execute(async () => {
			return new Promise((resolve, reject) => {
				// Mock user settings data - in real implementation, this would query the database
				const mockUserSettings = {
					id: params.userId,
					email: 'user@company.com',
					displayName: 'John Doe',
					firstName: 'John',
					lastName: 'Doe',
					phoneNumber: '+1 (555) 123-4567',
					jobTitle: 'Software Engineer',
					department: {
						id: 'dept-1',
						name: 'Engineering'
					},
					profile: {
						id: 'profile-1',
						bio: 'Software engineer with 5 years of experience',
						avatar: null,
						timezone: 'America/Los_Angeles',
						locale: 'en-US',
						dateFormat: 'MM/dd/yyyy',
						timeFormat: '12h'
					},
					preferences: {
						id: 'pref-1',
						theme: 'light',
						compactView: false,
						language: 'en',
						notifications: {
							email: true,
							push: false,
							sms: false,
							leaveReminders: true,
							performanceUpdates: true,
							systemAlerts: true,
							teamUpdates: false
						},
						privacy: {
							profileVisibility: 'team',
							showOnlineStatus: true,
							allowDirectMessages: true,
							dataSharing: false,
							analyticsOptOut: false
						},
						appearance: {
							darkMode: false,
							fontSize: 'medium',
							colorScheme: 'blue',
							sidebarCollapsed: false
						}
					},
					createdAt: '2024-01-15T08:00:00Z',
					updatedAt: '2024-12-18T10:30:00Z'
				};

				console.log(`Loaded settings for user: ${params.userId}`);
				resolve(mockUserSettings);
			});
		}, dataRequest);
	}

	/**
	 * Update user profile with error handling
	 */
	async updateUserProfile(params: {
		input: UpdateUserProfileInput;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateUserProfile',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000,
			retryAttempts: 0,
			maxRetries: 1
		});

		return new Promise<any>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Profile update timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Profile update is taking longer than expected. Please check if changes were saved.'
				});
				reject(errorResponse);
			}, dataRequest.timeoutMs);

			// Mock profile update - in real implementation, this would execute GraphQL mutation
			setTimeout(() => {
				clearTimeout(timeoutId);
				console.log(`Updated profile for user: ${params.input.userId}`);
				resolve({
					user: {
						...params.input.profile,
						id: params.input.userId,
						updatedAt: new Date().toISOString()
					}
				});
			}, 1000);
		});
	}

	/**
	 * Update user preferences with error handling
	 */
	async updateUserPreferences(params: {
		input: UpdateUserPreferencesInput;
		userCredentials: UserCredentials;
	}): Promise<any> {
		const { createDataRequest } = await import('$lib/models/data-request');
		const { createErrorResponse } = await import('$lib/models/error-response');

		const dataRequest = createDataRequest({
			operationName: 'UpdateUserPreferences',
			variables: { input: params.input },
			userCredentials: params.userCredentials,
			timeoutMs: 8000,
			retryAttempts: 0,
			maxRetries: 1
		});

		return new Promise<any>((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const errorResponse = createErrorResponse(new Error('Preferences update timeout'), {
					type: 'TIMEOUT_ERROR',
					userMessage:
						'Preferences update is taking longer than expected. Please verify changes were saved.'
				});
				reject(errorResponse);
			}, dataRequest.timeoutMs);

			// Mock preferences update
			setTimeout(() => {
				clearTimeout(timeoutId);
				console.log(`Updated preferences for user: ${params.input.userId}`);
				resolve({
					userPreferences: {
						...params.input.preferences,
						id: 'pref-1',
						updatedAt: new Date().toISOString()
					}
				});
			}, 1000);
		});
	}
}

/**
 * Factory function to create SettingsOperations instance
 */
export function createSettingsOperations(client: Client | null): SettingsOperations {
	return new SettingsOperations(client);
}

/**
 * Get user activity log for settings page
 */
export async function getUserActivityLog(params: {
	userId: string;
	limit?: number;
	userCredentials: UserCredentials;
}): Promise<any[]> {
	const { createDataRequest } = await import('$lib/models/data-request');
	const { createErrorResponse } = await import('$lib/models/error-response');

	const dataRequest = createDataRequest({
		operationName: 'GetUserActivityLog',
		variables: {
			userId: params.userId,
			limit: params.limit || 10
		},
		userCredentials: params.userCredentials,
		timeoutMs: 5000,
		retryAttempts: 0,
		maxRetries: 3
	});

	return new Promise((resolve, reject) => {
		// Mock activity log
		const mockActivityLog = [
			{
				id: '1',
				action: 'profile_updated',
				description: 'Updated profile information',
				timestamp: '2024-12-18T10:30:00Z',
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0...'
			},
			{
				id: '2',
				action: 'password_changed',
				description: 'Changed account password',
				timestamp: '2024-12-15T14:20:00Z',
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0...'
			},
			{
				id: '3',
				action: 'notifications_updated',
				description: 'Updated notification preferences',
				timestamp: '2024-12-10T09:15:00Z',
				ipAddress: '192.168.1.100',
				userAgent: 'Mozilla/5.0...'
			}
		];

		console.log(`Loaded activity log for user: ${params.userId}`);
		resolve(mockActivityLog);
	});
}

/**
 * Helper function to validate password strength
 */
export function validatePasswordStrength(password: string): {
	score: number;
	feedback: string[];
	isValid: boolean;
} {
	const feedback: string[] = [];
	let score = 0;

	if (password.length >= 8) score++;
	else feedback.push('Password must be at least 8 characters long');

	if (/[a-z]/.test(password)) score++;
	else feedback.push('Include at least one lowercase letter');

	if (/[A-Z]/.test(password)) score++;
	else feedback.push('Include at least one uppercase letter');

	if (/\d/.test(password)) score++;
	else feedback.push('Include at least one number');

	if (/[^A-Za-z0-9]/.test(password)) score++;
	else feedback.push('Include at least one special character');

	return {
		score,
		feedback,
		isValid: score >= 4
	};
}
