<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { EventType, EventVisibilityType } from '$lib/graphql/types';
	import type { EventData } from './types';

	interface Props {
		event: EventData;
		onClose: () => void;
		onSuccess?: () => void;
	}

	const { event, onClose, onSuccess }: Props = $props();

	// Form state initialized from props
	let title = $state(event.title);
	let description = $state(event.description || '');
	let startTime = $state(event.startTime.slice(0, 16));
	let endTime = $state(event.endTime.slice(0, 16));
	let isAllDay = $state(event.allDay || false);
	let location = $state(event.location || '');
	let eventType = $state<EventType>(event.eventType);
	let visibilityType = $state<EventVisibilityType>(event.visibilityType || 'company');
	let isSubmitting = $state(false);

	// Get user's timezone offset in minutes
	const timezoneOffset = new Date().getTimezoneOffset();

	// Handle all-day toggle
	function handleAllDayToggle() {
		if (isAllDay) {
			const startDate = new Date(startTime);
			startDate.setHours(0, 0, 0, 0);
			startTime = startDate.toISOString().slice(0, 16);

			const endDate = new Date(endTime);
			endDate.setHours(23, 59, 0, 0);
			endTime = endDate.toISOString().slice(0, 16);
		}
	}
</script>

<form
	method="POST"
	action="/dashboard/events?/updateEvent"
	use:enhance={() => {
		isSubmitting = true;
		return async ({ result, update }) => {
			isSubmitting = false;

			if (result.type === 'success') {
				toast.success('Event updated successfully');
				await invalidateAll();
				onClose();
				onSuccess?.();
			} else if (result.type === 'failure') {
				const errorMsg = (result.data as any)?.error || 'Failed to update event';
				toast.error(errorMsg);
			} else if (result.type === 'error') {
				toast.error('An unexpected error occurred');
			}

			await update();
		};
	}}
	class="p-6 overflow-y-auto"
>
	<!-- Hidden fields -->
	<input type="hidden" name="eventId" value={event.id} />
	<input type="hidden" name="timezoneOffset" value={timezoneOffset} />

	<!-- Title -->
	<div class="mb-4">
		<label for="title" class="block text-sm font-medium text-foreground mb-2">
			Event Title <span class="text-destructive">*</span>
		</label>
		<input
			type="text"
			id="title"
			name="title"
			bind:value={title}
			required
			disabled={isSubmitting}
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	</div>

	<!-- Description -->
	<div class="mb-4">
		<label for="description" class="block text-sm font-medium text-foreground mb-2">
			Description
		</label>
		<textarea
			id="description"
			name="description"
			bind:value={description}
			rows="4"
			disabled={isSubmitting}
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		></textarea>
	</div>

	<!-- Date and Time -->
	<div class="mb-4 grid gap-4 sm:grid-cols-2">
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
				disabled={isSubmitting}
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
			/>
		</div>

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
				disabled={isSubmitting}
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
			/>
		</div>
	</div>

	<!-- All Day -->
	<div class="mb-4">
		<label class="flex items-center cursor-pointer">
			<input
				type="checkbox"
				name="isAllDay"
				bind:checked={isAllDay}
				onchange={handleAllDayToggle}
				disabled={isSubmitting}
				class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
			/>
			<span class="ml-2 text-sm text-foreground">All-day event</span>
		</label>
	</div>

	<!-- Location -->
	<div class="mb-4">
		<label for="location" class="block text-sm font-medium text-foreground mb-2"> Location </label>
		<input
			type="text"
			id="location"
			name="location"
			bind:value={location}
			disabled={isSubmitting}
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	</div>

	<!-- Event Type and Visibility -->
	<div class="mb-6 grid gap-4 sm:grid-cols-2">
		<div>
			<label for="eventType" class="block text-sm font-medium text-foreground mb-2">
				Event Type <span class="text-destructive">*</span>
			</label>
			<select
				id="eventType"
				name="eventType"
				bind:value={eventType}
				required
				disabled={isSubmitting}
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<option value="meeting">Meeting</option>
				<option value="training">Training</option>
				<option value="social">Social</option>
				<option value="conference">Conference</option>
				<option value="other">Other</option>
			</select>
		</div>

		<div>
			<label for="visibilityType" class="block text-sm font-medium text-foreground mb-2">
				Visibility <span class="text-destructive">*</span>
			</label>
			<select
				id="visibilityType"
				name="visibilityType"
				bind:value={visibilityType}
				required
				disabled={isSubmitting}
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<option value="company">Company-Wide</option>
				<option value="department">Department Only</option>
				<option value="specific">Specific People</option>
			</select>
		</div>
	</div>

	<!-- Form Actions -->
	<div class="flex items-center justify-end gap-4 border-t pt-6">
		<button
			type="button"
			onclick={onClose}
			disabled={isSubmitting}
			class="rounded-md border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={isSubmitting}
			class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if isSubmitting}
				<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Saving...
			{:else}
				Save Changes
			{/if}
		</button>
	</div>
</form>
