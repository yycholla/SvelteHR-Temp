<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Database, Eye, RotateCcw, Shield, User } from '@lucide/svelte';
	import { formatJSON, getActionBadge } from './utils';

	interface Props {
		logs: any[];
		totalLogs: number;
		onLogClick: (id: string) => void;
	}

	let { logs, totalLogs, onLogClick }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Activity Logs</Card.Title>
		<Card.Description>
			Showing {logs.length} grouped resources ({totalLogs} total logs)
		</Card.Description>
	</Card.Header>
	<Card.Content>
		{#if logs.length > 0}
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Timestamp</Table.Head>
							<Table.Head>User</Table.Head>
							<Table.Head>Action</Table.Head>
							<Table.Head>Resource</Table.Head>
							<Table.Head>Details</Table.Head>
							<Table.Head>IP Address</Table.Head>
							<Table.Head class="text-right">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each logs as log}
							<Table.Row
								class="cursor-pointer hover:bg-muted/50"
								onclick={() => onLogClick(log.id)}
							>
								<Table.Cell class="text-xs text-muted-foreground">
									{new Date(log.createdAt).toLocaleString()}
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"
										>
											<User class="h-4 w-4 text-primary" />
										</div>
										<div>
											<p class="text-sm font-medium">{log.user?.displayName || 'Unknown'}</p>
											<p class="text-xs text-muted-foreground">{log.user?.email || '—'}</p>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell>
									{@const badgeInfo = getActionBadge(log.action)}
									<div class="flex flex-wrap items-center gap-1">
										<Badge variant="secondary" class={badgeInfo.class}>
											{log.action}
										</Badge>
										{#if log.isRollback}
											<Badge
												variant="outline"
												class="bg-amber-100 text-amber-700 dark:bg-amber-900/30"
											>
												<RotateCcw class="mr-1 h-3 w-3" />
												Rollback
											</Badge>
										{/if}
										{#if log.totalEdits > 1}
											<Badge
												variant="outline"
												class="bg-blue-100 text-xs text-blue-700 dark:bg-blue-900/30"
											>
												{log.totalEdits} edits
											</Badge>
										{/if}
									</div>
								</Table.Cell>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Database class="h-4 w-4 text-muted-foreground" />
										<div>
											<p class="text-sm font-medium">{log.resourceType}</p>
											<p class="font-mono text-xs text-muted-foreground">
												{log.resourceId ? log.resourceId.substring(0, 8) + '...' : 'N/A'}
											</p>
										</div>
									</div>
								</Table.Cell>
								<Table.Cell class="max-w-xs">
									<div
										class="truncate text-xs text-muted-foreground"
										title={formatJSON(log.details)}
									>
										{formatJSON(log.details)}
									</div>
								</Table.Cell>
								<Table.Cell class="font-mono text-xs">{log.ipAddress || '—'}</Table.Cell>
								<Table.Cell class="text-right">
									<Button variant="ghost" size="sm" onclick={() => onLogClick(log.id)}>
										<Eye class="h-4 w-4" />
									</Button>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		{:else}
			<div class="flex flex-col items-center justify-center py-12">
				<Shield class="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
				<h3 class="mb-2 text-lg font-medium">No audit logs found</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					Try adjusting your filters or search criteria
				</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
