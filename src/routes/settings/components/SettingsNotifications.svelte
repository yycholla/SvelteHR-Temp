<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Switch from '$lib/components/ui/switch';
	import { Bell, Save } from '@lucide/svelte';
	import type { NotificationSettingsState } from '../types';

	interface Props {
		notificationSettings: NotificationSettingsState;
		isUpdating: boolean;
		onUpdate: () => void;
	}

	let { notificationSettings = $bindable(), isUpdating, onUpdate }: Props = $props();
</script>

<div class="space-y-6" data-testid="notifications-content">
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Bell class="h-5 w-5" />
				Notification Preferences
			</Card.Title>
			<Card.Description>Choose how you want to be notified about important updates</Card.Description
			>
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
				<Switch.Root
					bind:checked={notificationSettings.leaveReminders}
					data-testid="leave-reminders"
				/>
			</div>

			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Performance Updates</Label>
					<p class="text-sm text-gray-500">Notifications about goal progress and reviews</p>
				</div>
				<Switch.Root
					bind:checked={notificationSettings.performanceUpdates}
					data-testid="performance-updates"
				/>
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
			<Button onclick={onUpdate} disabled={isUpdating} data-testid="save-notifications-button">
				{#if isUpdating}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
				{:else}
					<Save class="mr-2 h-4 w-4" />
				{/if}
				{isUpdating ? 'Saving...' : 'Save Preferences'}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
