<script lang="ts">
	/**
	 * EventCapacityIndicator Component
	 * Feature: 025-events-flesh-out
	 *
	 * Displays event capacity information and waitlist status.
	 * Shows filled spots, remaining capacity, and waitlist count.
	 */

	import { Progress } from '$lib/components/ui/progress';
	import { Badge } from '$lib/components/ui/badge';
	import { Users } from '@lucide/svelte';

	interface Props {
		acceptedCount: number;
		maxCapacity?: number | null;
		waitlistCount?: number;
		isFull?: boolean;
		showWaitlistButton?: boolean;
		variant?: 'default' | 'compact';
	}

	const {
		acceptedCount,
		maxCapacity = null,
		waitlistCount = 0,
		isFull = false,
		showWaitlistButton = false,
		variant = 'default'
	}: Props = $props();

	const hasCapacityLimit = $derived(maxCapacity !== null && maxCapacity !== undefined);
	const percentFull = $derived(
		hasCapacityLimit && maxCapacity ? (acceptedCount / maxCapacity) * 100 : 0
	);
	const spotsRemaining = $derived(
		hasCapacityLimit && maxCapacity ? maxCapacity - acceptedCount : null
	);

	const statusColor = $derived(() => {
		if (!hasCapacityLimit) return 'default';
		if (isFull) return 'destructive';
		if (percentFull >= 90) return 'warning';
		return 'success';
	});

	const statusText = $derived(() => {
		if (!hasCapacityLimit) {
			return `${acceptedCount} attending`;
		}

		if (isFull) {
			return waitlistCount > 0 ? `Full (${waitlistCount} on waitlist)` : 'Event is full';
		}

		return `${acceptedCount}/${maxCapacity} spots filled`;
	});
</script>

{#if variant === 'compact'}
	<div class="flex items-center gap-2 text-sm">
		<Users class="h-4 w-4" />
		<span>{statusText}</span>
		{#if isFull}
			<Badge variant="destructive" class="ml-1">Full</Badge>
		{:else if spotsRemaining !== null && spotsRemaining <= 5 && spotsRemaining > 0}
			<Badge variant="warning" class="ml-1">{spotsRemaining} left</Badge>
		{/if}
	</div>
{:else}
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				<span class="font-medium">{statusText}</span>
			</div>

			{#if isFull}
				<Badge variant="destructive">Full</Badge>
			{:else if spotsRemaining !== null && spotsRemaining <= 5 && spotsRemaining > 0}
				<Badge variant="warning">{spotsRemaining} spots left</Badge>
			{/if}
		</div>

		{#if hasCapacityLimit}
			<Progress value={percentFull} class="h-2" />

			<div class="flex justify-between text-sm text-muted-foreground">
				<span>{acceptedCount} attending</span>
				<span>{maxCapacity} capacity</span>
			</div>
		{/if}

		{#if waitlistCount > 0}
			<p class="text-sm text-muted-foreground">
				{waitlistCount}
				{waitlistCount === 1 ? 'person' : 'people'} on waitlist
			</p>
		{/if}
	</div>
{/if}
