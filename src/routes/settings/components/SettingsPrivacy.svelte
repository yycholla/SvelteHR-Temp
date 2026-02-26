<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Switch from '$lib/components/ui/switch';
	import { Activity, Download, Save, Shield } from '@lucide/svelte';
	import { profileVisibilityOptions } from '$lib/graphql/settings-operations';
	import type { ActivityLogItem, PrivacySettingsState } from '../types';

	interface Props {
		privacySettings: PrivacySettingsState;
		activityLog: ActivityLogItem[];
		canExportData: boolean;
		isUpdating: boolean;
		onUpdate: () => void;
		onExport: () => void;
	}

	let {
		privacySettings = $bindable(),
		activityLog,
		canExportData,
		isUpdating,
		onUpdate,
		onExport
	}: Props = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

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
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
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
				<Switch.Root
					bind:checked={privacySettings.showOnlineStatus}
					data-testid="show-online-status"
				/>
			</div>

			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Allow Direct Messages</Label>
					<p class="text-sm text-gray-500">Allow colleagues to send you direct messages</p>
				</div>
				<Switch.Root
					bind:checked={privacySettings.allowDirectMessages}
					data-testid="allow-direct-messages"
				/>
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
				<Switch.Root
					bind:checked={privacySettings.analyticsOptOut}
					data-testid="analytics-opt-out"
				/>
			</div>
		</Card.Content>
		<Card.Footer class="flex justify-between">
			{#if canExportData}
				<Button
					variant="outline"
					onclick={onExport}
					disabled={isUpdating}
					data-testid="export-data-button"
				>
					{#if isUpdating}
						<div
							class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent"
						></div>
					{:else}
						<Download class="mr-2 h-4 w-4" />
					{/if}
					{isUpdating ? 'Exporting...' : 'Export Data'}
				</Button>
			{/if}
			<Button onclick={onUpdate} disabled={isUpdating} data-testid="save-privacy-button">
				{#if isUpdating}
					<div
						class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
					></div>
				{:else}
					<Save class="mr-2 h-4 w-4" />
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
						<div class="flex items-center justify-between rounded-md bg-gray-50 p-3">
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
