<script lang="ts">
	import { Bell } from '@lucide/svelte';
	import RSVPButton from '../RSVPButton.svelte';
	import type { RsvpStatus } from '$lib/graphql/types';

	type ReminderPreset = '15min' | '1hour' | '1day' | '1week' | 'none';

	interface Props {
		userRsvpStatus: RsvpStatus | 'no_response';
		selectedReminder: ReminderPreset;
		isSavingReminder: boolean;
		onRsvpChange: (newStatus: RsvpStatus) => void;
		onReminderChange: (preset: ReminderPreset) => void;
	}

	let {
		userRsvpStatus,
		selectedReminder = $bindable(),
		isSavingReminder,
		onRsvpChange,
		onReminderChange
	}: Props = $props();
</script>

<div class="border-t pt-6">
	<h3 class="text-sm font-medium text-foreground mb-3">Your RSVP</h3>
	<div class="flex flex-col sm:flex-row gap-3 items-start">
		<div>
			<RSVPButton currentStatus={userRsvpStatus} onChange={onRsvpChange} />
		</div>

		{#if userRsvpStatus === 'accepted' || userRsvpStatus === 'tentative'}
			<div class="flex items-center gap-2">
				{#if isSavingReminder}
					<svg
						class="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0"
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
				{:else}
					<Bell class="h-4 w-4 text-muted-foreground flex-shrink-0" />
				{/if}
				<select
					bind:value={selectedReminder}
					onchange={(e) => onReminderChange(e.currentTarget.value as ReminderPreset)}
					disabled={isSavingReminder}
					class="inline-flex items-center gap-2 rounded-lg font-medium transition-all px-3 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<option value="none">No reminder</option>
					<option value="15min">15 min before</option>
					<option value="1hour">1 hour before</option>
					<option value="1day">1 day before</option>
					<option value="1week">1 week before</option>
				</select>
			</div>
		{/if}
	</div>
</div>
