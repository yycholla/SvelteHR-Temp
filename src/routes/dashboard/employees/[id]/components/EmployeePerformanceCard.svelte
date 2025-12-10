<script lang="ts">
	import { BarChart2 } from '@lucide/svelte';

	interface Props {
		employee: any;
		formatDate: (date: string) => string;
	}

	const { employee, formatDate }: Props = $props();
</script>

<div class="flex flex-col rounded-xl border bg-card p-5">
	<div class="mb-4 flex items-center gap-2 text-muted-foreground">
		<BarChart2 class="h-4 w-4" />
		<span class="text-xs font-semibold uppercase tracking-wider">Performance</span>
	</div>
	<div class="grid flex-1 grid-cols-2 items-center gap-4">
		<div class="rounded-lg bg-muted/30 p-3 text-center">
			<p class="text-2xl font-bold text-primary">
				{#if employee.performanceReviews && employee.performanceReviews.length > 0}
					{employee.performanceReviews[0].overallRating || '-'}
				{:else}
					-
				{/if}
			</p>
			<p class="mt-1 text-[10px] uppercase text-muted-foreground">Rating</p>
		</div>
		<div class="rounded-lg bg-muted/30 p-3 text-center">
			<p class="text-2xl font-bold text-primary">{employee.leaveRequestCount}</p>
			<p class="mt-1 text-[10px] uppercase text-muted-foreground">Leaves</p>
		</div>
	</div>
	<div class="mt-4 border-t border-border/50 pt-3">
		<div class="flex items-center justify-between text-xs">
			<span class="text-muted-foreground">Last Review</span>
			<span class="font-medium">
				{#if employee.performanceReviews && employee.performanceReviews.length > 0}
					{formatDate(employee.performanceReviews[0].createdAt)}
				{:else}
					N/A
				{/if}
			</span>
		</div>
	</div>
</div>
