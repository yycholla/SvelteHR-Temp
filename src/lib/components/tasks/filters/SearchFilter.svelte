<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Search } from '@lucide/svelte';

	interface Props {
		search: string;
		onSearchChange: (value: string) => void;
	}

	let { search, onSearchChange }: Props = $props();
</script>

<div class="space-y-2">
	<Label for="search">Search</Label>
	<div class="relative">
		<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
		<Input
			id="search"
			type="text"
			placeholder="Search tasks by title or description..."
			value={search}
			oninput={(e) => onSearchChange(e.currentTarget.value)}
			class="pl-9"
		/>
	</div>
</div>
