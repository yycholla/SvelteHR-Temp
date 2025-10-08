<script lang="ts">
	/**
	 * EventCreateDialog Component
	 * Feature: 019-we-need-to - Events Management
	 *
	 * Dialog for creating new events with full form functionality.
	 * Replaces the create event page for better UX.
	 */

	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { X } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		defaultStartTime?: string;
		defaultEndTime?: string;
		defaultAllDay?: boolean;
		minDate?: string;
		onClose: () => void;
		onSuccess?: () => void;
	}

	let {
		isOpen = false,
		defaultStartTime,
		defaultEndTime,
		defaultAllDay = false,
		minDate,
		onClose,
		onSuccess
	}: Props = $props();

	// Form state
	let startTime = $state(defaultStartTime || '');
	let endTime = $state(defaultEndTime || '');
	let isAllDay = $state(defaultAllDay);
	let isSubmitting = $state(false);

	// Get user's timezone offset in minutes
	const timezoneOffset = new Date().getTimezoneOffset();

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

	// Reset form when dialog opens
	$effect(() => {
		if (isOpen) {
			startTime = defaultStartTime || '';
			endTime = defaultEndTime || '';
			isAllDay = defaultAllDay;
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
				class="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border bg-card shadow-lg"
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
					class="p-6"
				>
					<!-- Hidden field with user's timezone offset -->
					<input type="hidden" name="timezoneOffset" value={timezoneOffset} />

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
							disabled={isSubmitting}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
							disabled={isSubmitting}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
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
					<div class="mb-6">
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
					<div class="mb-6">
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

					<!-- Attendees Info -->
					<div class="mb-6">
						<label class="block text-sm font-medium text-foreground mb-2">Attendees</label>
						<div class="rounded-md border bg-muted px-4 py-3 text-sm text-muted-foreground">
							<p>Attendee selection will be based on the visibility type:</p>
							<ul class="mt-2 list-disc list-inside space-y-1">
								<li><strong>Company-Wide:</strong> All employees will be invited</li>
								<li><strong>Department:</strong> All employees in your department will be invited</li>
								<li><strong>Specific People:</strong> You can select individual attendees (coming soon)</li>
							</ul>
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
{/if}
