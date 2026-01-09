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
