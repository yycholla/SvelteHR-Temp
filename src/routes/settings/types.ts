export type ProfileVisibility = 'public' | 'team' | 'managers' | 'private' | string;

export interface ProfileFormState {
	firstName: string;
	lastName: string;
	displayName: string;
	email: string;
	phoneNumber: string;
	jobTitle: string;
	bio: string;
	timezone: string;
	locale: string;
}

export interface PasswordFormState {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface NotificationSettingsState {
	email: boolean;
	push: boolean;
	sms: boolean;
	leaveReminders: boolean;
	performanceUpdates: boolean;
	systemAlerts: boolean;
	teamUpdates: boolean;
}

export interface AppearanceSettingsState {
	darkMode: boolean;
	compactView: boolean;
	language: string;
	fontSize: string;
	colorScheme: string;
}

export interface PrivacySettingsState {
	profileVisibility: ProfileVisibility;
	showOnlineStatus: boolean;
	allowDirectMessages: boolean;
	dataSharing: boolean;
	analyticsOptOut: boolean;
}

export interface ActivityLogItem {
	description: string;
	timestamp: string;
	ipAddress?: string | null;
	[key: string]: unknown;
}

export interface SettingsProfileData {
	firstName?: string | null;
	lastName?: string | null;
	displayName?: string | null;
	email?: string | null;
	phoneNumber?: string | null;
	phone?: string | null;
	jobTitle?: string | null;
	bio?: string | null;
	timezone?: string | null;
	locale?: string | null;
}

export interface SettingsPreferencesData {
	darkMode?: boolean;
	compactView?: boolean;
	language?: string;
	fontSize?: string;
	colorScheme?: string;
	theme?: 'light' | 'dark' | 'system';
}

export interface SettingsUserSettingsData {
	profile: SettingsProfileData;
	preferences?: SettingsPreferencesData;
	notifications?: Partial<NotificationSettingsState>;
	notificationPreferences?: Partial<NotificationSettingsState>;
	privacy?: Partial<PrivacySettingsState>;
	privacyPreferences?: Partial<PrivacySettingsState>;
}

export interface SettingsPageData {
	userSettings: SettingsUserSettingsData;
	activityLog: ActivityLogItem[];
	activeTab: string;
	canUpdateProfile: boolean;
	canChangePassword: boolean;
	canExportData: boolean;
}
