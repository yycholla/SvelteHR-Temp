<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { ChevronDown, Settings2 } from '@lucide/svelte';

	interface Props {
		table: any; // Type is complex, using any for now or I should import Table type
	}

	let { table }: Props = $props();
</script>

<div class="flex items-center justify-end gap-2">
	<!-- Column Visibility -->
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button variant="outline" size="sm" {...props}>
					<Settings2 class="mr-2 h-4 w-4" />
					Columns
					<ChevronDown class="ml-2 h-4 w-4" />
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-48">
			<DropdownMenu.Label>Toggle Columns</DropdownMenu.Label>
			<DropdownMenu.Separator />
			{#each table.getAllColumns().filter((col: any) => col.getCanHide()) as column (column.id)}
				<DropdownMenu.CheckboxItem
					class="capitalize"
					checked={column.getIsVisible()}
					onCheckedChange={(value) => column.toggleVisibility(!!value)}
				>
					{column.id.replace(/([A-Z_])/g, ' $1').trim()}
				</DropdownMenu.CheckboxItem>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>
