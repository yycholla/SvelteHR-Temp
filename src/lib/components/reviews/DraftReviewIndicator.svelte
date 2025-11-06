<script lang="ts">
	/**
	 * DraftReviewIndicator Component
	 * Feature: 023-reviews-creation-it
	 * Task: T031
	 *
	 * Visual indicator for draft reviews with quick actions
	 */
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { FileText, Edit, Trash2, Clock } from '@lucide/svelte';
	import { createEventDispatcher } from 'svelte';
	import { getReviewTypeInfo, formatReviewPeriod } from '$lib/graphql/reviews-operations';
	import type { ReviewType } from '$lib/schemas/reviews';

	const dispatch = createEventDispatcher();

	// Props
	let {
		draft,
		variant = 'card',
		showActions = true,
		loading = false
	}: {
		draft: any; // Draft review object
		variant?: 'card' | 'banner' | 'compact';
		showActions?: boolean;
		loading?: boolean;
	} = $props();

	// Review type info
	const reviewTypeInfo = $derived(getReviewTypeInfo(draft.reviewType as ReviewType));

	// Format date
	function formatDate(dateString: string): string {
		if (!dateString) return '';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Calculate time since last update
	const timeSinceUpdate = $derived(() => {
		if (!draft.updatedAt) return '';
		const now = new Date();
		const updated = new Date(draft.updatedAt);
		const diff = Math.floor((now.getTime() - updated.getTime()) / 1000);

		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
		return `${Math.floor(diff / 86400)}d ago`;
	});

	// Handle actions
	function handleResume() {
		dispatch('resume', { draft });
	}

	function handleDelete() {
		dispatch('delete', { draft });
	}
</script>

{#if variant === 'banner'}
	<!-- Banner variant - prominent notification -->
	<div class="draft-banner rounded-lg border border-accent bg-accent/50 p-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
					<FileText class="h-5 w-5 text-primary" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<Badge variant="outline" class="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
							DRAFT
						</Badge>
						<span class="font-medium">{reviewTypeInfo.label}</span>
					</div>
					<p class="mt-1 text-sm text-muted-foreground">
						Last updated {timeSinceUpdate()}
						{#if draft.reviewPeriodStart || draft.reviewPeriodEnd}
							• Period: {formatReviewPeriod(draft.reviewPeriodStart, draft.reviewPeriodEnd)}
						{/if}
					</p>
				</div>
			</div>
			{#if showActions}
				<div class="flex items-center gap-2">
					<Button size="sm" onclick={handleResume} disabled={loading}>
						<Edit class="mr-2 h-4 w-4" />
						Resume
					</Button>
					<Button variant="ghost" size="sm" onclick={handleDelete} disabled={loading}>
						<Trash2 class="h-4 w-4" />
					</Button>
				</div>
			{/if}
		</div>
	</div>
{:else if variant === 'compact'}
	<!-- Compact variant - minimal info -->
	<div class="draft-compact flex items-center justify-between rounded bg-accent/30 px-3 py-2">
		<div class="flex items-center gap-2">
			<Clock class="h-4 w-4 text-muted-foreground" />
			<Badge variant="outline" class="text-xs">DRAFT</Badge>
			<span class="text-sm">{reviewTypeInfo.label}</span>
			<span class="text-xs text-muted-foreground">{timeSinceUpdate()}</span>
		</div>
		{#if showActions}
			<div class="flex items-center gap-1">
				<Button
					variant="ghost"
					size="sm"
					onclick={handleResume}
					disabled={loading}
					class="h-7 px-2"
				>
					<Edit class="mr-1 h-3 w-3" />
					Resume
				</Button>
				<Button
					variant="ghost"
					size="sm"
					onclick={handleDelete}
					disabled={loading}
					class="h-7 px-2"
				>
					<Trash2 class="h-3 w-3" />
				</Button>
			</div>
		{/if}
	</div>
{:else}
	<!-- Card variant - full details -->
	<Card.Root class="border-l-4 border-l-yellow-500">
		<Card.Header>
			<div class="flex items-start justify-between">
				<div class="flex items-start gap-3">
					<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-2xl">
						{reviewTypeInfo.icon}
					</div>
					<div>
						<div class="mb-1 flex items-center gap-2">
							<Badge variant="outline" class="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
								DRAFT
							</Badge>
							<Card.Title class="text-lg">{reviewTypeInfo.label}</Card.Title>
						</div>
						<Card.Description>{reviewTypeInfo.description}</Card.Description>
					</div>
				</div>
				{#if showActions}
					<div class="flex items-center gap-2">
						<Button size="sm" onclick={handleResume} disabled={loading}>
							<Edit class="mr-2 h-4 w-4" />
							Resume
						</Button>
						<Button variant="ghost" size="sm" onclick={handleDelete} disabled={loading}>
							<Trash2 class="h-4 w-4" />
						</Button>
					</div>
				{/if}
			</div>
		</Card.Header>

		<Card.Content>
			<div class="space-y-2 text-sm">
				{#if draft.reviewPeriodStart || draft.reviewPeriodEnd}
					<div class="flex items-center gap-2 text-muted-foreground">
						<Clock class="h-4 w-4" />
						<span>Period: {formatReviewPeriod(draft.reviewPeriodStart, draft.reviewPeriodEnd)}</span
						>
					</div>
				{/if}

				{#if draft.notes}
					<div class="flex items-start gap-2 text-muted-foreground">
						<FileText class="mt-0.5 h-4 w-4" />
						<span class="line-clamp-2">{draft.notes}</span>
					</div>
				{/if}

				<div class="flex items-center gap-2 text-muted-foreground">
					<Clock class="h-4 w-4" />
					<span>Last updated {timeSinceUpdate()}</span>
				</div>

				{#if draft.goalIds?.length > 0 || draft.newGoals?.length > 0}
					<div class="flex items-center gap-2 text-muted-foreground">
						<span>
							{(draft.goalIds?.length || 0) + (draft.newGoals?.length || 0)} goals associated
						</span>
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>
{/if}

<style>
	.draft-banner,
	.draft-compact {
		transition: all 0.2s ease;
	}

	.draft-banner:hover,
	.draft-compact:hover {
		background-color: hsl(var(--accent) / 0.7);
	}
</style>
