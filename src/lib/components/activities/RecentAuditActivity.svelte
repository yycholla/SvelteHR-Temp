<!--
 * Recent Audit Activity Widget
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T048
 * Created: 2025-10-02
 *
 * Dashboard widget showing recent audit log activity with quick access.
 -->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Activity,
		ChevronRight,
		Clock,
		FileText,
		GitBranch
	} from '@lucide/svelte';

	interface ActivityLog {
		id: string;
		employeeName: string;
		action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
		resourceType: string;
		resourceId: string;
		isRollback: boolean;
		createdAt: string;
	}

	interface Props {
		logs?: ActivityLog[];
		maxItems?: number;
		showRollbackIndicators?: boolean;
		compactMode?: boolean;
	}

	const {
		logs = [],
		maxItems = 5,
		showRollbackIndicators = true,
		compactMode = false
	}: Props = $props();

	const displayLogs = $derived(logs.slice(0, maxItems));

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

	function getActionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' {
		switch (action) {
			case 'CREATE':
				return 'default';
			case 'DELETE':
				return 'destructive';
			default:
				return 'secondary';
		}
	}

	function getActionColor(action: string): string {
		switch (action) {
			case 'CREATE':
				return 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400';
			case 'DELETE':
				return 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400';
			case 'UPDATE':
				return 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
			case 'READ':
				return 'bg-gray-100 text-gray-600 dark:bg-gray-950 dark:text-gray-400';
			default:
				return 'bg-gray-100 text-gray-600 dark:bg-gray-950 dark:text-gray-400';
		}
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<Activity class="h-5 w-5 text-muted-foreground" />
				<Card.Title>{compactMode ? 'Recent Activity' : 'Recent Audit Activity'}</Card.Title>
			</div>
			<Button variant="ghost" size="sm" href="/dashboard/activities/logs">
				<span class="mr-1">View All</span>
				<ChevronRight class="h-3 w-3" />
			</Button>
		</div>
		{#if !compactMode}
			<Card.Description>Latest system-wide audit log entries</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content>
		{#if displayLogs.length === 0}
			<div class="py-8 text-center">
				<FileText class="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
				<p class="mt-4 text-sm text-muted-foreground">No recent audit activity</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each displayLogs as log (log.id)}
					<a
						href="/dashboard/activities/logs/{log.id}"
						class="block rounded-lg border p-3 transition-colors hover:bg-accent"
					>
						<div class="flex items-start gap-3">
							<!-- Action Indicator -->
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full {getActionColor(
									log.action
								)}"
							>
								{#if log.isRollback && showRollbackIndicators}
									<GitBranch class="h-4 w-4" />
								{:else if log.action === 'CREATE'}
									<span class="text-xs font-bold">C</span>
								{:else if log.action === 'UPDATE'}
									<span class="text-xs font-bold">U</span>
								{:else if log.action === 'DELETE'}
									<span class="text-xs font-bold">D</span>
								{:else}
									<span class="text-xs font-bold">R</span>
								{/if}
							</div>

							<!-- Log Details -->
							<div class="flex-1 space-y-1">
								<div class="flex items-center gap-2">
									<Badge variant={getActionBadgeVariant(log.action)} class="text-xs">
										{log.action}
									</Badge>
									<Badge variant="outline" class="text-xs">
										{log.resourceType}
									</Badge>
									{#if log.isRollback && showRollbackIndicators}
										<Badge variant="secondary" class="gap-1 text-xs">
											<GitBranch class="h-3 w-3" />
											Rollback
										</Badge>
									{/if}
								</div>

								<p class="text-sm font-medium">
									{log.employeeName || 'System'}
									{#if !compactMode}
										<span class="text-muted-foreground">modified {log.resourceType}</span>
									{/if}
								</p>

								{#if !compactMode}
									<p class="text-xs text-muted-foreground font-mono">
										ID: {log.resourceId}
									</p>
								{/if}

								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<Clock class="h-3 w-3" />
									<span>{formatRelativeTime(log.createdAt)}</span>
								</div>
							</div>

							<!-- Arrow Indicator -->
							<ChevronRight class="h-4 w-4 text-muted-foreground" />
						</div>
					</a>
				{/each}
			</div>

			{#if logs.length > maxItems}
				<div class="mt-4 text-center">
					<Button variant="outline" size="sm" href="/dashboard/activities/logs">
						View {logs.length - maxItems} more logs
					</Button>
				</div>
			{/if}
		{/if}
	</Card.Content>
</Card.Root>
