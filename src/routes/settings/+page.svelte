<script lang="ts">
	import { currentUser } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Switch from '$lib/components/ui/switch';
	import { Settings, Bell, Shield, Palette, Globe, ArrowLeft } from 'lucide-svelte';

	let notificationSettings = $state({
		emailNotifications: true,
		pushNotifications: false,
		leaveReminders: true,
		performanceUpdates: true
	});

	let appearanceSettings = $state({
		darkMode: false,
		compactView: false,
		language: 'en'
	});

	let privacySettings = $state({
		profileVisibility: 'team',
		dataSharing: false,
		analyticsOptOut: false
	});
</script>

<svelte:head>
	<title>Settings - SvelteHR</title>
	<meta name="description" content="Manage your account settings and preferences" />
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center space-x-4">
		<Button variant="outline" size="sm" href="/dashboard">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Dashboard
		</Button>

		<div>
			<h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
				<Settings class="h-8 w-8" />
				Settings
			</h1>
			<p class="text-muted-foreground">Manage your account settings and preferences</p>
		</div>
	</div>

	<!-- Settings Tabs -->
	<Tabs.Root value="general" class="w-full">
		<Tabs.List class="grid w-full grid-cols-4">
			<Tabs.Trigger value="general">General</Tabs.Trigger>
			<Tabs.Trigger value="notifications">Notifications</Tabs.Trigger>
			<Tabs.Trigger value="appearance">Appearance</Tabs.Trigger>
			<Tabs.Trigger value="privacy">Privacy</Tabs.Trigger>
		</Tabs.List>

		<!-- General Settings -->
		<Tabs.Content value="general" class="space-y-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Profile Information</Card.Title>
					<Card.Description>Update your personal information and contact details</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="firstName">First Name</Label>
							<Input id="firstName" value={$currentUser?.display_name?.split(' ')[0] || ''} />
						</div>
						<div class="space-y-2">
							<Label for="lastName">Last Name</Label>
							<Input id="lastName" value={$currentUser?.display_name?.split(' ')[1] || ''} />
						</div>
					</div>
					<div class="space-y-2">
						<Label for="email">Email Address</Label>
						<Input id="email" type="email" value={$currentUser?.email || ''} />
					</div>
					<div class="space-y-2">
						<Label for="phone">Phone Number</Label>
						<Input id="phone" type="tel" placeholder="+1 (555) 123-4567" />
					</div>
					<div class="space-y-2">
						<Label for="department">Department</Label>
						<Input id="department" value="Engineering" readonly />
					</div>
				</Card.Content>
				<Card.Footer>
					<Button>Save Changes</Button>
				</Card.Footer>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Account Security</Card.Title>
					<Card.Description>Manage your password and security settings</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<div class="space-y-2">
						<Label for="currentPassword">Current Password</Label>
						<Input id="currentPassword" type="password" />
					</div>
					<div class="space-y-2">
						<Label for="newPassword">New Password</Label>
						<Input id="newPassword" type="password" />
					</div>
					<div class="space-y-2">
						<Label for="confirmPassword">Confirm New Password</Label>
						<Input id="confirmPassword" type="password" />
					</div>
				</Card.Content>
				<Card.Footer>
					<Button variant="outline">Update Password</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<!-- Notification Settings -->
		<Tabs.Content value="notifications" class="space-y-6">
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
							<p class="text-sm text-muted-foreground">Receive important updates via email</p>
						</div>
						<Switch.Root bind:checked={notificationSettings.emailNotifications}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Push Notifications</Label>
							<p class="text-sm text-muted-foreground">Get instant notifications in your browser</p>
						</div>
						<Switch.Root bind:checked={notificationSettings.pushNotifications}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Leave Reminders</Label>
							<p class="text-sm text-muted-foreground">Reminders about upcoming leave and deadlines</p>
						</div>
						<Switch.Root bind:checked={notificationSettings.leaveReminders}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Performance Updates</Label>
							<p class="text-sm text-muted-foreground">Notifications about goal progress and reviews</p>
						</div>
						<Switch.Root bind:checked={notificationSettings.performanceUpdates}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
				</Card.Content>
				<Card.Footer>
					<Button>Save Preferences</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<!-- Appearance Settings -->
		<Tabs.Content value="appearance" class="space-y-6">
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
							<p class="text-sm text-muted-foreground">Switch to dark theme</p>
						</div>
						<Switch.Root bind:checked={appearanceSettings.darkMode}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Compact View</Label>
							<p class="text-sm text-muted-foreground">Show more content in less space</p>
						</div>
						<Switch.Root bind:checked={appearanceSettings.compactView}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="space-y-2">
						<Label for="language">Language</Label>
						<select
							id="language"
							bind:value={appearanceSettings.language}
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
						>
							<option value="en">English</option>
							<option value="es">Spanish</option>
							<option value="fr">French</option>
							<option value="de">German</option>
						</select>
					</div>
				</Card.Content>
				<Card.Footer>
					<Button>Apply Changes</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>

		<!-- Privacy Settings -->
		<Tabs.Content value="privacy" class="space-y-6">
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
							class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
						>
							<option value="public">Everyone</option>
							<option value="team">Team Members Only</option>
							<option value="managers">Managers Only</option>
							<option value="private">Private</option>
						</select>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Data Sharing</Label>
							<p class="text-sm text-muted-foreground">Share anonymized data for product improvement</p>
						</div>
						<Switch.Root bind:checked={privacySettings.dataSharing}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Analytics Opt-out</Label>
							<p class="text-sm text-muted-foreground">Disable usage analytics and tracking</p>
						</div>
						<Switch.Root bind:checked={privacySettings.analyticsOptOut}>
							<Switch.Thumb />
						</Switch.Root>
					</div>
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button variant="outline">Export Data</Button>
					<Button>Save Settings</Button>
				</Card.Footer>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>