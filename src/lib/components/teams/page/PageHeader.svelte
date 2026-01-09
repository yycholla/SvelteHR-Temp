<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Plus, TreePine } from '@lucide/svelte';

	interface Props {
		canManageTeams: boolean;
	}

	let { canManageTeams }: Props = $props();
</script>

<div class="flex items-center justify-between">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Teams Management</h1>
		<p class="text-muted-foreground">Manage organizational structure and team composition</p>
	</div>

	{#if canManageTeams}
		<div class="flex gap-2">
			<Button variant="outline" size="sm">
				<TreePine class="mr-2 h-4 w-4" />
				Org Chart
			</Button>
			<Button size="sm" href="/dashboard/teams/new">
				<Plus class="mr-2 h-4 w-4" />
				Create Team
			</Button>
		</div>
	{/if}
</div>
