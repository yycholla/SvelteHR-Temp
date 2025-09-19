<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		Settings,
		Save,
		RotateCcw,
		Database,
		Mail,
		Lock,
		Globe,
		Bell,
		Palette,
		Clock,
		Shield,
		ArrowLeft
	} from 'lucide-svelte';

	// Settings state
	let settings = $state({
		general: {
			appName: 'SvelteHR',
			appVersion: '2.1.0',
			timezone: 'UTC-5',
			dateFormat: 'MM/DD/YYYY',
			language: 'en'
		},
		security: {
			sessionTimeout: 30,
			passwordMinLength: 8,
			requireTwoFactor: false,
			allowPublicRegistration: false,
			maxLoginAttempts: 5
		},
		email: {
			smtpHost: 'smtp.company.com',
			smtpPort: 587,
			smtpUser: 'notifications@company.com',
			smtpPassword: '••••••••',
			enableNotifications: true,
			fromEmail: 'hr@company.com'
		},
		notifications: {
			emailAlerts: true,
			systemAlerts: true,
			maintenanceMode: false,
			debugMode: false
		},
		appearance: {
			theme: 'light',
			primaryColor: '#3b82f6',
			logoUrl: '/logo.png'
		}
	});

	let loading = $state(false);
	let unsavedChanges = $state(false);

	// Simulate save
	function saveSettings() {
		loading = true;
		setTimeout(() => {
			loading = false;
			unsavedChanges = false;
			console.log('Settings saved:', settings);
		}, 1500);
	}

	// Reset to defaults
	function resetSettings() {
		// Reset logic would go here
		unsavedChanges = true;
	}

	// Mark as changed when inputs change
	function markAsChanged() {
		unsavedChanges = true;
	}
</script>

<svelte:head>
	<title>System Settings - Admin Dashboard</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center gap-3 mb-2">
				<Button variant="ghost" size="sm" href="/dashboard/admin" class="p-2">
					<ArrowLeft class="h-4 w-4" />
				</Button>
				<h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
					<Settings class="h-8 w-8" />
					System Configuration
				</h1>
			</div>
			<p class="text-muted-foreground">
				Configure system settings and application parameters
			</p>
		</div>
		<div class="flex items-center gap-3">
			{#if unsavedChanges}
				<Badge variant="secondary">Unsaved Changes</Badge>
			{/if}
			<Button variant="outline" onclick={resetSettings}>
				<RotateCcw class="h-4 w-4 mr-2" />
				Reset
			</Button>
			<Button onclick={saveSettings} disabled={loading}>
				{#if loading}
					<div class="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
				{:else}
					<Save class="h-4 w-4 mr-2" />
				{/if}
				Save Changes
			</Button>
		</div>
	</div>

	<!-- Settings Tabs -->
	<Tabs.Root value="general" class="space-y-6">
		<Tabs.List class="grid w-full grid-cols-5">
			<Tabs.Trigger value="general" class="flex items-center gap-2">
				<Globe class="h-4 w-4" />
				General
			</Tabs.Trigger>
			<Tabs.Trigger value="security" class="flex items-center gap-2">
				<Shield class="h-4 w-4" />
				Security
			</Tabs.Trigger>
			<Tabs.Trigger value="email" class="flex items-center gap-2">
				<Mail class="h-4 w-4" />
				Email
			</Tabs.Trigger>
			<Tabs.Trigger value="notifications" class="flex items-center gap-2">
				<Bell class="h-4 w-4" />
				Notifications
			</Tabs.Trigger>
			<Tabs.Trigger value="appearance" class="flex items-center gap-2">
				<Palette class="h-4 w-4" />
				Appearance
			</Tabs.Trigger>
		</Tabs.List>

		<!-- General Settings -->
		<Tabs.Content value="general">
			<Card.Root>
				<Card.Header>
					<Card.Title>General Settings</Card.Title>
					<Card.Description>Basic application configuration and regional settings</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-2">
							<Label for="appName">Application Name</Label>
							<Input
								id="appName"
								bind:value={settings.general.appName}
								oninput={markAsChanged}
							/>
						</div>
						<div class="space-y-2">
							<Label for="appVersion">Version</Label>
							<Input
								id="appVersion"
								bind:value={settings.general.appVersion}
								readonly
								class="bg-muted"
							/>
						</div>
						<div class="space-y-2">
							<Label for="timezone">Timezone</Label>
							<Select.Root>
								<Select.Trigger>
									<Select.Value placeholder={settings.general.timezone} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="UTC-8">UTC-8 (Pacific)</Select.Item>
									<Select.Item value="UTC-5">UTC-5 (Eastern)</Select.Item>
									<Select.Item value="UTC+0">UTC+0 (GMT)</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
						<div class="space-y-2">
							<Label for="dateFormat">Date Format</Label>
							<Select.Root>
								<Select.Trigger>
									<Select.Value placeholder={settings.general.dateFormat} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="MM/DD/YYYY">MM/DD/YYYY</Select.Item>
									<Select.Item value="DD/MM/YYYY">DD/MM/YYYY</Select.Item>
									<Select.Item value="YYYY-MM-DD">YYYY-MM-DD</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Security Settings -->
		<Tabs.Content value="security">
			<Card.Root>
				<Card.Header>
					<Card.Title>Security Settings</Card.Title>
					<Card.Description>Authentication, authorization, and security policies</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-2">
							<Label for="sessionTimeout">Session Timeout (minutes)</Label>
							<Input
								id="sessionTimeout"
								type="number"
								bind:value={settings.security.sessionTimeout}
								oninput={markAsChanged}
							/>
						</div>
						<div class="space-y-2">
							<Label for="passwordMinLength">Minimum Password Length</Label>
							<Input
								id="passwordMinLength"
								type="number"
								bind:value={settings.security.passwordMinLength}
								oninput={markAsChanged}
							/>
						</div>
						<div class="space-y-2">
							<Label for="maxLoginAttempts">Max Login Attempts</Label>
							<Input
								id="maxLoginAttempts"
								type="number"
								bind:value={settings.security.maxLoginAttempts}
								oninput={markAsChanged}
							/>
						</div>
					</div>

					<Separator />

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Require Two-Factor Authentication</Label>
								<p class="text-sm text-muted-foreground">Enforce 2FA for all users</p>
							</div>
							<Switch
								bind:checked={settings.security.requireTwoFactor}
								onchange={markAsChanged}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Allow Public Registration</Label>
								<p class="text-sm text-muted-foreground">Allow users to self-register</p>
							</div>
							<Switch
								bind:checked={settings.security.allowPublicRegistration}
								onchange={markAsChanged}
							/>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Email Settings -->
		<Tabs.Content value="email">
			<Card.Root>
				<Card.Header>
					<Card.Title>Email Configuration</Card.Title>
					<Card.Description>SMTP settings and email notifications</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-2">
							<Label for="smtpHost">SMTP Host</Label>
							<Input
								id="smtpHost"
								bind:value={settings.email.smtpHost}
								oninput={markAsChanged}
							/>
						</div>
						<div class="space-y-2">
							<Label for="smtpPort">SMTP Port</Label>
							<Input
								id="smtpPort"
								type="number"
								bind:value={settings.email.smtpPort}
								oninput={markAsChanged}
							/>
						</div>
						<div class="space-y-2">
							<Label for="smtpUser">SMTP Username</Label>
							<Input
								id="smtpUser"
								bind:value={settings.email.smtpUser}
								oninput={markAsChanged}
							/>
						</div>
						<div class="space-y-2">
							<Label for="smtpPassword">SMTP Password</Label>
							<Input
								id="smtpPassword"
								type="password"
								bind:value={settings.email.smtpPassword}
								oninput={markAsChanged}
							/>
						</div>
						<div class="space-y-2">
							<Label for="fromEmail">From Email Address</Label>
							<Input
								id="fromEmail"
								type="email"
								bind:value={settings.email.fromEmail}
								oninput={markAsChanged}
							/>
						</div>
					</div>

					<Separator />

					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<Label>Enable Email Notifications</Label>
							<p class="text-sm text-muted-foreground">Send automated email notifications</p>
						</div>
						<Switch
							bind:checked={settings.email.enableNotifications}
							onchange={markAsChanged}
						/>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Notifications Settings -->
		<Tabs.Content value="notifications">
			<Card.Root>
				<Card.Header>
					<Card.Title>Notification Settings</Card.Title>
					<Card.Description>System alerts and notification preferences</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Email Alerts</Label>
								<p class="text-sm text-muted-foreground">Send email alerts for critical events</p>
							</div>
							<Switch
								bind:checked={settings.notifications.emailAlerts}
								onchange={markAsChanged}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>System Alerts</Label>
								<p class="text-sm text-muted-foreground">Show in-app system notifications</p>
							</div>
							<Switch
								bind:checked={settings.notifications.systemAlerts}
								onchange={markAsChanged}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Maintenance Mode</Label>
								<p class="text-sm text-muted-foreground">Put system in maintenance mode</p>
							</div>
							<Switch
								bind:checked={settings.notifications.maintenanceMode}
								onchange={markAsChanged}
							/>
						</div>
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label>Debug Mode</Label>
								<p class="text-sm text-muted-foreground">Enable debug logging and errors</p>
							</div>
							<Switch
								bind:checked={settings.notifications.debugMode}
								onchange={markAsChanged}
							/>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Appearance Settings -->
		<Tabs.Content value="appearance">
			<Card.Root>
				<Card.Header>
					<Card.Title>Appearance Settings</Card.Title>
					<Card.Description>Theme, branding, and visual customization</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-2">
							<Label for="theme">Theme</Label>
							<Select.Root>
								<Select.Trigger>
									<Select.Value placeholder={settings.appearance.theme} />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="light">Light</Select.Item>
									<Select.Item value="dark">Dark</Select.Item>
									<Select.Item value="auto">Auto</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
						<div class="space-y-2">
							<Label for="primaryColor">Primary Color</Label>
							<div class="flex items-center gap-3">
								<Input
									id="primaryColor"
									bind:value={settings.appearance.primaryColor}
									oninput={markAsChanged}
								/>
								<div
									class="w-10 h-10 rounded border"
									style="background-color: {settings.appearance.primaryColor}"
								></div>
							</div>
						</div>
						<div class="space-y-2 md:col-span-2">
							<Label for="logoUrl">Logo URL</Label>
							<Input
								id="logoUrl"
								bind:value={settings.appearance.logoUrl}
								oninput={markAsChanged}
								placeholder="https://example.com/logo.png"
							/>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>