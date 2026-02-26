<script lang="ts">
	import type { SyncResponse } from '$lib/types/sync';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		CheckCircle2,
		AlertCircle,
		AlertTriangle,
		Clock,
		TrendingUp,
		TrendingDown,
		RefreshCw,
		ArrowUp,
		ArrowDown,
		GitMerge
	} from '@lucide/svelte';

	interface Props {
		/** Sync response from the last sync operation */
		syncResult: SyncResponse | null;
		/** Loading state */
		loading?: boolean;
		/** Optional additional className */
		class?: string;
	}

	let { syncResult, loading = false, class: className = '' }: Props = $props();

	// Compute health status based on sync result
	const healthStatus = $derived(
		!syncResult
			? 'unknown'
			: syncResult.status === 'COMPLETED'
				? 'healthy'
				: syncResult.status === 'COMPLETED_WITH_ERRORS'
					? 'warning'
					: 'critical'
	);

	const healthColor = $derived(
		healthStatus === 'healthy'
			? 'text-green-600'
			: healthStatus === 'warning'
				? 'text-yellow-600'
				: healthStatus === 'critical'
					? 'text-red-600'
					: 'text-muted-foreground'
	);

	const healthBadgeVariant = $derived(
		healthStatus === 'healthy'
			? 'default'
			: healthStatus === 'warning'
				? 'secondary'
				: 'destructive'
	);

	// Format duration
	function formatDuration(ms: number | null): string {
		if (!ms) return 'N/A';
		if (ms < 1000) return `${ms}ms`;
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;
		return `${minutes}m ${remainingSeconds}s`;
	}

	// Format date/time
	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return 'N/A';
		const date = new Date(dateStr);
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	// Format relative time
	function formatRelativeTime(dateStr: string | null): string {
		if (!dateStr) return 'Never';
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		const diffDays = Math.floor(diffHours / 24);
		return `${diffDays}d ago`;
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 {className}">
	<!-- Sync Status Card -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-sm font-medium text-muted-foreground">Sync Status</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="flex items-center gap-2 text-blue-600">
					<RefreshCw class="h-5 w-5 animate-spin" />
					<span class="text-2xl font-bold">Syncing...</span>
				</div>
			{:else if !syncResult}
				<div class="flex flex-col gap-2">
					<span class="text-2xl font-bold text-muted-foreground">No Data</span>
					<p class="text-xs text-muted-foreground">No sync has been performed yet</p>
				</div>
			{:else}
				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						{#if healthStatus === 'healthy'}
							<CheckCircle2 class="h-5 w-5 {healthColor}" />
						{:else if healthStatus === 'warning'}
							<AlertTriangle class="h-5 w-5 {healthColor}" />
						{:else}
							<AlertCircle class="h-5 w-5 {healthColor}" />
						{/if}
						<Badge variant={healthBadgeVariant} class="text-xs">
							{syncResult.status.replace('_', ' ')}
						</Badge>
					</div>
				</div>
				<div class="mt-3 space-y-1">
					<div class="flex items-center gap-1 text-xs text-muted-foreground">
						<Clock class="h-3 w-3" />
						<span>{formatRelativeTime(syncResult.completed_at)}</span>
					</div>
					{#if syncResult.errors.length > 0}
						<div class="flex items-center gap-1 text-xs text-red-600">
							<AlertCircle class="h-3 w-3" />
							<span
								>{syncResult.errors.length} error{syncResult.errors.length !== 1 ? 's' : ''}</span
							>
						</div>
					{/if}
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Pushed Count Card -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
				<ArrowUp class="h-4 w-4" />
				Pushed
			</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="animate-pulse">
					<div class="h-8 bg-muted rounded w-16"></div>
				</div>
			{:else if !syncResult}
				<span class="text-2xl font-bold text-muted-foreground">-</span>
			{:else}
				<div class="flex flex-col gap-1">
					<span class="text-3xl font-bold {syncResult.pushed_count > 0 ? 'text-blue-600' : ''}">
						{syncResult.pushed_count}
					</span>
					<p class="text-xs text-muted-foreground">
						{syncResult.entity_type.toLowerCase()}{syncResult.pushed_count !== 1 ? 's' : ''} to QuickBooks
					</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Pulled Count Card -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
				<ArrowDown class="h-4 w-4" />
				Pulled
			</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="animate-pulse">
					<div class="h-8 bg-muted rounded w-16"></div>
				</div>
			{:else if !syncResult}
				<span class="text-2xl font-bold text-muted-foreground">-</span>
			{:else}
				<div class="flex flex-col gap-1">
					<span class="text-3xl font-bold {syncResult.pulled_count > 0 ? 'text-green-600' : ''}">
						{syncResult.pulled_count}
					</span>
					<p class="text-xs text-muted-foreground">
						{syncResult.entity_type.toLowerCase()}{syncResult.pulled_count !== 1 ? 's' : ''} from QuickBooks
					</p>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Conflicts Card -->
	<Card>
		<CardHeader class="pb-3">
			<CardTitle class="text-sm font-medium text-muted-foreground flex items-center gap-2">
				<GitMerge class="h-4 w-4" />
				Conflicts
			</CardTitle>
		</CardHeader>
		<CardContent>
			{#if loading}
				<div class="animate-pulse">
					<div class="h-8 bg-muted rounded w-16"></div>
				</div>
			{:else if !syncResult}
				<span class="text-2xl font-bold text-muted-foreground">-</span>
			{:else}
				<div class="flex flex-col gap-1">
					<span
						class="text-3xl font-bold {syncResult.conflicts_count > 0
							? 'text-orange-600'
							: 'text-green-600'}"
					>
						{syncResult.conflicts_count}
					</span>
					<p class="text-xs text-muted-foreground">
						{#if syncResult.conflicts_count === 0}
							No conflicts detected
						{:else}
							{syncResult.conflicts_count} resolved
						{/if}
					</p>
				</div>
			{/if}
		</CardContent>
	</Card>
</div>

<!-- Detailed Stats Bar (if sync result exists) -->
{#if syncResult && !loading}
	<div class="mt-4 p-4 border rounded-lg bg-muted/30">
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
			<div>
				<span class="text-muted-foreground">Entity Type</span>
				<p class="font-medium mt-1">{syncResult.entity_type}</p>
			</div>
			<div>
				<span class="text-muted-foreground">Direction</span>
				<p class="font-medium mt-1">{syncResult.direction}</p>
			</div>
			<div>
				<span class="text-muted-foreground">Mode</span>
				<p class="font-medium mt-1">{syncResult.mode}</p>
			</div>
			<div>
				<span class="text-muted-foreground">Duration</span>
				<p class="font-medium mt-1">{formatDuration(syncResult.duration_ms)}</p>
			</div>
		</div>

		{#if syncResult.started_at}
			<div class="mt-3 pt-3 border-t text-xs text-muted-foreground">
				<div class="flex items-center justify-between">
					<span>Started: {formatDateTime(syncResult.started_at)}</span>
					{#if syncResult.completed_at}
						<span>Completed: {formatDateTime(syncResult.completed_at)}</span>
					{/if}
				</div>
			</div>
		{/if}

		{#if syncResult.message}
			<div class="mt-3 pt-3 border-t">
				<p class="text-sm">{syncResult.message}</p>
			</div>
		{/if}
	</div>
{/if}
