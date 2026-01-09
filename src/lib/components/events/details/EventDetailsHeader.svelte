<script lang="ts">
	import EventCapacityIndicator from '../EventCapacityIndicator.svelte';
	import type { EventData } from '../types';

	interface Props {
		event: EventData;
		showCapacityIndicator: boolean;
	}

	const { event, showCapacityIndicator }: Props = $props();

	function getStatusBadgeColor(status: string): string {
		const colors: Record<string, string> = {
			draft: 'bg-muted text-muted-foreground',
			scheduled: 'bg-primary/10 text-primary',
			ongoing: 'bg-accent text-accent-foreground',
			completed: 'bg-accent text-accent-foreground',
			cancelled: 'bg-destructive/10 text-destructive'
		};
		return colors[status] || 'bg-muted text-muted-foreground';
	}

	function getVisibilityLabel(type: string): string {
		const labels: Record<string, string> = {
			company: 'Company-Wide',
			department: 'Department',
			specific: 'Specific People'
		};
		return labels[type] || type;
	}
</script>

<div class="mb-6">
	<h1 class="text-2xl font-bold text-foreground mb-3">{event.title}</h1>
	<div class="flex flex-wrap items-center gap-2">
		<span
			class="rounded-md px-2 py-1 text-xs font-medium {getStatusBadgeColor(event.status)}"
		>
			{event.status.charAt(0).toUpperCase() + event.status.slice(1)}
		</span>
		<span class="rounded-md px-2 py-1 text-xs font-medium bg-accent text-accent-foreground">
			{event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
		</span>
		{#if event.visibilityType}
			<span class="rounded-md px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
				{getVisibilityLabel(event.visibilityType)}
			</span>
		{/if}
	</div>
</div>

{#if showCapacityIndicator}
	<div class="mb-6">
		<EventCapacityIndicator
			acceptedCount={event.acceptedCount || 0}
			maxCapacity={event.maxCapacity || 0}
			waitlistCount={event.waitlistCount || 0}
			isFull={event.isFull || false}
		/>
	</div>
{/if}
