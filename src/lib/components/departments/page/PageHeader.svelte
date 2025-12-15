<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { Grid, List, Plus, TreePine } from '@lucide/svelte';

	interface Props {
		canManageDepartments: boolean;
		viewMode: 'grid' | 'list';
		showCreateDialog: boolean;
	}

	let { canManageDepartments, viewMode = $bindable(), showCreateDialog = $bindable() }: Props = $props();
</script>

<div class="flex items-center justify-between">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Department Management</h1>
		<p class="text-muted-foreground">Organize and manage departments in your organization</p>
	</div>

	<div class="flex gap-2">
		{#if canManageDepartments}
			<Button variant="outline" size="sm">
				<TreePine class="mr-2 h-4 w-4" />
				Hierarchy
			</Button>
			<Button size="sm" onclick={() => (showCreateDialog = true)}>
				<Plus class="mr-2 h-4 w-4" />
				Add Department
			</Button>
		{/if}
		<ButtonGroup.Root>
			<Button
				variant={viewMode === 'grid' ? 'default' : 'outline'}
				size="icon"
				onclick={() => (viewMode = 'grid')}
				title="Grid view"
			>
				<Grid class="h-4 w-4" />
			</Button>
			<Button
				variant={viewMode === 'list' ? 'default' : 'outline'}
				size="icon"
				onclick={() => (viewMode = 'list')}
				title="Table view"
			>
				<List class="h-4 w-4" />
			</Button>
		</ButtonGroup.Root>
	</div>
</div>
