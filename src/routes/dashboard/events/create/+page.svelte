<script lang="ts">
	// Event Create Page
	// Feature: 019-we-need-to - Task T033
	// Purpose: Form for creating new events

	import type { PageData, ActionData } from './$types';
	import type { EventType, EventVisibilityType } from '$lib/graphql/types';
	import { enhance } from '$app/forms';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Form state
	let startTime = $state(data.defaultStartTime);
	let endTime = $state(data.defaultEndTime);
	let isAllDay = $state(data.defaultAllDay || false);

	// Handle all-day toggle
	function handleAllDayToggle() {
		if (isAllDay) {
			// When toggling to all-day, set times to start/end of day
			const startDate = new Date(startTime);
			startDate.setHours(0, 0, 0, 0);
			startTime = startDate.toISOString().slice(0, 16);

			const endDate = new Date(endTime);
			endDate.setHours(23, 59, 0, 0);
			endTime = endDate.toISOString().slice(0, 16);
		}
	}
</script>

<svelte:head>
	<title>Create Event - SvelteHR</title>
	<meta name="description" content="Create a new event" />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href="/dashboard/events"
			class="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				></path>
			</svg>
			Back to Events
		</a>
	</div>

	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-foreground">Create Event</h1>
		<p class="mt-2 text-muted-foreground">Create a new event for your team or company</p>
	</div>

	<!-- Event Creation Form -->
	<form method="POST" use:enhance class="rounded-lg border bg-card p-6 shadow-sm">
		{#if form?.error}
			<div class="mb-6 rounded-md bg-destructive/10 border border-destructive px-4 py-3 text-sm text-destructive">
				{form.error}
			</div>
		{/if}
		<!-- Title -->
		<div class="mb-6">
			<label for="title" class="block text-sm font-medium text-foreground mb-2">
				Event Title <span class="text-destructive">*</span>
			</label>
			<input
				type="text"
				id="title"
				name="title"
				required
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				placeholder="Enter event title"
			/>
		</div>

		<!-- Description -->
		<div class="mb-6">
			<label for="description" class="block text-sm font-medium text-foreground mb-2">
				Description
			</label>
			<textarea
				id="description"
				name="description"
				rows="4"
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				placeholder="Enter event description"
			></textarea>
		</div>

		<!-- Date and Time Row -->
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Start Time -->
			<div>
				<label for="startTime" class="block text-sm font-medium text-foreground mb-2">
					Start Time <span class="text-destructive">*</span>
				</label>
				<input
					type="datetime-local"
					id="startTime"
					name="startTime"
					bind:value={startTime}
					required
					min={data.minDate}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>

			<!-- End Time -->
			<div>
				<label for="endTime" class="block text-sm font-medium text-foreground mb-2">
					End Time <span class="text-destructive">*</span>
				</label>
				<input
					type="datetime-local"
					id="endTime"
					name="endTime"
					bind:value={endTime}
					required
					min={startTime}
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				/>
			</div>
		</div>

		<!-- All Day Checkbox -->
		<div class="mb-6">
			<label class="flex items-center cursor-pointer">
				<input
					type="checkbox"
					name="isAllDay"
					bind:checked={isAllDay}
					onchange={handleAllDayToggle}
					class="h-4 w-4 rounded border-input text-primary focus:ring-ring"
				/>
				<span class="ml-2 text-sm text-foreground">All-day event</span>
			</label>
		</div>

		<!-- Location -->
		<div class="mb-6">
			<label for="location" class="block text-sm font-medium text-foreground mb-2">
				Location
			</label>
			<input
				type="text"
				id="location"
				name="location"
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				placeholder="Enter event location"
			/>
		</div>

		<!-- Event Type and Visibility Row -->
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Event Type -->
			<div>
				<label for="eventType" class="block text-sm font-medium text-foreground mb-2">
					Event Type <span class="text-destructive">*</span>
				</label>
				<select
					id="eventType"
					name="eventType"
					required
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="meeting">Meeting</option>
					<option value="training">Training</option>
					<option value="social">Social</option>
					<option value="conference">Conference</option>
					<option value="other">Other</option>
				</select>
			</div>

			<!-- Visibility Type -->
			<div>
				<label for="visibilityType" class="block text-sm font-medium text-foreground mb-2">
					Visibility <span class="text-destructive">*</span>
				</label>
				<select
					id="visibilityType"
					name="visibilityType"
					required
					class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
				>
					<option value="company">Company-Wide</option>
					<option value="department">Department Only</option>
					<option value="specific">Specific People</option>
				</select>
			</div>
		</div>

		<!-- Attendees Section (TODO) -->
		<div class="mb-6">
			<label class="block text-sm font-medium text-foreground mb-2">Attendees</label>
			<div
				class="rounded-md border bg-muted px-4 py-3 text-sm text-muted-foreground"
			>
				<p>
					Attendee selection will be based on the visibility type:
				</p>
				<ul class="mt-2 list-disc list-inside space-y-1">
					<li><strong>Company-Wide:</strong> All employees will be invited</li>
					<li><strong>Department:</strong> All employees in your department will be invited</li>
					<li><strong>Specific People:</strong> You can select individual attendees (coming soon)</li>
				</ul>
			</div>
		</div>

		<!-- Form Actions -->
		<div class="flex items-center justify-end gap-4 border-t pt-6">
			<a
				href="/dashboard/events"
				class="rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				Cancel
			</a>
			<button
				type="submit"
				class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Create Event
			</button>
		</div>
	</form>
</div>
