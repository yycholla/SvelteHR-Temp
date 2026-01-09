<script lang="ts">
	import { logger } from '$lib/utils/logger';
	/**
	 * Profile Settings Page
	 * Allows users to manage their profile settings, notification preferences, and theme
	 */

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Tabs from '$lib/components/ui/tabs';
	import { setMode, userPrefersMode } from 'mode-watcher';
	import {
		Bell,
		Palette,
		User
	} from '@lucide/svelte';

	// Import decomposed components
	import ProfileGeneralSettings from './components/ProfileGeneralSettings.svelte';
	import ProfileNotificationSettings from './components/ProfileNotificationSettings.svelte';
	import ProfileAppearanceSettings from './components/ProfileAppearanceSettings.svelte';

	interface Props {
		data: {
			user: any;
			profile: any;
			notificationPreferences: any;
			themePreference: string;
		};
		form?: any;
	}

	const { data, form }: Props = $props();

	let activeTab = $state('general');

	// Form states for profile edit
	let profileChanges = $state({
		firstName: data.profile.firstName || '',
		lastName: data.profile.lastName || '',
		displayName: data.profile.displayName || '',
		email: data.profile.email || '',
		phoneNumber: data.profile.phoneNumber || '',
		mobileNumber: data.profile.mobileNumber || '',
		addressLine1: data.profile.addressLine1 || '',
		addressLine2: data.profile.addressLine2 || '',
		city: data.profile.city || '',
		stateProvince: data.profile.stateProvince || '',
		postalCode: data.profile.postalCode || '',
		country: data.profile.country || 'United States',
		reason: ''
	});

	// Notification preferences state
	let notificationPrefs = $state({ ...data.notificationPreferences });
	let selectedTheme = $state(data.themePreference);

	// Initialize theme with database value on mount
	onMount(() => {
		// Sync mode-watcher with database value
		if (data.themePreference && data.themePreference !== userPrefersMode.current) {
			setMode(data.themePreference as 'light' | 'dark' | 'system');
		}
	});

	// Handle theme update manually to avoid infinite loops
	async function handleThemeSubmit(event: Event) {
		event.preventDefault();

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);
		const theme = formData.get('theme') as string;

		logger.info(`[Settings] Submitting theme: ${theme}`);

		try {
			const response = await fetch(form.action, {
				method: 'POST',
				body: formData,
				headers: {
					Accept: 'application/json'
				}
			});

			// SvelteKit form actions return JSON with type and data properties
			const result = await response.json();
			logger.info(`[Settings] Server response: ${result}`);

			if (result.type === 'success' || (response.ok && result.data?.success)) {
				logger.info('[Settings] Theme update successful');
				toast.success(`Theme updated to ${theme}`);

				// Apply theme immediately via mode-watcher
				setMode(theme as 'light' | 'dark' | 'system');
				logger.info(`[Settings] Theme applied: ${theme}`);
			} else {
				const errorMsg = result.data?.error || result.error || 'Failed to update theme';
				logger.error('[Settings] Theme update failed:', result);
				toast.error(errorMsg);
			}
		} catch (error) {
			logger.error('[Settings] Theme update error:', error as Error);
			toast.error('Failed to update theme preference');
		}
	}
</script>

<svelte:head>
	<title>Profile Settings - MountainHR</title>
	<meta name="description" content="Manage your profile settings, notifications, and preferences" />
</svelte:head>

<div class="space-y-6">
	<!-- Page Header -->
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Settings</h1>
		<p class="text-muted-foreground">Manage your profile settings and preferences</p>
	</div>

	<!-- Settings Tabs -->
	<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v)}>
		<Tabs.List class="grid w-full grid-cols-3">
			<Tabs.Trigger value="general">
				<User class="mr-2 h-4 w-4" />
				General
			</Tabs.Trigger>
			<Tabs.Trigger value="notifications">
				<Bell class="mr-2 h-4 w-4" />
				Notifications
			</Tabs.Trigger>
			<Tabs.Trigger value="appearance">
				<Palette class="mr-2 h-4 w-4" />
				Appearance
			</Tabs.Trigger>
		</Tabs.List>

		<!-- General Settings Tab -->
		<Tabs.Content value="general">
			<ProfileGeneralSettings
				bind:profileChanges
				originalProfile={data.profile}
			/>
		</Tabs.Content>

		<!-- Notifications Settings Tab -->
		<Tabs.Content value="notifications">
			<ProfileNotificationSettings
				bind:notificationPrefs
			/>
		</Tabs.Content>

		<!-- Appearance Settings Tab -->
		<Tabs.Content value="appearance">
			<ProfileAppearanceSettings
				bind:selectedTheme
				onThemeSubmit={handleThemeSubmit}
			/>
		</Tabs.Content>
	</Tabs.Root>
</div>