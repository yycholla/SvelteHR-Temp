<script lang="ts">
	import { useSortable } from '@dnd-kit-svelte/sortable';
	import { Button } from '$lib/components/ui/button/index.js';
	import GripVerticalIcon from '@tabler/icons-svelte/icons/grip-vertical';

	let { id }: { id: number } = $props();
	
	const { attributes, listeners } = useSortable({ id: () => id });
</script>

<Button
	{...attributes.current}
	{...listeners.current}
	variant="ghost"
	size="icon"
	class="size-7 text-muted-foreground hover:bg-transparent"
>
	<GripVerticalIcon class="size-3 text-muted-foreground" />
	<span class="sr-only">Drag to reorder</span>
</Button>
