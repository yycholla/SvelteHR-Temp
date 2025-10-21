<script lang="ts">
	/**
	 * Notification Settings Page
	 * Feature: 027-we-need-to - Task T061
	 * Purpose: UI for configuring event notification preferences
	 */

	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import { Separator } from '$lib/components/ui/separator';
	import { Bell, Mail, MessageSquare, Users, Calendar, Save } from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Local state for form (Svelte 5 runes)
	let emailNotifications = $state(data.preferences.emailNotifications);
	let pushNotifications = $state(data.preferences.pushNotifications);
	let reminderEnabled = $state(data.preferences.reminderDefaults.enabled);
	let minutesBefore = $state(data.preferences.reminderDefaults.minutesBefore);
	let commentMentions = $state(data.preferences.commentMentions);
	let waitlistPromotions = $state(data.preferences.waitlistPromotions);
	let eventUpdates = $state(data.preferences.eventUpdates);

	let isSaving = $state(false);

	// Reminder time options
	const reminderOptions = [
		{ value: 5, label: '5 minutes before' },
		{ value: 15, label: '15 minutes before' },
		{ value: 30, label: '30 minutes before' },
		{ value: 60, label: '1 hour before' },
		{ value: 120, label: '2 hours before' },
		{ value: 1440, label: '1 day before' }
	];

	// Handle form success/error
	$effect(() => {
		if (form?.success) {
			toast.success('Notification preferences saved successfully');
			isSaving = false;
		} else if (form?.error) {
			toast.error(form.error);
			isSaving = false;
		}
	});
</script>

<div class="container max-w-4xl py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold tracking-tight">Notification Settings</h1>
		<p class="mt-2 text-muted-foreground">
			Configure how you want to be notified about events
		</p>
	</div>

	<!-- Settings Form -->
	<form
		method="POST"
		action="?/updatePreferences"
		use:enhance={() => {
			isSaving = true;
			return async ({ update }) => {
				await update();
			};
		}}
	>
		<div class="space-y-6">
			<!-- General Notifications -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Bell class="h-5 w-5" />
						General Notifications
					</Card.Title>
					<Card.Description>
						Choose which channels you want to receive notifications through
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Email Notifications -->
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label class="flex items-center gap-2">
								<Mail class="h-4 w-4" />
								Email Notifications
							</Label>
							<p class="text-sm text-muted-foreground">
								Receive event notifications via email
							</p>
						</div>
						<Switch
							bind:checked={emailNotifications}
							name="emailNotifications"
							value={emailNotifications ? 'true' : 'false'}
						/>
					</div>

					<Separator />

					<!-- Push Notifications -->
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label class="flex items-center gap-2">
								<Bell class="h-4 w-4" />
								Push Notifications
							</Label>
							<p class="text-sm text-muted-foreground">
								Receive browser push notifications for events
							</p>
						</div>
						<Switch
							bind:checked={pushNotifications}
							name="pushNotifications"
							value={pushNotifications ? 'true' : 'false'}
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Event Reminders -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Calendar class="h-5 w-5" />
						Event Reminders
					</Card.Title>
					<Card.Description>
						Configure automatic reminders for accepted events
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Enable Reminders -->
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Enable Automatic Reminders</Label>
							<p class="text-sm text-muted-foreground">
								Automatically set reminders for events you accept
							</p>
						</div>
						<Switch
							bind:checked={reminderEnabled}
							name="reminderEnabled"
							value={reminderEnabled ? 'true' : 'false'}
						/>
					</div>

					{#if reminderEnabled}
						<Separator />

						<!-- Default Reminder Time -->
						<div class="space-y-2">
							<Label for="minutesBefore">Default Reminder Time</Label>
							<Select.Root bind:value={minutesBefore}>
								<Select.Trigger id="minutesBefore" class="w-full">
									<Select.Value placeholder="Select time" />
								</Select.Trigger>
								<Select.Content>
									{#each reminderOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							<input type="hidden" name="minutesBefore" value={minutesBefore} />
							<p class="text-sm text-muted-foreground">
								How long before an event should you be reminded
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Event Activity Notifications -->
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<MessageSquare class="h-5 w-5" />
						Event Activity
					</Card.Title>
					<Card.Description>
						Get notified about activity on events you're attending
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-4">
					<!-- Comment Mentions -->
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Comment Mentions</Label>
							<p class="text-sm text-muted-foreground">
								When someone @mentions you in event comments
							</p>
						</div>
						<Switch
							bind:checked={commentMentions}
							name="commentMentions"
							value={commentMentions ? 'true' : 'false'}
						/>
					</div>

					<Separator />

					<!-- Event Updates -->
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label>Event Updates</Label>
							<p class="text-sm text-muted-foreground">
								When event details change (time, location, etc.)
							</p>
						</div>
						<Switch
							bind:checked={eventUpdates}
							name="eventUpdates"
							value={eventUpdates ? 'true' : 'false'}
						/>
					</div>

					<Separator />

					<!-- Waitlist Promotions -->
					<div class="flex items-center justify-between">
						<div class="space-y-0.5">
							<Label class="flex items-center gap-2">
								<Users class="h-4 w-4" />
								Waitlist Promotions
							</Label>
							<p class="text-sm text-muted-foreground">
								When you're promoted from waitlist to attendee
							</p>
						</div>
						<Switch
							bind:checked={waitlistPromotions}
							name="waitlistPromotions"
							value={waitlistPromotions ? 'true' : 'false'}
						/>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Save Button -->
			<div class="flex justify-end">
				<Button type="submit" disabled={isSaving}>
					<Save class="mr-2 h-4 w-4" />
					{isSaving ? 'Saving...' : 'Save Preferences'}
				</Button>
			</div>
		</div>
	</form>
</div>
