<script lang="ts">
	import { Users as UsersIcon } from '@lucide/svelte';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';

	interface Props {
		visibilityType: string;
		selectedAttendeeIds: string[];
		isSubmitting: boolean;
		attendeeOptions: any[];
		showAttendeeButton: boolean;
		onVisibilityChange: (e: Event) => void;
	}

	let {
		visibilityType = $bindable(),
		selectedAttendeeIds = $bindable(),
		isSubmitting,
		attendeeOptions,
		showAttendeeButton,
		onVisibilityChange
	}: Props = $props();
</script>

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
			<option value="company_event">Company Event</option>
			<option value="holiday">Holiday</option>
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
			onchange={onVisibilityChange}
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

<!-- Feature 027: Attendee Picker for Specific Visibility (Tagged Search) -->
{#if showAttendeeButton}
	<div class="space-y-2">
		<label class="text-sm font-medium text-foreground flex items-center gap-2">
			<UsersIcon class="h-4 w-4" />
			Attendees <span class="text-destructive">*</span>
		</label>
		<MultiSearchInput
			bind:searchTerms={selectedAttendeeIds}
			options={attendeeOptions}
			placeholder="Search and select attendees..."
			disabled={isSubmitting}
			allowCustomTerms={false}
		/>
		{#if selectedAttendeeIds.length === 0}
			<p class="text-xs text-muted-foreground">Start typing to search for employees to invite</p>
		{:else}
			<p class="text-xs text-muted-foreground">
				{selectedAttendeeIds.length}
				{selectedAttendeeIds.length === 1 ? 'attendee' : 'attendees'} selected
			</p>
		{/if}
	</div>
{/if}
