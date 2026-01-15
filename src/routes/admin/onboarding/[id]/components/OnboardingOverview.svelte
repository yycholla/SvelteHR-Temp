<script lang="ts">
	import { Calendar, Edit, FileText, Tag } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { formatDistanceToNow } from 'date-fns';

	interface Props {
		module: any;
		contentBlocks: any[];
		stats: {
			total: number;
			completed: number;
			rate: number;
		};
	}

	const { module, contentBlocks, stats }: Props = $props();
</script>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
	<!-- Main Info -->
	<div class="lg:col-span-2 space-y-6">
		<!-- Module Info Card -->
		<Card.Root>
			<Card.Header class="flex flex-row items-start justify-between">
				<div>
					<Card.Title>Module Information</Card.Title>
					<Card.Description>Basic details about this onboarding module</Card.Description>
				</div>
				{#if module.isActive}
					<Badge variant="default">Active</Badge>
				{:else}
					<Badge variant="secondary">Inactive</Badge>
				{/if}
			</Card.Header>
			<Card.Content class="space-y-4">
				{#if module.description}
					<div>
						<h4 class="text-sm font-semibold mb-2">Description</h4>
						<p class="text-sm text-muted-foreground">{module.description}</p>
					</div>
				{/if}

				{#if module.category}
					<div class="flex items-center gap-2">
						<Tag class="h-4 w-4 text-muted-foreground" />
						<span class="text-sm">Category: <strong>{module.category}</strong></span>
					</div>
				{/if}

				{#if module.tags && module.tags.length > 0}
					<div>
						<h4 class="text-sm font-semibold mb-2">Tags</h4>
						<div class="flex flex-wrap gap-2">
							{#each module.tags as tag}
								<Badge variant="outline">{tag}</Badge>
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex items-center gap-2 text-sm text-muted-foreground pt-4 border-t">
					<Calendar class="h-4 w-4" />
					<span>
						Created {formatDistanceToNow(new Date(module.createdAt), { addSuffix: true })}
					</span>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Content Blocks -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between">
				<div>
					<Card.Title>Content Blocks</Card.Title>
					<Card.Description>{contentBlocks.length} blocks configured</Card.Description>
				</div>
				<Button href={`/admin/onboarding/${module.id}/content`} size="sm">
					<Edit class="mr-2 h-3 w-3" /> Edit
				</Button>
			</Card.Header>
			<Card.Content>
				{#if contentBlocks.length === 0}
					<div class="text-center py-8 text-muted-foreground text-sm">
						No content blocks yet. Click "Edit Content" to add some.
					</div>
				{:else}
					<div class="space-y-2">
						{#each contentBlocks as block}
							<div
								class="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
							>
								<div class="flex items-center gap-3">
									<span class="text-xs font-mono text-muted-foreground"
										>#{block.sequenceOrder + 1}</span
									>
									<div>
										<div class="font-medium text-sm flex items-center gap-2">
											{block.title}
											{#if block.isRequired}
												<Badge variant="secondary" class="h-4 text-[10px]">Required</Badge>
											{/if}
										</div>
										<div class="text-xs text-muted-foreground capitalize">
											{block.type.replace('_', ' ').toLowerCase()}
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Sidebar Stats -->
	<div class="space-y-6">
		<!-- Statistics -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Statistics</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div>
					<div class="text-2xl font-bold">{stats.total}</div>
					<div class="text-xs text-muted-foreground">Total Assignments</div>
				</div>
				<div>
					<div class="text-2xl font-bold">{stats.completed}</div>
					<div class="text-xs text-muted-foreground">Completed</div>
				</div>
				<div>
					<div class="text-2xl font-bold">{stats.rate}%</div>
					<div class="text-xs text-muted-foreground">Completion Rate</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Quick Actions -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Quick Actions</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-2">
				<Button href={`/admin/onboarding/${module.id}/content`} class="w-full" variant="outline">
					<FileText class="mr-2 h-4 w-4" /> Manage Content
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
</div>
