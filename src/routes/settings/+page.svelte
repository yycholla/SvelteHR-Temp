<!--
	User Settings Page - T041 Implementation
	Converted from client-side auth store to server-side data loading with modern Svelte 5 patterns
	Features: Profile management, notifications, appearance, privacy settings
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Switch from '$lib/components/ui/switch';
	import { Settings, Bell, Shield, Palette, Globe, ArrowLeft, User, Lock, Activity, Save, Eye, EyeOff, Download, AlertCircle, CheckCircle } from 'lucide-svelte';
	import {
		profileVisibilityOptions,
		languageOptions,
		timezoneOptions,
		colorSchemeOptions,
		fontSizeOptions,
		validatePasswordStrength
	} from '$lib/graphql/settings-operations';

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
	let { data }: Props = $props();

	// Derived values from server-side data
	const user = $derived(data.user);
	const userSettings = $derived(data.userSettings);
	const activityLog = $derived(data.activityLog);
	const canUpdateProfile = $derived(data.canUpdateProfile);
	const canChangePassword = $derived(data.canChangePassword);
	const canExportData = $derived(data.canExportData);

	// Local reactive state using Svelte 5 runes
	let activeTab = $state(data.activeTab);
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isUpdating = $state(false);
	let updateSuccess = $state<string | null>(null);
	let updateError = $state<string | null>(null);

	// Form state for profile
	let profileForm = $state({
		firstName: userSettings.profile.firstName || '',
		lastName: userSettings.profile.lastName || '',
		displayName: userSettings.profile.displayName || '',
		email: userSettings.profile.email || '',
		phoneNumber: userSettings.profile.phoneNumber || '',
		jobTitle: userSettings.profile.jobTitle || '',
		bio: userSettings.profile.bio || '',
		timezone: userSettings.profile.timezone || 'America/Los_Angeles',
		locale: userSettings.profile.locale || 'en-US'
	});

	// Form state for password change
	let passwordForm = $state({
		currentPassword: '',
		newPassword: '',
		confirmPassword: ''
	});

	// Form state for notifications
	let notificationSettings = $state({
		email: userSettings.notifications.email,
		push: userSettings.notifications.push,
		sms: userSettings.notifications.sms,
		leaveReminders: userSettings.notifications.leaveReminders,
		performanceUpdates: userSettings.notifications.performanceUpdates,
		systemAlerts: userSettings.notifications.systemAlerts,
		teamUpdates: userSettings.notifications.teamUpdates
	});

	// Form state for appearance
	let appearanceSettings = $state({
		darkMode: userSettings.preferences.darkMode,
		compactView: userSettings.preferences.compactView,
		language: userSettings.preferences.language,
		fontSize: userSettings.preferences.fontSize,
		colorScheme: userSettings.preferences.colorScheme
	});

	// Form state for privacy
	let privacySettings = $state({
		profileVisibility: userSettings.privacy.profileVisibility,
		showOnlineStatus: userSettings.privacy.showOnlineStatus,
		allowDirectMessages: userSettings.privacy.allowDirectMessages,
		dataSharing: userSettings.privacy.dataSharing,
		analyticsOptOut: userSettings.privacy.analyticsOptOut
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
			await new Promise(resolve => setTimeout(resolve, 1000));

			updateSuccess = 'Profile updated successfully!';
			console.log('Profile updated:', profileForm);
		} catch (error) {
			updateError = 'Failed to update profile. Please try again.';
			console.error('Profile update error:', error);
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
			await new Promise(resolve => setTimeout(resolve, 1500));

			updateSuccess = 'Password changed successfully!';
			passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
			console.log('Password changed');
		} catch (error) {
			updateError = 'Failed to change password. Please try again.';
			console.error('Password change error:', error);
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
			await new Promise(resolve => setTimeout(resolve, 800));

			updateSuccess = 'Notification preferences updated!';
			console.log('Notifications updated:', notificationSettings);
		} catch (error) {
			updateError = 'Failed to update notification preferences.';
			console.error('Notifications update error:', error);
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
			await new Promise(resolve => setTimeout(resolve, 800));

			updateSuccess = 'Appearance settings updated!';
			console.log('Appearance updated:', appearanceSettings);
		} catch (error) {
			updateError = 'Failed to update appearance settings.';
			console.error('Appearance update error:', error);
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
			await new Promise(resolve => setTimeout(resolve, 800));

			updateSuccess = 'Privacy settings updated!';
			console.log('Privacy updated:', privacySettings);
		} catch (error) {
			updateError = 'Failed to update privacy settings.';
			console.error('Privacy update error:', error);
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
			await new Promise(resolve => setTimeout(resolve, 2000));

			updateSuccess = 'Data export initiated. You will receive an email when ready for download.';
			console.log('User data export requested');
		} catch (error) {
			updateError = 'Failed to export user data. Please try again.';
			console.error('Data export error:', error);
		} finally {
			isUpdating = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getPasswordStrengthColor(score: number): string {
		if (score <= 1) return 'bg-red-500';
		if (score <= 2) return 'bg-orange-500';
		if (score <= 3) return 'bg-yellow-500';
		if (score <= 4) return 'bg-blue-500';
		return 'bg-green-500';
	}

	function getPasswordStrengthText(score: number): string {
		if (score <= 1) return 'Weak';
		if (score <= 2) return 'Fair';
		if (score <= 3) return 'Good';
		if (score <= 4) return 'Strong';
		return 'Very Strong';
	}
</script>

<svelte:head>
	<title>Settings - SvelteHR</title>
	<meta name="description" content="Manage your account settings and preferences" />
</svelte:head>

<div class="container mx-auto px-4 py-8" data-testid="settings-page">
	<!-- Page Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 flex items-center gap-2">
				<Settings class="w-8 h-8 text-blue-600" />
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
		<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-md" data-testid="success-message">
			<div class="flex items-center">
				<CheckCircle class="w-5 h-5 text-green-500 mr-2" />
				<span class="text-green-800">{updateSuccess}</span>
			</div>
		</div>
	{/if}

	{#if updateError}
		<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-md" data-testid="error-message">
			<div class="flex items-center">
				<AlertCircle class="w-5 h-5 text-red-500 mr-2" />
				<span class="text-red-800">{updateError}</span>
			</div>
		</div>
	{/if}

	<!-- Settings Tabs -->
	<div class="bg-white rounded-lg shadow">
		<Tabs.Root value={activeTab} class="w-full">
			<Tabs.List class="grid w-full grid-cols-4 border-b border-gray-200" data-testid="settings-tabs">
				<Tabs.Trigger
					value="general"
					onclick={() => handleTabChange('general')}
					class="flex items-center gap-2 py-3 px-4"
					data-testid="general-tab"
				>
					<User class="w-4 h-4" />
					General
				</Tabs.Trigger>
				<Tabs.Trigger
					value="notifications"
					onclick={() => handleTabChange('notifications')}
					class="flex items-center gap-2 py-3 px-4"
					data-testid="notifications-tab"
				>
					<Bell class="w-4 h-4" />
					Notifications
				</Tabs.Trigger>
				<Tabs.Trigger
					value="appearance"
					onclick={() => handleTabChange('appearance')}
					class="flex items-center gap-2 py-3 px-4"
					data-testid="appearance-tab"
				>
					<Palette class="w-4 h-4" />
					Appearance
				</Tabs.Trigger>
				<Tabs.Trigger
					value="privacy"
					onclick={() => handleTabChange('privacy')}
					class="flex items-center gap-2 py-3 px-4"
					data-testid="privacy-tab"
				>
					<Shield class="w-4 h-4" />
					Privacy
				</Tabs.Trigger>
			</Tabs.List>

			<div class="p-6">
				<!-- General Settings Tab -->
				{#if activeTab === 'general'}
					<div class="space-y-6" data-testid="general-content">
						<!-- Profile Information Card -->
						<Card.Root>
							<Card.Header>
								<Card.Title class="flex items-center gap-2">
									<User class="h-5 w-5" />
									Profile Information
								</Card.Title>
								<Card.Description>Update your personal information and contact details</Card.Description>
							</Card.Header>
							<Card.Content>
								<form class="space-y-4">
									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div class="space-y-2">
											<Label for="firstName">First Name</Label>
											<Input
												id="firstName"
												bind:value={profileForm.firstName}
												disabled={!canUpdateProfile}
												data-testid="first-name-input"
											/>
										</div>
										<div class="space-y-2">
											<Label for="lastName">Last Name</Label>
											<Input
												id="lastName"
												bind:value={profileForm.lastName}
												disabled={!canUpdateProfile}
												data-testid="last-name-input"
											/>
										</div>
									</div>

									<div class="space-y-2">
										<Label for="displayName">Display Name</Label>
										<Input
											id="displayName"
											bind:value={profileForm.displayName}
											disabled={!canUpdateProfile}
											data-testid="display-name-input"
										/>
									</div>

									<div class="space-y-2">
										<Label for="email">Email Address</Label>
										<Input
											id="email"
											type="email"
											bind:value={profileForm.email}
											disabled={true}
											data-testid="email-input"
										/>
										<p class="text-sm text-gray-500">Contact HR to change your email address</p>
									</div>

									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div class="space-y-2">
											<Label for="phone">Phone Number</Label>
											<Input
												id="phone"
												type="tel"
												bind:value={profileForm.phoneNumber}
												disabled={!canUpdateProfile}
												placeholder="+1 (555) 123-4567"
												data-testid="phone-input"
											/>
										</div>
										<div class="space-y-2">
											<Label for="jobTitle">Job Title</Label>
											<Input
												id="jobTitle"
												bind:value={profileForm.jobTitle}
												disabled={true}
												data-testid="job-title-input"
											/>
											<p class="text-sm text-gray-500">Contact HR to update your job title</p>
										</div>
									</div>

									<div class="space-y-2">
										<Label for="bio">Bio</Label>
										<textarea
											id="bio"
											bind:value={profileForm.bio}
											disabled={!canUpdateProfile}
											rows="3"
											class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
											placeholder="Tell us about yourself..."
											data-testid="bio-input"
										></textarea>
									</div>

									<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div class="space-y-2">
											<Label for="timezone">Timezone</Label>
											<select
												id="timezone"
												bind:value={profileForm.timezone}
												disabled={!canUpdateProfile}
												class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
												data-testid="timezone-select"
											>
												{#each timezoneOptions as tz}
													<option value={tz.value}>{tz.label}</option>
												{/each}
											</select>
										</div>
										<div class="space-y-2">
											<Label for="locale">Locale</Label>
											<select
												id="locale"
												bind:value={profileForm.locale}
												disabled={!canUpdateProfile}
												class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
												data-testid="locale-select"
											>
												<option value="en-US">English (US)</option>
												<option value="en-GB">English (UK)</option>
												<option value="es-ES">Español</option>
												<option value="fr-FR">Français</option>
												<option value="de-DE">Deutsch</option>
											</select>
										</div>
									</div>
								</form>
							</Card.Content>
							{#if canUpdateProfile}
								<Card.Footer>
									<Button
										onclick={updateProfile}
										disabled={isUpdating}
										data-testid="update-profile-button"
									>
										{#if isUpdating}
											<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
										{:else}
											<Save class="w-4 h-4 mr-2" />
										{/if}
										{isUpdating ? 'Updating...' : 'Save Changes'}
									</Button>
								</Card.Footer>
							{/if}
						</Card.Root>

						<!-- Security Card -->
						{#if canChangePassword}
							<Card.Root>
								<Card.Header>
									<Card.Title class="flex items-center gap-2">
										<Lock class="h-5 w-5" />
										Account Security
									</Card.Title>
									<Card.Description>Manage your password and security settings</Card.Description>
								</Card.Header>
								<Card.Content>
									<form class="space-y-4">
										<div class="space-y-2">
											<Label for="currentPassword">Current Password</Label>
											<div class="relative">
												<Input
													id="currentPassword"
													type={showCurrentPassword ? 'text' : 'password'}
													bind:value={passwordForm.currentPassword}
													data-testid="current-password-input"
												/>
												<button
													type="button"
													onclick={() => showCurrentPassword = !showCurrentPassword}
													class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
												>
													{#if showCurrentPassword}
														<EyeOff class="w-4 h-4" />
													{:else}
														<Eye class="w-4 h-4" />
													{/if}
												</button>
											</div>
										</div>

										<div class="space-y-2">
											<Label for="newPassword">New Password</Label>
											<div class="relative">
												<Input
													id="newPassword"
													type={showNewPassword ? 'text' : 'password'}
													bind:value={passwordForm.newPassword}
													data-testid="new-password-input"
												/>
												<button
													type="button"
													onclick={() => showNewPassword = !showNewPassword}
													class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
												>
													{#if showNewPassword}
														<EyeOff class="w-4 h-4" />
													{:else}
														<Eye class="w-4 h-4" />
													{/if}
												</button>
											</div>
											{#if passwordForm.newPassword}
												<div class="mt-2">
													<div class="flex items-center justify-between text-sm mb-1">
														<span>Password strength: {getPasswordStrengthText(passwordStrength.score)}</span>
														<span>{passwordStrength.score}/5</span>
													</div>
													<div class="w-full bg-gray-200 rounded-full h-2">
														<div
															class="h-2 rounded-full transition-all {getPasswordStrengthColor(passwordStrength.score)}"
															style="width: {(passwordStrength.score / 5) * 100}%"
														></div>
													</div>
													{#if passwordStrength.feedback.length > 0}
														<ul class="mt-2 text-sm text-gray-600">
															{#each passwordStrength.feedback as feedback}
																<li class="flex items-center gap-1">
																	<AlertCircle class="w-3 h-3 text-orange-500" />
																	{feedback}
																</li>
															{/each}
														</ul>
													{/if}
												</div>
											{/if}
										</div>

										<div class="space-y-2">
											<Label for="confirmPassword">Confirm New Password</Label>
											<div class="relative">
												<Input
													id="confirmPassword"
													type={showConfirmPassword ? 'text' : 'password'}
													bind:value={passwordForm.confirmPassword}
													data-testid="confirm-password-input"
												/>
												<button
													type="button"
													onclick={() => showConfirmPassword = !showConfirmPassword}
													class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
												>
													{#if showConfirmPassword}
														<EyeOff class="w-4 h-4" />
													{:else}
														<Eye class="w-4 h-4" />
													{/if}
												</button>
											</div>
											{#if passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword}
												<p class="text-sm text-red-600 flex items-center gap-1">
													<AlertCircle class="w-3 h-3" />
													Passwords do not match
												</p>
											{/if}
										</div>
									</form>
								</Card.Content>
								<Card.Footer>
									<Button
										variant="outline"
										onclick={changePassword}
										disabled={isUpdating || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordStrength.isValid}
										data-testid="change-password-button"
									>
										{#if isUpdating}
											<div class="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
										{:else}
											<Lock class="w-4 h-4 mr-2" />
										{/if}
										{isUpdating ? 'Updating...' : 'Update Password'}
									</Button>
								</Card.Footer>
							</Card.Root>
						{/if}
					</div>

				<!-- Notifications Tab -->
				{:else if activeTab === 'notifications'}
					<div class="space-y-6" data-testid="notifications-content">
						<Card.Root>
							<Card.Header>
								<Card.Title class="flex items-center gap-2">
									<Bell class="h-5 w-5" />
									Notification Preferences
								</Card.Title>
								<Card.Description>Choose how you want to be notified about important updates</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Email Notifications</Label>
										<p class="text-sm text-gray-500">Receive important updates via email</p>
									</div>
									<Switch.Root bind:checked={notificationSettings.email} data-testid="email-notifications" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Push Notifications</Label>
										<p class="text-sm text-gray-500">Get instant notifications in your browser</p>
									</div>
									<Switch.Root bind:checked={notificationSettings.push} data-testid="push-notifications" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>SMS Notifications</Label>
										<p class="text-sm text-gray-500">Receive critical alerts via SMS</p>
									</div>
									<Switch.Root bind:checked={notificationSettings.sms} data-testid="sms-notifications" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Leave Reminders</Label>
										<p class="text-sm text-gray-500">Reminders about upcoming leave and deadlines</p>
									</div>
									<Switch.Root bind:checked={notificationSettings.leaveReminders} data-testid="leave-reminders" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Performance Updates</Label>
										<p class="text-sm text-gray-500">Notifications about goal progress and reviews</p>
									</div>
									<Switch.Root bind:checked={notificationSettings.performanceUpdates} data-testid="performance-updates" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>System Alerts</Label>
										<p class="text-sm text-gray-500">Important system maintenance and security alerts</p>
									</div>
									<Switch.Root bind:checked={notificationSettings.systemAlerts} data-testid="system-alerts" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Team Updates</Label>
										<p class="text-sm text-gray-500">Notifications about team changes and announcements</p>
									</div>
									<Switch.Root bind:checked={notificationSettings.teamUpdates} data-testid="team-updates" />
								</div>
							</Card.Content>
							<Card.Footer>
								<Button
									onclick={updateNotifications}
									disabled={isUpdating}
									data-testid="save-notifications-button"
								>
									{#if isUpdating}
										<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									{:else}
										<Save class="w-4 h-4 mr-2" />
									{/if}
									{isUpdating ? 'Saving...' : 'Save Preferences'}
								</Button>
							</Card.Footer>
						</Card.Root>
					</div>

				<!-- Appearance Tab -->
				{:else if activeTab === 'appearance'}
					<div class="space-y-6" data-testid="appearance-content">
						<Card.Root>
							<Card.Header>
								<Card.Title class="flex items-center gap-2">
									<Palette class="h-5 w-5" />
									Appearance & Language
								</Card.Title>
								<Card.Description>Customize how SvelteHR looks and feels</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Dark Mode</Label>
										<p class="text-sm text-gray-500">Switch to dark theme</p>
									</div>
									<Switch.Root bind:checked={appearanceSettings.darkMode} data-testid="dark-mode" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Compact View</Label>
										<p class="text-sm text-gray-500">Show more content in less space</p>
									</div>
									<Switch.Root bind:checked={appearanceSettings.compactView} data-testid="compact-view" />
								</div>

								<div class="space-y-2">
									<Label for="language">Language</Label>
									<select
										id="language"
										bind:value={appearanceSettings.language}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
										data-testid="language-select"
									>
										{#each languageOptions as lang}
											<option value={lang.value}>{lang.flag} {lang.label}</option>
										{/each}
									</select>
								</div>

								<div class="space-y-2">
									<Label for="fontSize">Font Size</Label>
									<select
										id="fontSize"
										bind:value={appearanceSettings.fontSize}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
										data-testid="font-size-select"
									>
										{#each fontSizeOptions as size}
											<option value={size.value}>{size.label} - {size.description}</option>
										{/each}
									</select>
								</div>

								<div class="space-y-2">
									<Label for="colorScheme">Color Scheme</Label>
									<div class="grid grid-cols-2 gap-3">
										{#each colorSchemeOptions as scheme}
											<label class="flex items-center space-x-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50 {appearanceSettings.colorScheme === scheme.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}">
												<input
													type="radio"
													bind:group={appearanceSettings.colorScheme}
													value={scheme.value}
													class="text-blue-600"
													data-testid="color-scheme-{scheme.value}"
												/>
												<div class="flex items-center space-x-2">
													<div class="w-4 h-4 rounded-full" style="background-color: {scheme.color}"></div>
													<div>
														<div class="font-medium">{scheme.label}</div>
														<div class="text-sm text-gray-500">{scheme.description}</div>
													</div>
												</div>
											</label>
										{/each}
									</div>
								</div>
							</Card.Content>
							<Card.Footer>
								<Button
									onclick={updateAppearance}
									disabled={isUpdating}
									data-testid="save-appearance-button"
								>
									{#if isUpdating}
										<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									{:else}
										<Save class="w-4 h-4 mr-2" />
									{/if}
									{isUpdating ? 'Applying...' : 'Apply Changes'}
								</Button>
							</Card.Footer>
						</Card.Root>
					</div>

				<!-- Privacy Tab -->
				{:else if activeTab === 'privacy'}
					<div class="space-y-6" data-testid="privacy-content">
						<Card.Root>
							<Card.Header>
								<Card.Title class="flex items-center gap-2">
									<Shield class="h-5 w-5" />
									Privacy & Data
								</Card.Title>
								<Card.Description>Control your privacy and data sharing preferences</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="space-y-2">
									<Label for="profileVisibility">Profile Visibility</Label>
									<select
										id="profileVisibility"
										bind:value={privacySettings.profileVisibility}
										class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
										data-testid="profile-visibility-select"
									>
										{#each profileVisibilityOptions as option}
											<option value={option.value}>{option.label} - {option.description}</option>
										{/each}
									</select>
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Show Online Status</Label>
										<p class="text-sm text-gray-500">Let others see when you're online</p>
									</div>
									<Switch.Root bind:checked={privacySettings.showOnlineStatus} data-testid="show-online-status" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Allow Direct Messages</Label>
										<p class="text-sm text-gray-500">Allow colleagues to send you direct messages</p>
									</div>
									<Switch.Root bind:checked={privacySettings.allowDirectMessages} data-testid="allow-direct-messages" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Data Sharing</Label>
										<p class="text-sm text-gray-500">Share anonymized data for product improvement</p>
									</div>
									<Switch.Root bind:checked={privacySettings.dataSharing} data-testid="data-sharing" />
								</div>

								<div class="flex items-center justify-between">
									<div class="space-y-0.5">
										<Label>Analytics Opt-out</Label>
										<p class="text-sm text-gray-500">Disable usage analytics and tracking</p>
									</div>
									<Switch.Root bind:checked={privacySettings.analyticsOptOut} data-testid="analytics-opt-out" />
								</div>
							</Card.Content>
							<Card.Footer class="flex justify-between">
								{#if canExportData}
									<Button
										variant="outline"
										onclick={exportUserData}
										disabled={isUpdating}
										data-testid="export-data-button"
									>
										{#if isUpdating}
											<div class="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2"></div>
										{:else}
											<Download class="w-4 h-4 mr-2" />
										{/if}
										{isUpdating ? 'Exporting...' : 'Export Data'}
									</Button>
								{/if}
								<Button
									onclick={updatePrivacy}
									disabled={isUpdating}
									data-testid="save-privacy-button"
								>
									{#if isUpdating}
										<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
									{:else}
										<Save class="w-4 h-4 mr-2" />
									{/if}
									{isUpdating ? 'Saving...' : 'Save Settings'}
								</Button>
							</Card.Footer>
						</Card.Root>

						<!-- Activity Log Card -->
						{#if activityLog.length > 0}
							<Card.Root>
								<Card.Header>
									<Card.Title class="flex items-center gap-2">
										<Activity class="h-5 w-5" />
										Recent Activity
									</Card.Title>
									<Card.Description>Your recent account activity and changes</Card.Description>
								</Card.Header>
								<Card.Content>
									<div class="space-y-3" data-testid="activity-log">
										{#each activityLog as activity}
											<div class="flex items-center justify-between p-3 bg-gray-50 rounded-md">
												<div>
													<p class="font-medium">{activity.description}</p>
													<p class="text-sm text-gray-500">{formatDate(activity.timestamp)}</p>
												</div>
												<div class="text-xs text-gray-400">
													{activity.ipAddress}
												</div>
											</div>
										{/each}
									</div>
								</Card.Content>
							</Card.Root>
						{/if}
					</div>
				{/if}
			</div>
		</Tabs.Root>
	</div>
</div>

<style>
	/* Ensure proper Tailwind classes are generated */
	.bg-red-500 { background-color: rgb(239 68 68); }
	.bg-orange-500 { background-color: rgb(249 115 22); }
	.bg-yellow-500 { background-color: rgb(234 179 8); }
	.bg-blue-500 { background-color: rgb(59 130 246); }
	.bg-green-500 { background-color: rgb(34 197 94); }
</style>