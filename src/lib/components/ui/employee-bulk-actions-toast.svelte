<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { ChevronDown, ToggleLeft, UserCog, X } from '@lucide/svelte';
	import type { Writable } from 'svelte/store';

	interface BulkActionsState {
		selectedCount: number;
		departments: Array<{ id: string; name: string }>;
	}

	interface Props {
		bulkActionsStore: Writable<BulkActionsState>;
		onClear: () => void;
		onMoveDepartment: (departmentId: string) => void;
		onChangeStatus: (status: 'active' | 'inactive' | 'terminated') => void;
	}

	const { bulkActionsStore, onClear, onMoveDepartment, onChangeStatus }: Props = $props();

	// Subscribe to store for reactive updates
	const bulkActionsState = $derived($bulkActionsStore);
	const selectedCount = $derived(bulkActionsState.selectedCount);
	const departments = $derived(bulkActionsState.departments);
</script>

<div
	class="flex items-center justify-between gap-4 w-full min-w-[600px] bg-card border rounded-lg p-4 shadow-lg"
>
	<!-- Left: Selection count with integrated clear button -->
	<div class="flex items-center gap-4">
		<Badge variant="secondary" class="text-base px-3 py-1.5 flex items-center gap-2">
			{selectedCount}
			{selectedCount === 1 ? 'employee' : 'employees'} selected
			<button
				onclick={onClear}
				class="ml-1 rounded-sm hover:bg-secondary-foreground/20 p-0.5"
				aria-label="Clear selection"
			>
				<X class="h-3.5 w-3.5" />
			</button>
		</Badge>
	</div>

	<!-- Right: Bulk actions as button group -->
	<ButtonGroup.Root>
		<!-- Move Department -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>
						<UserCog class="mr-2 h-4 w-4" />
						Move Department
						<ChevronDown class="ml-2 h-4 w-4" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" side="top" sideOffset={20} class="w-56">
				<DropdownMenu.Label>Select Department</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#each departments as dept (dept.id)}
					<DropdownMenu.Item onclick={() => onMoveDepartment(dept.id)}>
						{dept.name}
					</DropdownMenu.Item>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>

		<!-- Change Status -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Button variant="outline" size="sm" {...props}>
						<ToggleLeft class="mr-2 h-4 w-4" />
						Change Status
						<ChevronDown class="ml-2 h-4 w-4" />
					</Button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" side="top" sideOffset={20} class="w-48">
				<DropdownMenu.Label>Set Status</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={() => onChangeStatus('active')}>
					<span class="flex items-center gap-2">
						<span class="h-2 w-2 rounded-full bg-green-500"></span>
						Set as Active
					</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onChangeStatus('inactive')}>
					<span class="flex items-center gap-2">
						<span class="h-2 w-2 rounded-full bg-gray-400"></span>
						Set as Inactive
					</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item onclick={() => onChangeStatus('terminated')}>
					<span class="flex items-center gap-2">
						<span class="h-2 w-2 rounded-full bg-red-500"></span>
						Set as Terminated
					</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</ButtonGroup.Root>
</div>
