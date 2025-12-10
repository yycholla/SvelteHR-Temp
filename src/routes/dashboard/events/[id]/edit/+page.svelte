<script lang="ts">
	// Event Edit Page
	// Feature: 019-we-need-to - Task T035
	// Purpose: Form for editing existing events

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import type { EventType, EventVisibilityType } from '$lib/graphql/types';

	const { data }: { data: PageData } = $props();

	// Form state - pre-populate from existing event
	let title = $state(data.event.title);
	let description = $state(data.event.description || '');
	let startTime = $state(data.event.startTime);
	let endTime = $state(data.event.endTime);
	let isAllDay = $state(data.event.isAllDay || false);
	let location = $state(data.event.location || '');
	let eventType = $state<EventType>(data.event.eventType);
	let visibilityType = $state<EventVisibilityType>(data.event.visibilityType || 'company');
	let isSubmitting = $state(false);
	let errors = $state<Record<string, string>>({});

	// Form validation
	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};

		if (!title.trim()) {
			newErrors.title = 'Title is required';
		}

		if (!startTime) {
			newErrors.startTime = 'Start time is required';
		}

		if (!endTime) {
			newErrors.endTime = 'End time is required';
		}

		if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
			newErrors.endTime = 'End time must be after start time';
		}

		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}

	// Handle form submission
	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!validateForm()) {
			return;
		}

		isSubmitting = true;

		try {
			// TODO: Implement update event mutation
			// const input = {
			//   id: data.event.id,
			//   title,
			//   description,
			//   startTime,
			//   endTime,
			//   isAllDay,
			//   location,
			//   eventType,
			//   visibilityType
			// };
			// await updateEvent(input);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Navigate back to event detail on success
			goto(`/dashboard/events/${data.event.id}`);
		} catch (error) {
			console.error('Failed to update event:', error);
			alert('Failed to update event. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

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
	<title>Edit {data.event.title} - MountainHR</title>
	<meta name="description" content="Edit event details" />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href="/dashboard/events/{data.event.id}"
			class="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
		>
			<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				></path>
			</svg>
			Back to Event Details
		</a>
	</div>

	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Edit Event</h1>
		<p class="mt-2 text-gray-600">Update event details for {data.event.title}</p>
	</div>

	<!-- Event Edit Form -->
	<form onsubmit={handleSubmit} class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<!-- Title -->
		<div class="mb-6">
			<label for="title" class="mb-2 block text-sm font-medium text-gray-700">
				Event Title <span class="text-red-600">*</span>
			</label>
			<input
				type="text"
				id="title"
				bind:value={title}
				required
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none {errors.title
					? 'border-red-500'
					: ''}"
				placeholder="Enter event title"
			/>
			{#if errors.title}
				<p class="mt-1 text-sm text-red-600">{errors.title}</p>
			{/if}
		</div>

		<!-- Description -->
		<div class="mb-6">
			<label for="description" class="mb-2 block text-sm font-medium text-gray-700">
				Description
			</label>
			<textarea
				id="description"
				bind:value={description}
				rows="4"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				placeholder="Enter event description"
			></textarea>
		</div>

		<!-- Date and Time Row -->
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Start Time -->
			<div>
				<label for="startTime" class="mb-2 block text-sm font-medium text-gray-700">
					Start Time <span class="text-red-600">*</span>
				</label>
				<input
					type="datetime-local"
					id="startTime"
					bind:value={startTime}
					required
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none {errors.startTime
						? 'border-red-500'
						: ''}"
				/>
				{#if errors.startTime}
					<p class="mt-1 text-sm text-red-600">{errors.startTime}</p>
				{/if}
			</div>

			<!-- End Time -->
			<div>
				<label for="endTime" class="mb-2 block text-sm font-medium text-gray-700">
					End Time <span class="text-red-600">*</span>
				</label>
				<input
					type="datetime-local"
					id="endTime"
					bind:value={endTime}
					required
					min={startTime}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none {errors.endTime
						? 'border-red-500'
						: ''}"
				/>
				{#if errors.endTime}
					<p class="mt-1 text-sm text-red-600">{errors.endTime}</p>
				{/if}
			</div>
		</div>

		<!-- All Day Checkbox -->
		<div class="mb-6">
			<label class="flex items-center">
				<input
					type="checkbox"
					bind:checked={isAllDay}
					onchange={handleAllDayToggle}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<span class="ml-2 text-sm text-gray-700">All-day event</span>
			</label>
		</div>

		<!-- Location -->
		<div class="mb-6">
			<label for="location" class="mb-2 block text-sm font-medium text-gray-700"> Location </label>
			<input
				type="text"
				id="location"
				bind:value={location}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				placeholder="Enter event location"
			/>
		</div>

		<!-- Event Type and Visibility Row -->
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Event Type -->
			<div>
				<label for="eventType" class="mb-2 block text-sm font-medium text-gray-700">
					Event Type <span class="text-red-600">*</span>
				</label>
				<select
					id="eventType"
					bind:value={eventType}
					required
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
				<label for="visibilityType" class="mb-2 block text-sm font-medium text-gray-700">
					Visibility <span class="text-red-600">*</span>
				</label>
				<select
					id="visibilityType"
					bind:value={visibilityType}
					required
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="company">Company-Wide</option>
					<option value="department">Department Only</option>
					<option value="specific">Specific People</option>
				</select>
			</div>
		</div>

		<!-- Attendees Information -->
		<div class="mb-6">
			<div class="mb-2 block text-sm font-medium text-gray-700">Attendees</div>
			<div class="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
				<p class="font-medium">Current attendees: {data.event.attendees?.length || 0}</p>
				<p class="mt-1 text-xs">
					Note: Changing visibility type will affect who can see this event. Existing RSVP statuses
					will be preserved.
				</p>
			</div>
		</div>

		<!-- Event Status Information -->
		{#if data.event.status === 'completed' || data.event.status === 'cancelled'}
			<div class="mb-6">
				<div
					class="rounded-md border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
				>
					<p class="font-medium">
						⚠️ This event is marked as {data.event.status}
					</p>
					<p class="mt-1 text-xs">
						You can still edit the event details, but consider if changes are necessary for past
						events.
					</p>
				</div>
			</div>
		{/if}

		<!-- Form Actions -->
		<div class="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
			<a
				href="/dashboard/events/{data.event.id}"
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={isSubmitting}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#if isSubmitting}
					<span class="flex items-center">
						<svg
							class="mr-2 h-4 w-4 animate-spin text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Updating...
					</span>
				{:else}
					Update Event
				{/if}
			</button>
		</div>
	</form>
</div>
