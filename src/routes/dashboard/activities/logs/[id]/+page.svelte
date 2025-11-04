<!--
 * Activity Log Detail Page - UI
 * Feature: 020-we-need-to (Comprehensive Audit Logging with Rollback)
 * Task: T047
 * Created: 2025-10-02
 *
 * Detailed view of individual audit log with diff visualization and rollback actions.
 -->

<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import RollbackButton from '$lib/components/activities/RollbackButton.svelte';
	import {
		ArrowLeft,
		Calendar,
		User,
		Globe,
		Monitor,
		GitBranch,
		AlertCircle,
		CheckCircle,
		XCircle,
		Plus,
		Minus,
		Edit
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	interface Props {
		data: {
			log: any;
			timelineLogs?: Array<{
				id: string;
				employee_name: string;
				action: string;
				resource_type: string;
				resource_id: string;
				created_at: string;
				ip_address: string | null;
				is_rollback: boolean;
				is_current: boolean;
			}>;
			rollbackLog: any | null;
			originalLog: any | null;
			activeRequest: any | null;
			fieldChanges: Array<{
				field: string;
				beforeValue: any;
				afterValue: any;
				changeType: 'added' | 'removed' | 'modified';
			}>;
			userRole: string;
			canRollback: boolean;
			canRequestRollback: boolean;
			userContext: any;
		};
	}

	let { data }: Props = $props();

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZoneName: 'short'
		});
	}

	function formatValue(value: any): string {
		if (value === null || value === undefined) {
			return '(empty)';
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	}

	function getChangeIcon(changeType: 'added' | 'removed' | 'modified') {
		switch (changeType) {
			case 'added':
				return Plus;
			case 'removed':
				return Minus;
			case 'modified':
				return Edit;
		}
	}

	function getChangeColor(changeType: 'added' | 'removed' | 'modified') {
		switch (changeType) {
			case 'added':
				return 'text-green-600 dark:text-green-400';
			case 'removed':
				return 'text-red-600 dark:text-red-400';
			case 'modified':
				return 'text-blue-600 dark:text-blue-400';
		}
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

	async function handleRollbackSuccess() {
		toast.success('Rollback completed successfully');
		await goto('/dashboard/activities/logs');
	}

	async function handleRollbackError(error: string) {
		toast.error(error);
	}
</script>

<svelte:head>
	<title>Audit Log Detail - SvelteHR</title>
	<meta name="description" content="Detailed view of audit log entry with rollback capabilities" />
</svelte:head>

<div class="space-y-6">
	<!-- Header with Back Button -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="sm" onclick={() => goto('/dashboard/activities/logs')}>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to Logs
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Audit Log Detail</h1>
				<p class="text-muted-foreground">Log ID: {data.log.id}</p>
			</div>
		</div>

		<!-- Rollback Actions -->
		<div class="flex gap-2">
			{#if data.log.is_rollback}
				<Badge variant="default" class="gap-1">
					<GitBranch class="h-3 w-3" />
					Rollback Log
				</Badge>
			{:else if data.rollbackLog}
				<Badge variant="secondary" class="gap-1">
					<CheckCircle class="h-3 w-3" />
					Already Rolled Back
				</Badge>
			{:else if data.activeRequest}
				<Badge variant="secondary" class="gap-1">
					<AlertCircle class="h-3 w-3" />
					Rollback Pending
				</Badge>
			{:else}
				<RollbackButton
					logId={data.log.id}
					resourceType={data.log.resource_type}
					action={data.log.action}
					canDirectRollback={data.canRollback}
					canRequestRollback={data.canRequestRollback}
					isRollback={data.log.is_rollback}
					onSuccess={handleRollbackSuccess}
					onError={handleRollbackError}
				/>
			{/if}
		</div>
	</div>

	<!-- Status Alerts -->
	{#if data.log.is_rollback}
		<Card.Root class="border-blue-600">
			<Card.Content class="py-4">
				<div class="flex items-start gap-3">
					<GitBranch class="h-5 w-5 text-blue-600 mt-0.5" />
					<div class="flex-1">
						<h3 class="font-semibold text-blue-900 dark:text-blue-100">
							This is a Rollback Operation
						</h3>
						<p class="text-sm text-blue-800 dark:text-blue-200">
							This log entry represents a rollback of a previous change.
							{#if data.originalLog}
								<a
									href="/dashboard/activities/logs/{data.originalLog.id}"
									class="underline hover:text-blue-600"
								>
									View original log
								</a>
							{/if}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.rollbackLog}
		<Card.Root class="border-green-600">
			<Card.Content class="py-4">
				<div class="flex items-start gap-3">
					<CheckCircle class="h-5 w-5 text-green-600 mt-0.5" />
					<div class="flex-1">
						<h3 class="font-semibold text-green-900 dark:text-green-100">
							Change Has Been Rolled Back
						</h3>
						<p class="text-sm text-green-800 dark:text-green-200">
							This change has been reverted.
							<a
								href="/dashboard/activities/logs/{data.rollbackLog.id}"
								class="underline hover:text-green-600"
							>
								View rollback log
							</a>
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	{#if data.activeRequest}
		<Card.Root class="border-yellow-600">
			<Card.Content class="py-4">
				<div class="flex items-start gap-3">
					<AlertCircle class="h-5 w-5 text-yellow-600 mt-0.5" />
					<div class="flex-1">
						<h3 class="font-semibold text-yellow-900 dark:text-yellow-100">
							Rollback Request Pending
						</h3>
						<p class="text-sm text-yellow-800 dark:text-yellow-200">
							A rollback request is currently awaiting approval.
							<a
								href="/dashboard/activities/rollback-requests"
								class="underline hover:text-yellow-600"
							>
								View request
							</a>
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Log Overview -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Basic Information -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Log Information</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex items-start gap-3">
					<User class="h-5 w-5 text-muted-foreground mt-0.5" />
					<div class="flex-1">
						<p class="text-sm font-medium">Employee</p>
						<p class="text-sm text-muted-foreground">
							{data.log.employee_name}
							{#if data.log.department_name}
								<span class="text-xs">({data.log.department_name})</span>
							{/if}
						</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<Calendar class="h-5 w-5 text-muted-foreground mt-0.5" />
					<div class="flex-1">
						<p class="text-sm font-medium">Timestamp</p>
						<p class="text-sm text-muted-foreground">{formatDate(data.log.created_at)}</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<div class="flex items-center gap-2">
						<Badge variant={getActionBadgeVariant(data.log.action)}>
							{data.log.action}
						</Badge>
						<Badge variant="outline">{data.log.resource_type}</Badge>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<div class="flex-1">
						<p class="text-sm font-medium">Resource ID</p>
						<p class="text-sm text-muted-foreground font-mono">{data.log.resource_id}</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Technical Details -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Technical Information</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="flex items-start gap-3">
					<Globe class="h-5 w-5 text-muted-foreground mt-0.5" />
					<div class="flex-1">
						<p class="text-sm font-medium">IP Address</p>
						<p class="text-sm text-muted-foreground font-mono">{data.log.ip_address}</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<Monitor class="h-5 w-5 text-muted-foreground mt-0.5" />
					<div class="flex-1">
						<p class="text-sm font-medium">User Agent</p>
						<p class="text-sm text-muted-foreground break-all">{data.log.user_agent}</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<GitBranch class="h-5 w-5 text-muted-foreground mt-0.5" />
					<div class="flex-1">
						<p class="text-sm font-medium">Log Type</p>
						<p class="text-sm text-muted-foreground">
							{data.log.is_rollback ? 'Rollback Operation' : 'Standard Operation'}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Timeline - All Edits of this Resource -->
		{#if data.timelineLogs && data.timelineLogs.length > 1}
			<Card.Root>
				<Card.Header>
					<Card.Title>Edit History</Card.Title>
					<Card.Description>
						All changes to this resource ({data.timelineLogs.length} total edits)
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-3">
						{#each data.timelineLogs as timelineLog}
							<div
								class="flex items-start gap-3 p-3 rounded-lg border transition-colors {timelineLog.is_current
									? 'bg-primary/5 border-primary'
									: 'hover:bg-muted/50'}"
							>
								<div class="flex flex-col items-center gap-1">
									{#if timelineLog.is_current}
										<div class="h-3 w-3 rounded-full bg-primary"></div>
									{:else}
										<div class="h-2 w-2 rounded-full bg-muted-foreground"></div>
									{/if}
									{#if timelineLog !== data.timelineLogs[data.timelineLogs.length - 1]}
										<div class="h-full w-px bg-border"></div>
									{/if}
								</div>
								<div class="flex-1 min-w-0">
									<div class="flex items-start justify-between gap-2">
										<div class="flex-1 min-w-0">
											<div class="flex items-center gap-2 mb-1">
												<Badge
													variant={timelineLog.is_current ? 'default' : 'secondary'}
													class="text-xs"
												>
													{timelineLog.action}
												</Badge>
												{#if timelineLog.is_rollback}
													<Badge variant="outline" class="text-xs">
														<GitBranch class="mr-1 h-2.5 w-2.5" />
														Rollback
													</Badge>
												{/if}
												{#if timelineLog.is_current}
													<Badge variant="outline" class="text-xs bg-primary/10">
														Current
													</Badge>
												{/if}
											</div>
											<p class="text-sm font-medium">{timelineLog.employee_name}</p>
											<p class="text-xs text-muted-foreground">
												{formatDate(timelineLog.created_at)}
											</p>
											{#if timelineLog.ip_address}
												<p class="text-xs text-muted-foreground font-mono">
													{timelineLog.ip_address}
												</p>
											{/if}
										</div>
										{#if !timelineLog.is_current}
											<Button
												variant="ghost"
												size="sm"
												onclick={() => goto(`/dashboard/activities/logs/${timelineLog.id}`)}
											>
												View
											</Button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Field Changes Diff -->
	{#if data.fieldChanges.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Changes Summary</Card.Title>
				<Card.Description>
					{data.fieldChanges.length} field{data.fieldChanges.length !== 1 ? 's' : ''} modified
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead class="border-b">
							<tr class="text-left">
								<th class="pb-2 font-medium">Field</th>
								<th class="pb-2 font-medium">Before</th>
								<th class="pb-2 font-medium px-2 text-center">→</th>
								<th class="pb-2 font-medium">After</th>
								<th class="pb-2 font-medium text-right">Type</th>
							</tr>
						</thead>
						<tbody class="divide-y">
							{#each data.fieldChanges as change}
								{@const ChangeIcon = getChangeIcon(change.changeType)}
								<tr class="hover:bg-muted/50">
									<td class="py-2 font-medium">{change.field}</td>
									<td class="py-2 max-w-xs">
										<code
											class="text-xs text-red-600 dark:text-red-400 truncate block"
											title={formatValue(change.beforeValue)}
										>
											{formatValue(change.beforeValue)}
										</code>
									</td>
									<td class="py-2 px-2 text-center">
										<ChangeIcon class={`h-4 w-4 inline ${getChangeColor(change.changeType)}`} />
									</td>
									<td class="py-2 max-w-xs">
										<code
											class="text-xs text-green-600 dark:text-green-400 truncate block"
											title={formatValue(change.afterValue)}
										>
											{formatValue(change.afterValue)}
										</code>
									</td>
									<td class="py-2 text-right">
										<Badge variant="outline" class="text-xs">
											{change.changeType}
										</Badge>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Content class="py-8">
				<div class="text-center">
					<XCircle class="mx-auto h-12 w-12 text-muted-foreground" />
					<h3 class="mt-4 text-lg font-semibold">No Changes Detected</h3>
					<p class="text-muted-foreground">
						This log entry shows no field-level changes between snapshots.
					</p>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Raw Snapshots -->
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- Before Snapshot -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Before Snapshot</Card.Title>
				<Card.Description>State before the operation</Card.Description>
			</Card.Header>
			<Card.Content>
				<pre
					class="rounded-lg bg-muted p-4 text-xs overflow-x-auto">{JSON.stringify(
						data.log.before_snapshot,
						null,
						2
					)}</pre>
			</Card.Content>
		</Card.Root>

		<!-- After Snapshot -->
		<Card.Root>
			<Card.Header>
				<Card.Title>After Snapshot</Card.Title>
				<Card.Description>State after the operation</Card.Description>
			</Card.Header>
			<Card.Content>
				<pre
					class="rounded-lg bg-muted p-4 text-xs overflow-x-auto">{JSON.stringify(
						data.log.after_snapshot,
						null,
						2
					)}</pre>
			</Card.Content>
		</Card.Root>
	</div>
</div>
