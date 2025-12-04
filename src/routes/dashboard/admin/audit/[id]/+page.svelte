<script lang="ts">
	import { ArrowLeft, FileText, Server, User } from '@lucide/svelte';
	import LogDiff from '$lib/components/activities/LogDiff.svelte';

	const { data } = $props();
	const log = $derived(data.activityLog);

	function getActionBadgeColor(action: string): string {
		if (action.includes('CREATE'))
			return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
		if (action.includes('UPDATE'))
			return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
		if (action.includes('DELETE'))
			return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
		return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
	}
</script>

<div class="space-y-6 p-6">
	<!-- Header / Navigation -->
	<div class="flex items-center gap-4">
		<a
			href="/dashboard/admin/audit"
			class="flex items-center gap-2 rounded-md py-2 pr-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<ArrowLeft class="h-4 w-4" />
			Back to Audit Logs
		</a>
	</div>

	<!-- Title & Action -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-3xl font-bold tracking-tight">Audit Log Details</h1>
				<span class="rounded-full px-3 py-1 text-sm font-medium {getActionBadgeColor(log.action)}">
					{log.action}
				</span>
			</div>
			<p class="mt-1 text-muted-foreground">
				ID: <span class="font-mono text-xs">{log.id}</span>
			</p>
		</div>
	</div>

	<!-- Metadata Grid -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
		<!-- User Info -->
		<div class="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
			<div class="flex items-center gap-2 text-muted-foreground">
				<User class="h-4 w-4" />
				<h3 class="font-semibold">Actor</h3>
			</div>
			<div class="mt-4 space-y-1">
				<p class="font-medium">{log.user?.displayName || 'Unknown User'}</p>
				<p class="text-sm text-muted-foreground">{log.user?.email || 'No email'}</p>
				<p class="text-xs font-mono text-muted-foreground mt-2">ID: {log.userId}</p>
			</div>
		</div>

		<!-- Resource Info -->
		<div class="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
			<div class="flex items-center gap-2 text-muted-foreground">
				<FileText class="h-4 w-4" />
				<h3 class="font-semibold">Resource</h3>
			</div>
			<div class="mt-4 space-y-1">
				<p class="font-medium capitalize">{log.resourceType}</p>
				<p class="text-sm font-mono text-muted-foreground">{log.resourceId || 'N/A'}</p>
			</div>
		</div>

		<!-- System Info -->
		<div class="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
			<div class="flex items-center gap-2 text-muted-foreground">
				<Server class="h-4 w-4" />
				<h3 class="font-semibold">System Context</h3>
			</div>
			<div class="mt-4 space-y-2 text-sm">
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">IP Address</span>
					<span class="font-mono">{log.ipAddress || 'Unknown'}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">Date</span>
					<span>{new Date(log.createdAt).toLocaleString()}</span>
				</div>
				{#if log.userAgent}
					<div class="pt-2 border-t mt-2">
						<p class="text-xs text-muted-foreground break-all">{log.userAgent}</p>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Changes / Diff -->
	<div class="space-y-4">
		<h2 class="text-xl font-semibold tracking-tight">Modifications</h2>
		<LogDiff
			before={log.beforeSnapshot}
			after={log.afterSnapshot || (log.action === 'UPDATE' ? log.details : null)}
		/>

		{#if log.details && log.action !== 'UPDATE'}
			<div class="rounded-md border bg-muted/30 p-4">
				<h3 class="mb-2 text-sm font-semibold text-muted-foreground">Additional Details</h3>
				<pre class="overflow-x-auto text-xs font-mono">{JSON.stringify(log.details, null, 2)}</pre>
			</div>
		{/if}
	</div>
</div>
