<script lang="ts">
	import { enhance } from '$app/forms';
	import { Save } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';

	interface Props {
		notificationPrefs: any;
	}

	let { notificationPrefs = $bindable() }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Notification Preferences</Card.Title>
		<Card.Description>
			Manage how you receive notifications about updates and activities
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" action="?/updateNotifications" use:enhance>
			<div class="space-y-6">
				<!-- Email Notifications -->
				<div class="flex items-center justify-between">
					<div class="space-y-0.5">
						<Label>Email Notifications</Label>
						<p class="text-sm text-muted-foreground">Receive notifications via email</p>
					</div>
					<Switch name="emailNotifications" bind:checked={notificationPrefs.emailNotifications} />
				</div>

				<div class="border-t pt-6">
					<h4 class="mb-4 text-sm font-medium">Notification Types</h4>
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label>Leave Request Updates</Label>
								<p class="text-sm text-muted-foreground">Status changes on your leave requests</p>
							</div>
							<Switch
								name="leaveRequestUpdates"
								bind:checked={notificationPrefs.leaveRequestUpdates}
							/>
						</div>

						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label>Task Assignments</Label>
								<p class="text-sm text-muted-foreground">When you're assigned to a new task</p>
							</div>
							<Switch name="taskAssignments" bind:checked={notificationPrefs.taskAssignments} />
						</div>

						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label>Performance Reviews</Label>
								<p class="text-sm text-muted-foreground">
									Reminders and updates about performance reviews
								</p>
							</div>
							<Switch
								name="performanceReviews"
								bind:checked={notificationPrefs.performanceReviews}
							/>
						</div>

						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label>System Announcements</Label>
								<p class="text-sm text-muted-foreground">Important system-wide announcements</p>
							</div>
							<Switch
								name="systemAnnouncements"
								bind:checked={notificationPrefs.systemAnnouncements}
							/>
						</div>

						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label>Team Updates</Label>
								<p class="text-sm text-muted-foreground">Updates from your team and department</p>
							</div>
							<Switch name="teamUpdates" bind:checked={notificationPrefs.teamUpdates} />
						</div>

						<div class="flex items-center justify-between">
							<div class="space-y-0.5">
								<Label>Weekly Digest</Label>
								<p class="text-sm text-muted-foreground">
									Summary of weekly activities and updates
								</p>
							</div>
							<Switch name="weeklyDigest" bind:checked={notificationPrefs.weeklyDigest} />
						</div>
					</div>
				</div>

				<div class="flex justify-end">
					<Button type="submit">
						<Save class="mr-2 h-4 w-4" />
						Save Preferences
					</Button>
				</div>
			</div>
		</form>
	</Card.Content>
</Card.Root>
