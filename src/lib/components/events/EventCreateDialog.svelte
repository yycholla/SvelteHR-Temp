<script lang="ts">
	/**
	 * EventCreateDialog Component
	 * Feature: 019-we-need-to + 027-we-need-to - Events Management
	 *
	 * Enhanced dialog for creating new events with:
	 * - Image upload with cropping (Feature 027)
	 * - Recurring event patterns with RRULE (Feature 027)
	 * - Attendee picker for private events (Feature 027)
	 * - Capacity limits and waitlist (Feature 027)
	 */

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { X } from '@lucide/svelte';
	import { generateRRule, validate5YearLimit } from '$lib/utils/rrule';
	import type { DayOfWeek } from '$lib/types/events';

	// Import decomposed components
	import EventBasicDetails from './create/EventBasicDetails.svelte';
	import EventDateTime from './create/EventDateTime.svelte';
	import EventRecurrence from './create/EventRecurrence.svelte';
	import EventCapacity from './create/EventCapacity.svelte';
	import EventImageUpload from './create/EventImageUpload.svelte';
	import EventVisibility from './create/EventVisibility.svelte';

	// Export type definitions for test imports
	export interface EventCreateDialogProps {
		isOpen: boolean;
		defaultStartTime?: string;
		defaultEndTime?: string;
		defaultAllDay?: boolean;
		minDate?: string;
		employees?: Array<{
			id: string;
			displayName: string;
			email: string;
			jobTitle?: string;
			department?: { id: string; name: string };
		}>;
		onClose: () => void;
		onSuccess?: () => void;
	}

	const {
		isOpen = false,
		defaultStartTime,
		defaultEndTime,
		defaultAllDay = false,
		minDate,
		employees = [],
		onClose,
		onSuccess
	}: EventCreateDialogProps = $props();

	// Form state
	let startTime = $state(defaultStartTime || '');
	let endTime = $state(defaultEndTime || '');
	let isAllDay = $state(defaultAllDay);
	let isSubmitting = $state(false);
	let visibilityType = $state('company');

	// Feature 027: Recurring event state
	let isRecurring = $state(false);
	let recurrenceFrequency = $state<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
	let recurrenceInterval = $state(1);
	let recurrenceDaysOfWeek = $state<DayOfWeek[]>([]);
	let recurrenceEndDate = $state('');

	// Feature 027: Image upload state
	let uploadedImage = $state<File | null>(null);
	let imageAspectRatio = $state<'16:9' | '9:16'>('16:9');

	// Feature 027: Capacity and waitlist state
	let hasCapacityLimit = $state(false);
	let capacityLimit = $state<number>(50);
	let hasWaitlist = $state(false);

	// Feature 027: Attendee picker state (using tagged search)
	let selectedAttendeeIds = $state<string[]>([]);

	// Derived
	const showAttendeeButton = $derived(visibilityType === 'specific');

	// Convert employees to SearchOption format for MultiSearchInput
	const attendeeOptions = $derived(
		employees.map((e) => ({
			value: e.id,
			label: e.displayName
		}))
	);

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

	// Handle visibility change
	function handleVisibilityChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		visibilityType = target.value;

		// Clear attendees if switching away from specific
		if (visibilityType !== 'specific') {
			selectedAttendeeIds = [];
		}
	}

	// Validate recurrence end date (5-year limit)
	function validateRecurrenceEndDate(): boolean {
		if (!isRecurring || !recurrenceEndDate) return true;

		const start = new Date(startTime);
		const end = new Date(recurrenceEndDate);

		return validate5YearLimit(start, end);
	}

	// Handle image upload
	function handleImageSelected(file: File) {
		uploadedImage = file;
	}

	function handleImageRemoved() {
		uploadedImage = null;
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isOpen && !isSubmitting) {
			onClose();
		}
	}

	// Handle backdrop click
	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget && !isSubmitting) {
			onClose();
		}
	}

	// Enhanced form submission
	async function handleSubmit(e: SubmitEvent) {
		// Validate recurrence end date
		if (isRecurring && !validateRecurrenceEndDate()) {
			toast.error('Recurring events cannot extend beyond 5 years from start date');
			e.preventDefault();
			return;
		}

		// Validate weekly recurrence days
		if (isRecurring && recurrenceFrequency === 'weekly' && recurrenceDaysOfWeek.length === 0) {
			toast.error('Please select at least one day of the week');
			e.preventDefault();
			return;
		}

		// Add RRULE to form data if recurring
		if (isRecurring && recurrenceEndDate) {
			const pattern = {
				frequency: recurrenceFrequency,
				interval: recurrenceInterval,
				daysOfWeek: recurrenceDaysOfWeek,
				endDate: new Date(recurrenceEndDate)
			};

			const rrule = generateRRule(pattern, new Date(startTime));

			// Add hidden input for RRULE
			const form = e.target as HTMLFormElement;
			const rruleInput = document.createElement('input');
			rruleInput.type = 'hidden';
			rruleInput.name = 'rrule';
			rruleInput.value = rrule;
			form.appendChild(rruleInput);
		}

		// Add attendee IDs to form data if specific visibility
		if (visibilityType === 'specific') {
			const form = e.target as HTMLFormElement;
			const attendeeInput = document.createElement('input');
			attendeeInput.type = 'hidden';
			attendeeInput.name = 'attendeeIds';
			attendeeInput.value = JSON.stringify(selectedAttendeeIds);
			form.appendChild(attendeeInput);
		}

		// Handle image upload separately via FormData
		if (uploadedImage) {
			const formData = new FormData(e.target as HTMLFormElement);
			formData.append('eventImage', uploadedImage);
			formData.append('imageAspectRatio', imageAspectRatio);

			// Note: This will be handled by the enhanced form action
		}
	}

	// Reset form when dialog opens
	$effect(() => {
		if (isOpen) {
			startTime = defaultStartTime || '';
			endTime = defaultEndTime || '';
			isAllDay = defaultAllDay;
			visibilityType = 'company';
			isRecurring = false;
			recurrenceFrequency = 'weekly';
			recurrenceInterval = 1;
			recurrenceDaysOfWeek = [];
			recurrenceEndDate = '';
			uploadedImage = null;
			imageAspectRatio = '16:9';
			hasCapacityLimit = false;
			capacityLimit = 50;
			hasWaitlist = false;
			selectedAttendeeIds = [];
		}
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<!-- Modal Backdrop -->
	<div
		class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
		onclick={handleBackdropClick}
		role="presentation"
	>
		<!-- Modal Content -->
		<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border bg-card shadow-lg"
				role="dialog"
				aria-modal="true"
				aria-labelledby="dialog-title"
				data-testid="event-create-dialog"
			>
				<!-- Header -->
				<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
					<h2 id="dialog-title" class="text-xl font-semibold text-foreground">Create Event</h2>
					<button
						type="button"
						onclick={onClose}
						disabled={isSubmitting}
						class="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						aria-label="Close dialog"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<!-- Event Creation Form -->
				<form
					method="POST"
					action="/dashboard/events?/createEvent"
					onsubmit={handleSubmit}
					use:enhance={() => {
						isSubmitting = true;
						return async ({ result, update }) => {
							isSubmitting = false;

							if (result.type === 'success') {
								toast.success('Event created successfully');
								await invalidateAll();
								onClose();
								onSuccess?.();
							} else if (result.type === 'failure') {
								const errorMsg =
									typeof result.data?.error === 'string'
										? result.data.error
										: 'Failed to create event';
								toast.error(errorMsg);
							} else if (result.type === 'error') {
								toast.error('An unexpected error occurred');
							}

							await update();
						};
					}}
					class="p-6 space-y-6"
				>
					<!-- Hidden fields -->
					<input type="hidden" name="timezoneOffset" value={timezoneOffset} />
					<input type="hidden" name="isRecurring" value={isRecurring} />
					<input type="hidden" name="hasCapacityLimit" value={hasCapacityLimit} />
					<input type="hidden" name="hasWaitlist" value={hasWaitlist && hasCapacityLimit} />

					<!-- Basic Details -->
					<EventBasicDetails {isSubmitting} />

					<!-- Date and Time -->
					<EventDateTime
						bind:startTime
						bind:endTime
						bind:isAllDay
						{isSubmitting}
						{minDate}
						onAllDayToggle={handleAllDayToggle}
					/>

					<!-- Recurrence -->
					<EventRecurrence
						bind:isRecurring
						bind:recurrenceFrequency
						bind:recurrenceInterval
						bind:recurrenceDaysOfWeek
						bind:recurrenceEndDate
						{isSubmitting}
						{startTime}
					/>

					<!-- Visibility -->
					<EventVisibility
						bind:visibilityType
						bind:selectedAttendeeIds
						{isSubmitting}
						{attendeeOptions}
						{showAttendeeButton}
						onVisibilityChange={handleVisibilityChange}
					/>

					<!-- Capacity -->
					<EventCapacity bind:hasCapacityLimit bind:capacityLimit bind:hasWaitlist {isSubmitting} />

					<!-- Image Upload -->
					<EventImageUpload
						bind:imageAspectRatio
						{isSubmitting}
						onImageSelected={handleImageSelected}
						onImageRemoved={handleImageRemoved}
					/>

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
							{:else}
								Create Event
							{/if}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
