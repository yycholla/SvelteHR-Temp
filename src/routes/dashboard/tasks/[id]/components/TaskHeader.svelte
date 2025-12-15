<script lang="ts">
	import { Pencil, Share2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		taskId: string;
		title: string;
		onEdit: () => void;
	}

	const { taskId, title, onEdit }: Props = $props();
</script>

<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
	<div class="space-y-1.5">
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<a href="/dashboard" class="transition-colors hover:text-foreground">Dashboard</a>
			<span>/</span>
			<a href="/dashboard/tasks" class="transition-colors hover:text-foreground">Tasks</a>
			<span>/</span>
			<span class="font-medium text-foreground">T-{taskId.slice(0, 8)}</span>
		</div>
		<h1 class="text-3xl font-bold tracking-tight">{title}</h1>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="outline" size="sm" class="h-9" disabled>
			<Share2 class="mr-2 h-4 w-4" />
			Share
		</Button>
		<Button size="sm" class="h-9" onclick={onEdit}>
			<Pencil class="mr-2 h-4 w-4" />
			Edit Task
		</Button>
	</div>
</div>
