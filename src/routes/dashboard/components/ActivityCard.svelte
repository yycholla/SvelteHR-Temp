<script lang="ts">
	import DashboardCard from '$lib/components/ui/layout/DashboardCard.svelte';
	import { Activity } from '@lucide/svelte';

	interface Props {
		activities: any[];
	}

	const { activities }: Props = $props();

	function formatRelativeTime(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diff < 60) return 'Just now';
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	}
</script>

<DashboardCard
	title="Recent Activity"
	description="Latest updates and actions"
	icon={Activity}
	class="h-full"
>
	{#if activities.length > 0}
		<div
			class="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-border"
		>
			{#each activities.slice(0, 5) as activity}
				<div class="relative">
					<div
						class="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full border border-background bg-primary"
					></div>
					<p class="text-sm font-medium">{activity.action}</p>
					<p class="text-xs text-muted-foreground">{activity.details}</p>
					<p class="mt-0.5 text-[10px] text-muted-foreground/70">
						{formatRelativeTime(activity.createdAt)}
					</p>
				</div>
			{/each}
		</div>
	{:else}
		<div class="flex h-full items-center justify-center text-muted-foreground">
			<p>No recent activity</p>
		</div>
	{/if}
</DashboardCard>
