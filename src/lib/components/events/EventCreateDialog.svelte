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
	import { X, Repeat, Users as UsersIcon, Image as ImageIcon } from 'lucide-svelte';
	import ImageUploadWidget from './ImageUploadWidget.svelte';
	import AttendeePickerModal from './AttendeePickerModal.svelte';
	import { generateRRule, validate5YearLimit } from '$lib/utils/rrule';
	import type { RecurrencePattern } from '$lib/utils/rrule';

	interface Props {
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

	let {
		isOpen = false,
		defaultStartTime,
		defaultEndTime,
		defaultAllDay = false,
		minDate,
		employees = [],
		onClose,
		onSuccess
	}: Props = $props();

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
	let recurrenceDaysOfWeek = $state<number[]>([]);
	let recurrenceEndDate = $state('');

	// Feature 027: Image upload state
	let uploadedImage = $state<File | null>(null);
	let imageAspectRatio = $state<'16:9' | '9:16'>('16:9');

	// Feature 027: Capacity and waitlist state
	let hasCapacityLimit = $state(false);
	let capacityLimit = $state<number>(50);
	let hasWaitlist = $state(false);

	// Feature 027: Attendee picker state
	let showAttendeePicker = $state(false);
	let selectedAttendeeIds = $state<string[]>([]);

	// Derived
	let showAttendeeButton = $derived(visibilityType === 'specific');
	let selectedAttendees = $derived(
		employees.filter(e => selectedAttendeeIds.includes(e.id))
	);

	// Get user's timezone offset in minutes
	const timezoneOffset = new Date().getTimezoneOffset();

	// Weekday options for weekly recurrence
	const WEEKDAYS = [
		{ value: 0, label: 'Sun' },
		{ value: 1, label: 'Mon' },
		{ value: 2, label: 'Tue' },
		{ value: 3, label: 'Wed' },
		{ value: 4, label: 'Thu' },
		{ value: 5, label: 'Fri' },
		{ value: 6, label: 'Sat' }
	];

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

	// Toggle weekday selection
	function toggleWeekday(day: number) {
		if (recurrenceDaysOfWeek.includes(day)) {
			recurrenceDaysOfWeek = recurrenceDaysOfWeek.filter(d => d !== day);
		} else {
			recurrenceDaysOfWeek = [...recurrenceDaysOfWeek, day].sort();
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
			const pattern: RecurrencePattern = {
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
			>
				<!-- Header -->
				<div class="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-6 py-4">
					<h2 id="dialog-title" class="text-xl font-semibold text-foreground">
						Create Event
					</h2>
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
								const errorMsg = result.data?.error || 'Failed to create event';
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

					<!-- Title -->
					<div>
						<label for="title" class="block text-sm font-medium text-foreground mb-2">
							Event Title <span class="text-destructive">*</span>
						</label>
						<input
							type="text"
							id="title"
							name="title"
							required
							maxlength="200"
							disabled={isSubmitting}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							placeholder="Enter event title"
						/>
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="block text-sm font-medium text-foreground mb-2">
							Description
						</label>
						<textarea
							id="description"
							name="description"
							rows="4"
							maxlength="5000"
							disabled={isSubmitting}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							placeholder="Enter event description"
						></textarea>
					</div>

					<!-- Date and Time Row -->
					<div class="grid gap-4 sm:grid-cols-2">
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
								min={minDate}
								disabled={isSubmitting}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
								disabled={isSubmitting}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							/>
						</div>
					</div>

					<!-- All Day Checkbox -->
					<div>
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

					<!-- Feature 027: Recurring Event Section -->
					<div class="rounded-lg border bg-muted/50 p-4">
						<label class="flex items-center cursor-pointer mb-3">
							<input
								type="checkbox"
								bind:checked={isRecurring}
								disabled={isSubmitting}
								class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							/>
							<span class="ml-2 text-sm font-medium text-foreground flex items-center gap-2">
								<Repeat class="h-4 w-4" />
								Make this a recurring event
							</span>
						</label>

						{#if isRecurring}
							<div class="space-y-4 mt-4">
								<!-- Recurrence Pattern -->
								<div class="grid gap-4 sm:grid-cols-2">
									<div>
										<label for="recurrenceFrequency" class="block text-sm font-medium text-foreground mb-2">
											Frequency <span class="text-destructive">*</span>
										</label>
										<select
											id="recurrenceFrequency"
											name="recurrenceFrequency"
											bind:value={recurrenceFrequency}
											required={isRecurring}
											disabled={isSubmitting}
											class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
										>
											<option value="daily">Daily</option>
											<option value="weekly">Weekly</option>
											<option value="monthly">Monthly</option>
											<option value="yearly">Yearly</option>
										</select>
									</div>

									<div>
										<label for="recurrenceInterval" class="block text-sm font-medium text-foreground mb-2">
											Every
										</label>
										<input
											type="number"
											id="recurrenceInterval"
											name="recurrenceInterval"
											bind:value={recurrenceInterval}
											min="1"
											max="52"
											required={isRecurring}
											disabled={isSubmitting}
											class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
										/>
									</div>
								</div>

								<!-- Weekly: Day Selection -->
								{#if recurrenceFrequency === 'weekly'}
									<div>
										<label class="block text-sm font-medium text-foreground mb-2">
											Repeat on <span class="text-destructive">*</span>
										</label>
										<div class="flex flex-wrap gap-2">
											{#each WEEKDAYS as day}
												<button
													type="button"
													onclick={() => toggleWeekday(day.value)}
													disabled={isSubmitting}
													class="px-3 py-1 rounded-md text-sm font-medium transition-colors {recurrenceDaysOfWeek.includes(day.value)
														? 'bg-primary text-primary-foreground'
														: 'bg-background border border-input text-foreground hover:bg-accent'} disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{day.label}
												</button>
											{/each}
										</div>
										<input type="hidden" name="recurrenceDaysOfWeek" value={JSON.stringify(recurrenceDaysOfWeek)} />
									</div>
								{/if}

								<!-- End Date -->
								<div>
									<label for="recurrenceEndDate" class="block text-sm font-medium text-foreground mb-2">
										End Date <span class="text-destructive">*</span>
									</label>
									<input
										type="date"
										id="recurrenceEndDate"
										name="recurrenceEndDate"
										bind:value={recurrenceEndDate}
										min={startTime?.slice(0, 10)}
										required={isRecurring}
										disabled={isSubmitting}
										class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
									/>
									<p class="mt-1 text-xs text-muted-foreground">
										Maximum 5 years from start date
									</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Location -->
					<div>
						<label for="location" class="block text-sm font-medium text-foreground mb-2">
							Location
						</label>
						<input
							type="text"
							id="location"
							name="location"
							disabled={isSubmitting}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							placeholder="Enter event location"
						/>
					</div>

					<!-- Event Type and Visibility Row -->
					<div class="grid gap-4 sm:grid-cols-2">
						<!-- Event Type -->
						<div>
							<label for="eventType" class="block text-sm font-medium text-foreground mb-2">
								Event Type <span class="text-destructive">*</span>
							</label>
							<select
								id="eventType"
								name="eventType"
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

						<!-- Visibility Type -->
						<div>
							<label for="visibilityType" class="block text-sm font-medium text-foreground mb-2">
								Visibility <span class="text-destructive">*</span>
							</label>
							<select
								id="visibilityType"
								name="visibilityType"
								bind:value={visibilityType}
								onchange={handleVisibilityChange}
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

					<!-- Feature 027: Attendee Picker for Specific Visibility -->
					{#if showAttendeeButton}
						<div class="rounded-lg border bg-accent/50 p-4">
							<div class="flex items-center justify-between mb-3">
								<label class="text-sm font-medium text-foreground flex items-center gap-2">
									<UsersIcon class="h-4 w-4" />
									Attendees <span class="text-destructive">*</span>
								</label>
								<button
									type="button"
									onclick={() => (showAttendeePicker = true)}
									disabled={isSubmitting}
									class="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{selectedAttendeeIds.length > 0 ? 'Edit' : 'Add'} Attendees
								</button>
							</div>

							{#if selectedAttendees.length > 0}
								<div class="space-y-1">
									{#each selectedAttendees.slice(0, 3) as attendee}
										<p class="text-sm text-muted-foreground">• {attendee.displayName}</p>
									{/each}
									{#if selectedAttendees.length > 3}
										<p class="text-sm text-muted-foreground">
											+ {selectedAttendees.length - 3} more
										</p>
									{/if}
								</div>
							{:else}
								<p class="text-sm text-muted-foreground">No attendees selected</p>
							{/if}
						</div>
					{/if}

					<!-- Feature 027: Capacity and Waitlist -->
					<div class="rounded-lg border bg-muted/50 p-4 space-y-4">
						<label class="flex items-center cursor-pointer">
							<input
								type="checkbox"
								bind:checked={hasCapacityLimit}
								disabled={isSubmitting}
								class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
							/>
							<span class="ml-2 text-sm font-medium text-foreground">
								Set capacity limit
							</span>
						</label>

						{#if hasCapacityLimit}
							<div class="space-y-4">
								<div>
									<label for="capacityLimit" class="block text-sm font-medium text-foreground mb-2">
										Maximum Attendees
									</label>
									<input
										type="number"
										id="capacityLimit"
										name="capacityLimit"
										bind:value={capacityLimit}
										min="1"
										max="1000"
										required={hasCapacityLimit}
										disabled={isSubmitting}
										class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
									/>
								</div>

								<label class="flex items-center cursor-pointer">
									<input
										type="checkbox"
										bind:checked={hasWaitlist}
										disabled={isSubmitting}
										class="h-4 w-4 rounded border-input text-primary focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
									/>
									<span class="ml-2 text-sm font-medium text-foreground">
										Enable waitlist when full
									</span>
								</label>
							</div>
						{/if}
					</div>

					<!-- Feature 027: Image Upload -->
					<div>
						<label class="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
							<ImageIcon class="h-4 w-4" />
							Event Image (Optional)
						</label>

						<div class="mb-4">
							<label class="text-sm text-muted-foreground mr-4">Aspect Ratio:</label>
							<label class="inline-flex items-center mr-4">
								<input
									type="radio"
									bind:group={imageAspectRatio}
									value="16:9"
									disabled={isSubmitting}
									class="h-4 w-4 text-primary focus:ring-ring"
								/>
								<span class="ml-2 text-sm">16:9 (Horizontal)</span>
							</label>
							<label class="inline-flex items-center">
								<input
									type="radio"
									bind:group={imageAspectRatio}
									value="9:16"
									disabled={isSubmitting}
									class="h-4 w-4 text-primary focus:ring-ring"
								/>
								<span class="ml-2 text-sm">9:16 (Vertical)</span>
							</label>
						</div>

						<ImageUploadWidget
							aspectRatio={imageAspectRatio}
							onImageSelected={handleImageSelected}
							onImageRemoved={handleImageRemoved}
						/>
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
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

	<!-- Feature 027: Attendee Picker Modal -->
	<AttendeePickerModal
		bind:open={showAttendeePicker}
		{employees}
		bind:selectedIds={selectedAttendeeIds}
		onConfirm={(ids) => {
			selectedAttendeeIds = ids;
		}}
		onCancel={() => {
			// Keep current selection
		}}
	/>
{/if}
