<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Download, RefreshCw } from '@lucide/svelte';

	interface Props {
		onRefresh: () => void;
		onExport: () => void;
	}

	let { onRefresh, onExport }: Props = $props();
</script>

<div class="flex items-center justify-between">
	<div>
		<h1 class="text-3xl font-bold tracking-tight">Audit Logs</h1>
		<p class="text-muted-foreground">Comprehensive activity tracking and audit trail</p>
	</div>
	<div class="flex gap-2">
		<Button variant="outline" size="sm" onclick={onRefresh}>
			<RefreshCw class="mr-2 h-4 w-4" />
			Refresh
		</Button>
		<Button size="sm" onclick={onExport}>
			<Download class="mr-2 h-4 w-4" />
			Export CSV
		</Button>
	</div>
</div>
