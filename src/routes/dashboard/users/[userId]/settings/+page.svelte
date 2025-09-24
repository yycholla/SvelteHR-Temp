<script lang="ts">
	import { page } from '$app/stores';
	import { currentUser } from '$lib/stores/auth';
	import { theme, setTheme } from '$lib/stores/theme';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Switch from '$lib/components/ui/switch';
	import { Settings, Bell, Palette, User, Lock, AlertCircle } from 'lucide-svelte';
	import { createUrqlClient } from '$lib/graphql/client';
	import { gql } from '@urql/svelte';
	import {
		GET_USER_PREFERENCES_QUERY,
		GET_OR_CREATE_USER_PREFERENCES_MUTATION,
		UPDATE_USER_PREFERENCES_MUTATION,
		type UserPreferences,
		UserPreferencesService
	} from '$lib/graphql/user-preferences-operations';
	import {
		SUBMIT_PROFILE_CHANGE_REQUEST_MUTATION,
		type ProfileChangeRequest,
		ProfileChangeRequestService
	} from '$lib/graphql/profile-change-requests-operations';
	import { onMount } from 'svelte';

	// GraphQL query to get current user data
	const GET_USER_QUERY = gql`
		query GetUser($userId: UUID!) {
			userById(id: $userId) {
				id
				email
				displayName
				isActive
				createdAt
			}
		}
	`;

	// Get user ID from URL params
	const userId = $page.params.userId;

	// Check if viewing own settings
	const isOwnSettings = $derived($currentUser?.id === userId);

	// GraphQL client
	const client = createUrqlClient();

	// User preferences state
	let userPreferences = $state<UserPreferences | null>(null);
	let preferencesLoading = $state(true);
	let initialThemeSet = $state(false);

	// Current user data state (fresh from database)
	let currentUserData = $state<{
		id: string;
		email: string;
		displayName: string;
		isActive: boolean;
		createdAt: string;
	} | null>(null);

	// Form state for profile information - update when currentUser changes
	let profileForm = $state({
		firstName: '',
		lastName: '',
		email: '',
		phone: '',
		// Address fields
		address: '',
		city: '',
		state: '',
		zipCode: '',
		country: '',
		// Emergency contact fields
		emergencyContactFirstName: '',
		emergencyContactLastName: '',
		emergencyContactPhone: '',
		emergencyContactEmail: '',
		emergencyContactRelation: '',
		pendingChanges: false,
		submitting: false
	});

	// Load current user data from database
	async function loadCurrentUser() {
		try {
			const result = await client.query(GET_USER_QUERY, { userId }).toPromise();
			if (result.data?.userById) {
				currentUserData = result.data.userById;
			}
		} catch (error) {
			console.error('Error loading current user data:', error);
		}
	}

	// Load user preferences and current user data on mount
	onMount(async () => {
		if (userId) {
			await Promise.all([loadUserPreferences(), loadCurrentUser()]);
		}
	});

	// Update profile form when currentUserData or userPreferences changes
	$effect(() => {
		if (currentUserData) {
			const nameParts = currentUserData.displayName?.split(' ') || [];
			profileForm.firstName = nameParts[0] || '';
			profileForm.lastName = nameParts.slice(1).join(' ') || '';
			profileForm.email = currentUserData.email || '';
			profileForm.phone = userPreferences?.phone || '';
			// Address fields
			profileForm.address = userPreferences?.address || '';
			profileForm.city = userPreferences?.city || '';
			profileForm.state = userPreferences?.state || '';
			profileForm.zipCode = userPreferences?.zipCode || '';
			profileForm.country = userPreferences?.country || '';
			// Emergency contact fields
			profileForm.emergencyContactFirstName = userPreferences?.emergencyContactFirstName || '';
			profileForm.emergencyContactLastName = userPreferences?.emergencyContactLastName || '';
			profileForm.emergencyContactPhone = userPreferences?.emergencyContactPhone || '';
			profileForm.emergencyContactEmail = userPreferences?.emergencyContactEmail || '';
			profileForm.emergencyContactRelation = userPreferences?.emergencyContactRelation || '';
			profileForm.pendingChanges = UserPreferencesService.hasPendingChanges(
				userPreferences || ({} as UserPreferences)
			);
		}
	});

	// Notification settings - will be populated from userPreferences
	let notificationSettings = $state({
		emailNotifications: true,
		pushNotifications: false,
		leaveReminders: true,
		performanceUpdates: true
	});

	// Update notification settings when userPreferences loads
	$effect(() => {
		if (userPreferences) {
			notificationSettings.emailNotifications = userPreferences.emailNotifications;
			notificationSettings.pushNotifications = userPreferences.pushNotifications;
			notificationSettings.leaveReminders = userPreferences.leaveReminders;
			notificationSettings.performanceUpdates = userPreferences.performanceUpdates;
		}
	});

	// Password change form
	let passwordForm = $state({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
		submitting: false
	});

	// Theme selection - needs to be reactive
	let selectedTheme = $state($theme);

	// Update selectedTheme when userPreferences loads initially
	$effect(() => {
		if (userPreferences?.theme && !initialThemeSet) {
			selectedTheme = userPreferences.theme;
			setTheme(userPreferences.theme);
			initialThemeSet = true;
		}
	});

	// Watch for theme selection changes and apply them
	$effect(() => {
		if (initialThemeSet && selectedTheme && isOwnSettings) {
			handleThemeChange(selectedTheme);
		}
	});

	// Load user preferences from database
	async function loadUserPreferences() {
		try {
			preferencesLoading = true;
			const result = await client.query(GET_USER_PREFERENCES_QUERY, { userId }).toPromise();

			if (result.data?.allUserPreferences?.nodes?.length > 0) {
				userPreferences = result.data.allUserPreferences.nodes[0];
			} else {
				// No preferences exist yet, create them using our function
				const createResult = await client
					.mutation(GET_OR_CREATE_USER_PREFERENCES_MUTATION, { userId })
					.toPromise();
				if (createResult.data?.getUserPreferences?.userPreference) {
					userPreferences = createResult.data.getUserPreferences.userPreference;
				} else {
					// Fallback to defaults if creation fails
					userPreferences = {
						...UserPreferencesService.getDefaultPreferences(),
						id: '',
						userId,
						createdAt: new Date().toISOString(),
						updatedAt: new Date().toISOString()
					} as UserPreferences;
				}
			}
		} catch (error) {
			console.error('Error loading user preferences:', error);
		} finally {
			preferencesLoading = false;
		}
	}

	// Handle profile changes that require approval
	async function submitProfileChanges() {
		if (!isOwnSettings) return;

		profileForm.submitting = true;

		try {
			const result = await client
				.mutation(SUBMIT_PROFILE_CHANGE_REQUEST_MUTATION, {
					userId,
					firstName: profileForm.firstName,
					lastName: profileForm.lastName,
					email: profileForm.email,
					phone: profileForm.phone,
					address: profileForm.address,
					city: profileForm.city,
					state: profileForm.state,
					zipCode: profileForm.zipCode,
					country: profileForm.country,
					emergencyContactFirstName: profileForm.emergencyContactFirstName,
					emergencyContactLastName: profileForm.emergencyContactLastName,
					emergencyContactPhone: profileForm.emergencyContactPhone,
					emergencyContactEmail: profileForm.emergencyContactEmail,
					emergencyContactRelation: profileForm.emergencyContactRelation,
					reason: 'Profile information update request'
				})
				.toPromise();

			if (result.data?.submitProfileChangeRequest?.profileChangeRequest) {
				profileForm.pendingChanges = true;
				alert(
					'Profile change request submitted successfully! HR will review your request within 1-2 business days.'
				);

				// Reload user preferences to reflect pending status
				await loadUserPreferences();
			} else {
				throw new Error(result.error?.message || 'Failed to submit profile changes');
			}
		} catch (error) {
			console.error('Error submitting profile changes:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			if (errorMessage.includes('already have a pending')) {
				alert(
					'You already have a pending profile change request. Please wait for it to be reviewed before submitting another.'
				);
			} else {
				alert('Failed to submit profile changes: ' + errorMessage);
			}
		} finally {
			profileForm.submitting = false;
		}
	}

	// Handle password change
	async function changePassword() {
		if (!isOwnSettings || passwordForm.newPassword !== passwordForm.confirmPassword) {
			return;
		}

		passwordForm.submitting = true;

		try {
			// Here you would make a GraphQL mutation to change password
			console.log('Changing password for user:', userId);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Clear form
			passwordForm.currentPassword = '';
			passwordForm.newPassword = '';
			passwordForm.confirmPassword = '';

			alert('Password changed successfully');
		} catch (error) {
			console.error('Error changing password:', error);
			alert('Failed to change password');
		} finally {
			passwordForm.submitting = false;
		}
	}

	// Handle theme change
	async function handleThemeChange(newTheme: string) {
		// Apply theme immediately
		setTheme(newTheme as any);

		// Save theme preference to database
		if (isOwnSettings) {
			try {
				await savePreferences({ theme: newTheme });
			} catch (error) {
				console.error('Error saving theme preference:', error);
				// Revert theme on error
				if (userPreferences?.theme) {
					setTheme(userPreferences.theme);
					selectedTheme = userPreferences.theme;
				}
			}
		}
	}

	// Save preferences to database
	async function savePreferences(updates: Partial<UserPreferences>) {
		try {
			const result = await client
				.mutation(UPDATE_USER_PREFERENCES_MUTATION, {
					userId,
					...updates
				})
				.toPromise();

			if (result.data?.updateUserPreferences?.userPreference) {
				userPreferences = result.data.updateUserPreferences.userPreference;
				return true;
			} else {
				throw new Error(result.error?.message || 'Failed to update preferences');
			}
		} catch (error) {
			console.error('Error saving preferences:', error);
			alert(
				'Failed to save preferences: ' + (error instanceof Error ? error.message : 'Unknown error')
			);
			return false;
		}
	}

	// Auto-save individual notification setting
	async function saveNotificationSetting(
		settingName: keyof typeof notificationSettings,
		value: boolean
	) {
		if (!isOwnSettings) return;

		try {
			const updates: Record<string, boolean> = {};
			updates[settingName] = value;
			await savePreferences(updates);
		} catch (error) {
			console.error('Error saving notification setting:', error);
			// Revert the setting on error
			notificationSettings[settingName] = !value;
		}
	}
</script>

<svelte:head>
	<title>Settings - SvelteHR</title>
	<meta name="description" content="Manage your account settings and preferences" />
</svelte:head>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
			<Settings class="h-8 w-8" />
			{isOwnSettings ? 'My Settings' : 'User Settings'}
		</h1>
		<p class="text-muted-foreground">
			{isOwnSettings
				? 'Manage your account settings and preferences'
				: 'View settings for this user'}
		</p>
	</div>

	{#if !isOwnSettings}
		<Card.Root class="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
			<Card.Content class="pt-6">
				<div class="flex items-center gap-3">
					<AlertCircle class="h-5 w-5 text-amber-600" />
					<p class="text-sm text-amber-800 dark:text-amber-200">
						You are viewing settings for another user. Some options may not be available.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Profile Information Section -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<User class="h-6 w-6" />
			<h2 class="text-2xl font-semibold">Profile Information</h2>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Personal Details</Card.Title>
				<Card.Description>
					Changes to name and email require approval from HR and will be reviewed within 1-2
					business days
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="firstName">First Name</Label>
						<Input id="firstName" bind:value={profileForm.firstName} disabled={!isOwnSettings} />
					</div>
					<div class="space-y-2">
						<Label for="lastName">Last Name</Label>
						<Input id="lastName" bind:value={profileForm.lastName} disabled={!isOwnSettings} />
					</div>
				</div>
				<div class="space-y-2">
					<Label for="email">Email Address</Label>
					<Input id="email" type="email" bind:value={profileForm.email} disabled={!isOwnSettings} />
				</div>
				<div class="space-y-2">
					<Label for="phone">Phone Number</Label>
					<Input
						id="phone"
						type="tel"
						bind:value={profileForm.phone}
						placeholder="+1 (555) 123-4567"
						disabled={!isOwnSettings}
					/>
				</div>
				<!-- Address Section -->
				<div class="space-y-4 pt-6">
					<h3 class="text-lg font-semibold">Address Information</h3>
					<div class="space-y-2">
						<Label for="address">Street Address</Label>
						<Input
							id="address"
							bind:value={profileForm.address}
							placeholder="123 Main Street"
							disabled={!isOwnSettings}
						/>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="city">City</Label>
							<Input
								id="city"
								bind:value={profileForm.city}
								placeholder="New York"
								disabled={!isOwnSettings}
							/>
						</div>
						<div class="space-y-2">
							<Label for="state">State/Province</Label>
							<Input
								id="state"
								bind:value={profileForm.state}
								placeholder="NY"
								disabled={!isOwnSettings}
							/>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="zipCode">ZIP/Postal Code</Label>
							<Input
								id="zipCode"
								bind:value={profileForm.zipCode}
								placeholder="10001"
								disabled={!isOwnSettings}
							/>
						</div>
						<div class="space-y-2">
							<Label for="country">Country</Label>
							<Input
								id="country"
								bind:value={profileForm.country}
								placeholder="United States"
								disabled={!isOwnSettings}
							/>
						</div>
					</div>
				</div>

				<!-- Emergency Contact Section -->
				<div class="space-y-4 pt-6">
					<h3 class="text-lg font-semibold">Emergency Contact</h3>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="emergencyContactFirstName">First Name</Label>
							<Input
								id="emergencyContactFirstName"
								bind:value={profileForm.emergencyContactFirstName}
								placeholder="Jane"
								disabled={!isOwnSettings}
							/>
						</div>
						<div class="space-y-2">
							<Label for="emergencyContactLastName">Last Name</Label>
							<Input
								id="emergencyContactLastName"
								bind:value={profileForm.emergencyContactLastName}
								placeholder="Doe"
								disabled={!isOwnSettings}
							/>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="emergencyContactPhone">Phone Number</Label>
							<Input
								id="emergencyContactPhone"
								bind:value={profileForm.emergencyContactPhone}
								placeholder="+1 (555) 987-6543"
								disabled={!isOwnSettings}
							/>
						</div>
						<div class="space-y-2">
							<Label for="emergencyContactEmail">Email Address</Label>
							<Input
								id="emergencyContactEmail"
								bind:value={profileForm.emergencyContactEmail}
								placeholder="jane.doe@email.com"
								disabled={!isOwnSettings}
							/>
						</div>
					</div>
					<div class="space-y-2">
						<Label for="emergencyContactRelation">Relationship</Label>
						<Input
							id="emergencyContactRelation"
							bind:value={profileForm.emergencyContactRelation}
							placeholder="Spouse, Parent, Sibling, etc."
							disabled={!isOwnSettings}
						/>
					</div>
				</div>
			</Card.Content>
			{#if isOwnSettings}
				<Card.Footer>
					<Button onclick={submitProfileChanges} disabled={profileForm.submitting}>
						{profileForm.submitting ? 'Submitting...' : 'Request Changes'}
					</Button>
					{#if profileForm.pendingChanges}
						<div class="rounded-md bg-amber-50 p-3 dark:bg-amber-950">
							<p class="text-sm text-amber-800 dark:text-amber-200">
								Changes pending HR approval
								{#if userPreferences?.pendingChangesRequestedAt}
									(requested {new Date(
										userPreferences.pendingChangesRequestedAt
									).toLocaleDateString()})
								{/if}
							</p>
							{#if userPreferences && UserPreferencesService.getPendingChangesSummary(userPreferences).length > 0}
								<ul class="mt-2 text-xs text-amber-700 dark:text-amber-300">
									{#each UserPreferencesService.getPendingChangesSummary(userPreferences) as change}
										<li>• {change}</li>
									{/each}
								</ul>
							{/if}
						</div>
					{/if}
				</Card.Footer>
			{/if}
		</Card.Root>
	</div>

	<!-- Appearance Section -->
	<div class="space-y-4">
		<div class="flex items-center gap-3">
			<Palette class="h-6 w-6" />
			<h2 class="text-2xl font-semibold">Appearance</h2>
		</div>

		<Card.Root>
			<Card.Header>
				<Card.Title>Theme Preferences</Card.Title>
				<Card.Description>Choose how SvelteHR looks</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<Label>Theme</Label>
					<Select.Root type="single" bind:value={selectedTheme} disabled={!isOwnSettings}>
						<Select.Trigger>
							{selectedTheme === 'light'
								? 'Light Mode'
								: selectedTheme === 'dark'
									? 'Dark Mode'
									: selectedTheme === 'system'
										? 'System Default'
										: 'Select theme'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="light">Light Mode</Select.Item>
							<Select.Item value="dark">Dark Mode</Select.Item>
							<Select.Item value="system">System Default</Select.Item>
						</Select.Content>
					</Select.Root>
					<p class="text-xs text-muted-foreground">
						System default automatically switches between light and dark based on your device
						settings
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Notifications Section -->
	{#if isOwnSettings}
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<Bell class="h-6 w-6" />
				<h2 class="text-2xl font-semibold">Notifications</h2>
			</div>

			<Card.Root>
				<Card.Header>
					<Card.Title>Notification Preferences</Card.Title>
					<Card.Description
						>Choose how you want to be notified about important updates</Card.Description
					>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Email Notifications</Label>
							<p class="text-sm text-muted-foreground">Receive important updates via email</p>
						</div>
						<Switch.Root
							bind:checked={notificationSettings.emailNotifications}
							onCheckedChange={(checked) => saveNotificationSetting('emailNotifications', checked)}
							disabled={!isOwnSettings}
						>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Push Notifications</Label>
							<p class="text-sm text-muted-foreground">Get instant notifications in your browser</p>
						</div>
						<Switch.Root
							bind:checked={notificationSettings.pushNotifications}
							onCheckedChange={(checked) => saveNotificationSetting('pushNotifications', checked)}
							disabled={!isOwnSettings}
						>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Leave Reminders</Label>
							<p class="text-sm text-muted-foreground">
								Reminders about upcoming leave and deadlines
							</p>
						</div>
						<Switch.Root
							bind:checked={notificationSettings.leaveReminders}
							onCheckedChange={(checked) => saveNotificationSetting('leaveReminders', checked)}
							disabled={!isOwnSettings}
						>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Performance Updates</Label>
							<p class="text-sm text-muted-foreground">
								Notifications about goal progress and reviews
							</p>
						</div>
						<Switch.Root
							bind:checked={notificationSettings.performanceUpdates}
							onCheckedChange={(checked) => saveNotificationSetting('performanceUpdates', checked)}
							disabled={!isOwnSettings}
						>
							<Switch.Thumb />
						</Switch.Root>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Security Section -->
	{#if isOwnSettings}
		<div class="space-y-4">
			<div class="flex items-center gap-3">
				<Lock class="h-6 w-6" />
				<h2 class="text-2xl font-semibold">Security</h2>
			</div>

			<Card.Root>
				<Card.Header>
					<Card.Title>Change Password</Card.Title>
					<Card.Description>Update your account password for better security</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="currentPassword">Current Password</Label>
						<Input id="currentPassword" type="password" bind:value={passwordForm.currentPassword} />
					</div>
					<div class="space-y-2">
						<Label for="newPassword">New Password</Label>
						<Input id="newPassword" type="password" bind:value={passwordForm.newPassword} />
					</div>
					<div class="space-y-2">
						<Label for="confirmPassword">Confirm New Password</Label>
						<Input id="confirmPassword" type="password" bind:value={passwordForm.confirmPassword} />
					</div>
					{#if passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword}
						<p class="text-sm text-red-600">Passwords do not match</p>
					{/if}
				</Card.Content>
				<Card.Footer>
					<Button
						onclick={changePassword}
						disabled={passwordForm.submitting ||
							!passwordForm.currentPassword ||
							!passwordForm.newPassword ||
							passwordForm.newPassword !== passwordForm.confirmPassword}
					>
						{passwordForm.submitting ? 'Updating...' : 'Update Password'}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	{/if}
</div>
