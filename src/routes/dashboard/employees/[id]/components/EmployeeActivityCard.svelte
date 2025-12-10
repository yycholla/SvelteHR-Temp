<script lang="ts">
	import { Activity, Edit, Plus, XCircle } from '@lucide/svelte';
	import { formatRelativeTime } from '../utils';

	interface Props {
		employee: any;
	}

	const { employee }: Props = $props();
</script>

<div class="rounded-xl border bg-card p-5 md:col-span-2 lg:col-span-3">
	<div class="mb-5 flex items-center justify-between">
		<div class="flex items-center gap-2 text-muted-foreground">
			<Activity class="h-4 w-4" />
			<span class="text-xs font-semibold uppercase tracking-wider">Recent Activity</span>
		</div>
		<!-- <button class="text-xs text-primary hover:underline">View All</button> -->
	</div>

	{#if employee.activityLogs && employee.activityLogs.length > 0}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
			{#each employee.activityLogs.slice(0, 3) as log}
				<div class="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
					<div
						class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-500"
					>
						{#if log.action === 'CREATE'}
							<Plus class="h-4 w-4" />
						{:else if log.action === 'UPDATE'}
							<Edit class="h-4 w-4" />
						{:else if log.action === 'DELETE'}
							<XCircle class="h-4 w-4" />
						{:else}
							<Activity class="h-4 w-4" />
						{/if}
					</div>
					<div>
						<p class="mb-1.5 text-sm font-medium leading-none">
							{log.action}
							{log.resourceType}
						</p>
						<p class="mb-2 text-xs text-muted-foreground line-clamp-2">
							{log.details ? JSON.stringify(log.details) : 'No details'}
						</p>
						<p class="text-[10px] text-muted-foreground/70">
							{formatRelativeTime(log.createdAt)}
						</p>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="py-4 text-center text-xs text-muted-foreground">No recent activity</div>
	{/if}
</div>