<script lang="ts">
	// Event Create Page
	// Feature: 019-we-need-to - Task T033
	// Purpose: Form for creating new events

	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import type { EventType, EventVisibilityType } from '$lib/graphql/types';

	let { data }: { data: PageData } = $props();

	// Form state
	let title = $state('');
	let description = $state('');
	let startTime = $state(data.defaultStartTime);
	let endTime = $state(data.defaultEndTime);
	let isAllDay = $state(false);
	let location = $state('');
	let eventType = $state<EventType>('meeting');
	let visibilityType = $state<EventVisibilityType>('company');
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
			// TODO: Implement create event mutation
			// const input = {
			//   title,
			//   description,
			//   startTime,
			//   endTime,
			//   isAllDay,
			//   location,
			//   eventType,
			//   visibilityType,
			//   organizerId: data.user.id
			// };
			// await createEvent(input);

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Navigate to events list on success
			goto('/dashboard/events');
		} catch (error) {
			console.error('Failed to create event:', error);
			alert('Failed to create event. Please try again.');
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
	<title>Create Event - SvelteHR</title>
	<meta name="description" content="Create a new event" />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-8">
	<!-- Back Button -->
	<div class="mb-6">
		<a
			href="/dashboard/events"
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
			Back to Events
		</a>
	</div>

	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Create Event</h1>
		<p class="mt-2 text-gray-600">Create a new event for your team or company</p>
	</div>

	<!-- Event Creation Form -->
	<form onsubmit={handleSubmit} class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<!-- Title -->
		<div class="mb-6">
			<label for="title" class="block text-sm font-medium text-gray-700 mb-2">
				Event Title <span class="text-red-600">*</span>
			</label>
			<input
				type="text"
				id="title"
				bind:value={title}
				required
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.title
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
			<label for="description" class="block text-sm font-medium text-gray-700 mb-2">
				Description
			</label>
			<textarea
				id="description"
				bind:value={description}
				rows="4"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				placeholder="Enter event description"
			></textarea>
		</div>

		<!-- Date and Time Row -->
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Start Time -->
			<div>
				<label for="startTime" class="block text-sm font-medium text-gray-700 mb-2">
					Start Time <span class="text-red-600">*</span>
				</label>
				<input
					type="datetime-local"
					id="startTime"
					bind:value={startTime}
					required
					min={data.minDate}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.startTime
						? 'border-red-500'
						: ''}"
				/>
				{#if errors.startTime}
					<p class="mt-1 text-sm text-red-600">{errors.startTime}</p>
				{/if}
			</div>

			<!-- End Time -->
			<div>
				<label for="endTime" class="block text-sm font-medium text-gray-700 mb-2">
					End Time <span class="text-red-600">*</span>
				</label>
				<input
					type="datetime-local"
					id="endTime"
					bind:value={endTime}
					required
					min={startTime}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 {errors.endTime
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
			<label for="location" class="block text-sm font-medium text-gray-700 mb-2">
				Location
			</label>
			<input
				type="text"
				id="location"
				bind:value={location}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				placeholder="Enter event location"
			/>
		</div>

		<!-- Event Type and Visibility Row -->
		<div class="mb-6 grid gap-4 sm:grid-cols-2">
			<!-- Event Type -->
			<div>
				<label for="eventType" class="block text-sm font-medium text-gray-700 mb-2">
					Event Type <span class="text-red-600">*</span>
				</label>
				<select
					id="eventType"
					bind:value={eventType}
					required
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
				<label for="visibilityType" class="block text-sm font-medium text-gray-700 mb-2">
					Visibility <span class="text-red-600">*</span>
				</label>
				<select
					id="visibilityType"
					bind:value={visibilityType}
					required
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="company">Company-Wide</option>
					<option value="department">Department Only</option>
					<option value="specific">Specific People</option>
				</select>
			</div>
		</div>

		<!-- Attendees Section (TODO) -->
		<div class="mb-6">
			<label class="block text-sm font-medium text-gray-700 mb-2">Attendees</label>
			<div
				class="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600"
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
		<div class="flex items-center justify-end gap-4 border-t border-gray-200 pt-6">
			<a
				href="/dashboard/events"
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Cancel
			</a>
			<button
				type="submit"
				disabled={isSubmitting}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{#if isSubmitting}
					<span class="flex items-center">
						<svg
							class="animate-spin mr-2 h-4 w-4 text-white"
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
						Creating...
					</span>
				{:else}
					Create Event
				{/if}
			</button>
		</div>
	</form>
</div>
