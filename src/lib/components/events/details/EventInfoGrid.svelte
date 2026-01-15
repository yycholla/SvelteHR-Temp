<script lang="ts">
	import { Calendar as CalendarIcon, MapPin, User, Users } from '@lucide/svelte';
	import { formatEventTimeRange } from '$lib/utils/events';
	import type { EventData } from '../types';

	interface Props {
		event: EventData;
		displayRsvpStats: {
			total: number;
			accepted: number;
			declined: number;
			tentative: number;
			pending: number;
		};
	}

	const { event, displayRsvpStats }: Props = $props();
</script>

<div class="grid gap-4 sm:grid-cols-2 mb-6">
	<div class="flex items-start gap-3">
		<CalendarIcon class="h-5 w-5 text-muted-foreground mt-0.5" />
		<div>
			<div class="text-sm font-medium text-foreground mb-1">Date & Time</div>
			<div class="text-sm text-muted-foreground">
				{formatEventTimeRange(event.startTime, event.endTime, event.isAllDay ?? false)}
			</div>
			{#if event.isAllDay}
				<span class="mt-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
					All Day
				</span>
			{/if}
		</div>
	</div>

	{#if event.location}
		<div class="flex items-start gap-3">
			<MapPin class="h-5 w-5 text-muted-foreground mt-0.5" />
			<div>
				<div class="text-sm font-medium text-foreground mb-1">Location</div>
				<div class="text-sm text-muted-foreground">{event.location}</div>
			</div>
		</div>
	{/if}

	<div class="flex items-start gap-3">
		<User class="h-5 w-5 text-muted-foreground mt-0.5" />
		<div>
			<div class="text-sm font-medium text-foreground mb-1">Organizer</div>
			<div class="text-sm text-muted-foreground">
				{event.organizer?.displayName || 'Unknown'}
			</div>
		</div>
	</div>

	{#if displayRsvpStats}
		<div class="flex items-start gap-3">
			<Users class="h-5 w-5 text-muted-foreground mt-0.5" />
			<div class="flex-1">
				<div class="text-sm font-medium text-foreground mb-1">Attendees</div>
				<div class="text-sm text-muted-foreground space-y-0.5">
					{#if displayRsvpStats.accepted > 0}
						<div>{displayRsvpStats.accepted} Accepted</div>
					{/if}
					{#if displayRsvpStats.tentative > 0}
						<div>{displayRsvpStats.tentative} Tentative</div>
					{/if}
					{#if displayRsvpStats.declined > 0}
						<div>{displayRsvpStats.declined} Declined</div>
					{/if}
					{#if displayRsvpStats.pending > 0}
						<div>{displayRsvpStats.pending} Pending</div>
					{/if}
					{#if displayRsvpStats.total === 0}
						<div class="text-muted-foreground">No attendees yet</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
