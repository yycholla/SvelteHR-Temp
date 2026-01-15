<!--
	User Settings Page - T041 Implementation
	Converted from client-side auth store to server-side data loading with modern Svelte 5 patterns
	Features: Profile management, notifications, appearance, privacy settings
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { logger } from '$lib/utils/logger';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		AlertCircle,
		ArrowLeft,
		Bell,
		CheckCircle,
		Palette,
		Settings,
		Shield,
		User
	} from '@lucide/svelte';
	import { validatePasswordStrength } from '$lib/graphql/settings-operations';

	// Import decomposed components
	import SettingsGeneral from './components/SettingsGeneral.svelte';
	import SettingsNotifications from './components/SettingsNotifications.svelte';
	import SettingsAppearance from './components/SettingsAppearance.svelte';
	import SettingsPrivacy from './components/SettingsPrivacy.svelte';

	// Modern Svelte 5 props interface
	interface Props {
		data: {
			user: any;
			userSession: any;
			userSettings: {
				profile: any;
				preferences: any;
				notifications: any;
				privacy: any;
			};
			activityLog: any[];
			activeTab: string;
			permissions: string[];
			canUpdateProfile: boolean;
			canChangePassword: boolean;
			canExportData: boolean;
			loadedAt: string;
		};
	}

	// Destructure props using Svelte 5 runes
	const { data }: Props = $props();

	// Derived values from server-side data
	const activityLog = $derived(data.activityLog);
	const canUpdateProfile = $derived(data.canUpdateProfile);
	const canChangePassword = $derived(data.canChangePassword);
	const canExportData = $derived(data.canExportData);

	// Local reactive state using Svelte 5 runes
	let activeTab = $state(data.activeTab);
	let isUpdating = $state(false);
	let updateSuccess = $state<string | null>(null);
	let updateError = $state<string | null>(null);

	// Form state for profile - initialized from data (not derived userSettings)
	let profileForm = $state({
		firstName: data.userSettings.profile.firstName || '',
		lastName: data.userSettings.profile.lastName || '',
		displayName: data.userSettings.profile.displayName || '',
		email: data.userSettings.profile.email || '',
		phoneNumber: data.userSettings.profile.phoneNumber || '',
		jobTitle: data.userSettings.profile.jobTitle || '',
		bio: data.userSettings.profile.bio || '',
		timezone: data.userSettings.profile.timezone || 'America/Los_Angeles',
		locale: data.userSettings.profile.locale || 'en-US'
	});

	// Form state for password change
	let passwordForm = $state({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});

	// Form state for notifications - initialized from data (not derived userSettings)
	let notificationSettings = $state({
		email: data.userSettings.notifications.email,
		push: data.userSettings.notifications.push,
		sms: data.userSettings.notifications.sms,
		leaveReminders: data.userSettings.notifications.leaveReminders,
		performanceUpdates: data.userSettings.notifications.performanceUpdates,
		systemAlerts: data.userSettings.notifications.systemAlerts,
		teamUpdates: data.userSettings.notifications.teamUpdates
	});

	// Form state for appearance
	let appearanceSettings = $state({
		darkMode: false,
		compactView: false,
		language: 'en',
		fontSize: 'medium',
		colorScheme: 'light'
	});

	// Sync with userSettings preferences using effect
	$effect(() => {
		if (data.userSettings?.preferences) {
			appearanceSettings.darkMode = data.userSettings.preferences.darkMode;
			appearanceSettings.compactView = data.userSettings.preferences.compactView;
			appearanceSettings.language = data.userSettings.preferences.language;
			appearanceSettings.fontSize = data.userSettings.preferences.fontSize;
			appearanceSettings.colorScheme = data.userSettings.preferences.colorScheme;
		}
	});

	// Form state for privacy
	let privacySettings = $state({
		profileVisibility: 'public',
		showOnlineStatus: true,
		allowDirectMessages: true,
		dataSharing: false,
		analyticsOptOut: false
	});

	// Sync with userSettings data using effect
	$effect(() => {
		if (data.userSettings?.privacy) {
			privacySettings.profileVisibility = data.userSettings.privacy.profileVisibility;
			privacySettings.showOnlineStatus = data.userSettings.privacy.showOnlineStatus;
			privacySettings.allowDirectMessages = data.userSettings.privacy.allowDirectMessages;
			privacySettings.dataSharing = data.userSettings.privacy.dataSharing;
			privacySettings.analyticsOptOut = data.userSettings.privacy.analyticsOptOut;
		}
	});

	// Password strength validation
	const passwordStrength = $derived(validatePasswordStrength(passwordForm.newPassword));

	// Helper functions
	function handleTabChange(newTab: string) {
		activeTab = newTab;
		const url = new URL(window.location.href);
		url.searchParams.set('tab', newTab);
		goto(url.toString(), { replaceState: true });
	}

	function clearMessages() {
		updateSuccess = null;
		updateError = null;
	}

	async function updateProfile() {
		if (!canUpdateProfile || isUpdating) return;

		clearMessages();
		isUpdating = true;

		try {
			// Mock profile update - in real implementation, this would call the server
			await new Promise((resolve) => setTimeout(resolve, 1000));

			updateSuccess = 'Profile updated successfully!';
			logger.info(`Profile updated: ${JSON.stringify(profileForm)}`);
		} catch (error) {
			updateError = 'Failed to update profile. Please try again.';
			logger.error('Profile update error:', error as Error);
		} finally {
			isUpdating = false;
		}
	}

	async function changePassword() {
		if (!canChangePassword || isUpdating) return;

		clearMessages();

		// Validate passwords
		if (!passwordForm.currentPassword) {
			updateError = 'Please enter your current password.';
			return;
		}

		if (passwordForm.newPassword !== passwordForm.confirmPassword) {
			updateError = 'New passwords do not match.';
			return;
		}

		if (!passwordStrength.isValid) {
			updateError = 'New password does not meet security requirements.';
			return;
		}

		isUpdating = true;

		try {
			// Mock password change - in real implementation, this would call the server
			await new Promise((resolve) => setTimeout(resolve, 1500));

			updateSuccess = 'Password changed successfully!';
			passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
			logger.info('Password changed');
		} catch (error) {
			updateError = 'Failed to change password. Please try again.';
			logger.error('Password change error:', error as Error);
		} finally {
			isUpdating = false;
		}
	}

	async function updateNotifications() {
		if (isUpdating) return;

		clearMessages();
		isUpdating = true;

		try {
			// Mock notifications update
			await new Promise((resolve) => setTimeout(resolve, 800));

			updateSuccess = 'Notification preferences updated!';
		} catch (error) {
			updateError = 'Failed to update notification preferences.';
			logger.error('Notifications update error:', error as Error);
		} finally {
			isUpdating = false;
		}
	}

	async function updateAppearance() {
		if (isUpdating) return;

		clearMessages();
		isUpdating = true;

		try {
			// Mock appearance update
			await new Promise((resolve) => setTimeout(resolve, 800));

			updateSuccess = 'Appearance settings updated!';
			logger.info(`Appearance updated: ${JSON.stringify(appearanceSettings)}`);
		} catch (error) {
			updateError = 'Failed to update appearance settings.';
			logger.error('Appearance update error:', error as Error);
		} finally {
			isUpdating = false;
		}
	}

	async function updatePrivacy() {
		if (isUpdating) return;

		clearMessages();
		isUpdating = true;

		try {
			// Mock privacy update
			await new Promise((resolve) => setTimeout(resolve, 800));

			updateSuccess = 'Privacy settings updated!';
			logger.info(`Privacy updated: ${JSON.stringify(privacySettings)}`);
		} catch (error) {
			updateError = 'Failed to update privacy settings.';
			logger.error('Privacy update error:', error as Error);
		} finally {
			isUpdating = false;
		}
	}

	async function exportUserData() {
		if (!canExportData || isUpdating) return;

		clearMessages();
		isUpdating = true;

		try {
			// Mock data export
			await new Promise((resolve) => setTimeout(resolve, 2000));

			updateSuccess = 'Data export initiated. You will receive an email when ready for download.';
			logger.info('User data export requested');
		} catch (error) {
			updateError = 'Failed to export user data. Please try again.';
			logger.error('Data export error:', error as Error);
		} finally {
			isUpdating = false;
		}
	}
</script>

<svelte:head>
	<title>Settings - MountainHR</title>
	<meta name="description" content="Manage your account settings and preferences" />
</svelte:head>

<div class="container mx-auto px-4 py-8" data-testid="settings-page">
	<!-- Page Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="flex items-center gap-2 text-3xl font-bold text-gray-900">
				<Settings class="h-8 w-8 text-blue-600" />
				Settings
			</h1>
			<p class="mt-2 text-gray-600">Manage your account settings and preferences</p>
		</div>
		<Button variant="outline" size="sm" href="/dashboard">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Dashboard
		</Button>
	</div>

	<!-- Success/Error Messages -->
	{#if updateSuccess}
		<div
			class="mb-6 rounded-md border border-green-200 bg-green-50 p-4"
			data-testid="success-message"
		>
			<div class="flex items-center">
				<CheckCircle class="mr-2 h-5 w-5 text-green-500" />
				<span class="text-green-800">{updateSuccess}</span>
			</div>
		</div>
	{/if}

	{#if updateError}
		<div class="mb-6 rounded-md border border-red-200 bg-red-50 p-4" data-testid="error-message">
			<div class="flex items-center">
				<AlertCircle class="mr-2 h-5 w-5 text-red-500" />
				<span class="text-red-800">{updateError}</span>
			</div>
		</div>
	{/if}

	<!-- Settings Tabs -->
	<div class="rounded-lg bg-white shadow">
		<Tabs.Root value={activeTab} class="w-full">
			<Tabs.List
				class="grid w-full grid-cols-4 border-b border-gray-200"
				data-testid="settings-tabs"
			>
				<Tabs.Trigger
					value="general"
					onclick={() => handleTabChange('general')}
					class="flex items-center gap-2 px-4 py-3"
					data-testid="general-tab"
				>
					<User class="h-4 w-4" />
					General
				</Tabs.Trigger>
				<Tabs.Trigger
					value="notifications"
					onclick={() => handleTabChange('notifications')}
					class="flex items-center gap-2 px-4 py-3"
					data-testid="notifications-tab"
				>
					<Bell class="h-4 w-4" />
					Notifications
				</Tabs.Trigger>
				<Tabs.Trigger
					value="appearance"
					onclick={() => handleTabChange('appearance')}
					class="flex items-center gap-2 px-4 py-3"
					data-testid="appearance-tab"
				>
					<Palette class="h-4 w-4" />
					Appearance
				</Tabs.Trigger>
				<Tabs.Trigger
					value="privacy"
					onclick={() => handleTabChange('privacy')}
					class="flex items-center gap-2 px-4 py-3"
					data-testid="privacy-tab"
				>
					<Shield class="h-4 w-4" />
					Privacy
				</Tabs.Trigger>
			</Tabs.List>

			<div class="p-6">
				<!-- General Settings Tab -->
				{#if activeTab === 'general'}
					<SettingsGeneral
						bind:profileForm
						bind:passwordForm
						{canUpdateProfile}
						{canChangePassword}
						{isUpdating}
						{passwordStrength}
						onUpdateProfile={updateProfile}
						onChangePassword={changePassword}
					/>

					<!-- Notifications Tab -->
				{:else if activeTab === 'notifications'}
					<SettingsNotifications
						bind:notificationSettings
						{isUpdating}
						onUpdate={updateNotifications}
					/>

					<!-- Appearance Tab -->
				{:else if activeTab === 'appearance'}
					<SettingsAppearance bind:appearanceSettings {isUpdating} onUpdate={updateAppearance} />

					<!-- Privacy Tab -->
				{:else if activeTab === 'privacy'}
					<SettingsPrivacy
						bind:privacySettings
						{activityLog}
						{canExportData}
						{isUpdating}
						onUpdate={updatePrivacy}
						onExport={exportUserData}
					/>
				{/if}
			</div>
		</Tabs.Root>
	</div>
</div>
