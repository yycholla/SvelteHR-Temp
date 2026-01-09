<!--
 * Rollback Requests Widget
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T048
 * Created: 2025-10-02
 *
 * Dashboard widget showing pending rollback requests (super_admin only).
 -->

<script lang="ts">
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckSquare, ChevronRight, Clock } from '@lucide/svelte';

	interface RollbackRequest {
		id: string;
		requesterName: string;
		reason: string;
		resourceType: string;
		status: 'PENDING' | 'APPROVED' | 'REJECTED';
		createdAt: string;
	}

	interface Props {
		requests?: RollbackRequest[];
		statistics?: {
			pendingCount: number;
			approvedCount: number;
			rejectedCount: number;
		};
		maxItems?: number;
	}

	const {
		requests = [],
		statistics = { pendingCount: 0, approvedCount: 0, rejectedCount: 0 },
		maxItems = 3
	}: Props = $props();

	const displayRequests = $derived(requests.slice(0, maxItems));

	function formatRelativeTime(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' {
		switch (status) {
			case 'PENDING':
				return 'secondary';
			case 'APPROVED':
				return 'default';
			case 'REJECTED':
				return 'destructive';
			default:
				return 'secondary';
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Clock class="h-5 w-5 text-muted-foreground" />
				<Card.Title>Rollback Requests</Card.Title>
			</div>
			<Button variant="ghost" size="sm" href="/dashboard/activities/rollback-requests">
				<span class="mr-1">Manage</span>
				<ChevronRight class="h-3 w-3" />
			</Button>
		</div>
		<Card.Description>Pending approval requests from your team</Card.Description>
	</Card.Header>
	<Card.Content>
		<!-- Statistics Summary -->
		<div class="mb-4 grid grid-cols-3 gap-2">
			<div class="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 p-3 text-center">
				<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
					{statistics.pendingCount}
				</div>
				<div class="text-xs text-yellow-700 dark:text-yellow-300">Pending</div>
			</div>

			<div class="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 text-center">
				<div class="text-2xl font-bold text-green-600 dark:text-green-400">
					{statistics.approvedCount}
				</div>
				<div class="text-xs text-green-700 dark:text-green-300">Approved</div>
			</div>

			<div class="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-center">
				<div class="text-2xl font-bold text-red-600 dark:text-red-400">
					{statistics.rejectedCount}
				</div>
				<div class="text-xs text-red-700 dark:text-red-300">Rejected</div>
			</div>
		</div>

		<!-- Recent Requests -->
		{#if displayRequests.length === 0}
			<div class="py-6 text-center">
				<CheckSquare class="mx-auto h-10 w-10 text-muted-foreground opacity-50" />
				<p class="mt-3 text-sm text-muted-foreground">No pending requests</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each displayRequests as request (request.id)}
					<a
						href={resolve('/dashboard/activities/rollback-requests')}
						class="block rounded-lg border p-3 transition-colors hover:bg-accent"
					>
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<Badge variant={getStatusBadgeVariant(request.status)} class="text-xs">
										{request.status}
									</Badge>
									<Badge variant="outline" class="text-xs">
										{request.resourceType}
									</Badge>
								</div>

								<p class="text-sm font-medium">{request.requesterName}</p>

								<p class="text-xs text-muted-foreground line-clamp-2">
									{request.reason || 'No reason provided'}
								</p>

								<div class="flex items-center gap-1 text-xs text-muted-foreground">
									<Clock class="h-3 w-3" />
									<span>{formatRelativeTime(request.createdAt)}</span>
								</div>
							</div>

							<ChevronRight class="h-4 w-4 text-muted-foreground" />
						</div>
					</a>
				{/each}
			</div>

			{#if requests.length > maxItems}
				<div class="mt-3 text-center">
					<Button variant="outline" size="sm" href="/dashboard/activities/rollback-requests">
						View {requests.length - maxItems} more requests
					</Button>
				</div>
			{/if}
		{/if}

		<!-- Quick Actions (for pending requests) -->
		{#if statistics.pendingCount > 0}
			<div class="mt-4 flex gap-2">
				<Button
					size="sm"
					variant="default"
					href="/dashboard/activities/rollback-requests"
					class="flex-1"
				>
					<CheckSquare class="mr-2 h-4 w-4" />
					Review Pending
				</Button>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
