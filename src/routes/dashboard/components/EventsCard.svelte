<script lang="ts">
	import DashboardCard from '$lib/components/ui/layout/DashboardCard.svelte';
	import { Calendar } from '@lucide/svelte';

	interface Props {
		events: any[];
	}

	const { events }: Props = $props();

	function formatTime(dateStr: string): string {
		return new Date(dateStr).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<DashboardCard
	title="Upcoming Events"
	description="Your schedule for today"
	icon={Calendar}
	class="h-full"
>
	{#if events.length > 0}
		<div class="space-y-3">
			{#each events.slice(0, 5) as event}
				<div class="flex items-center gap-3 rounded-lg border bg-muted/20 p-3">
					<div
						class="flex flex-col items-center justify-center rounded bg-background px-3 py-1 text-xs font-bold shadow-sm"
					>
						<span class="text-muted-foreground"
							>{new Date(event.startTime).toLocaleDateString('en-US', { month: 'short' })}</span
						>
						<span class="text-lg text-primary">{new Date(event.startTime).getDate()}</span>
					</div>
					<div>
						<p class="text-sm font-medium">{event.title}</p>
						<p class="text-xs text-muted-foreground">
							{formatTime(event.startTime)} - {formatTime(event.endTime)}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex h-full items-center justify-center text-muted-foreground">
			<p>No upcoming events</p>
		</div>
	{/if}
</DashboardCard>
