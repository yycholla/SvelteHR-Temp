<script lang="ts">
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';

	interface Props {
		requiresManualReassignment: boolean;
	}

	let { requiresManualReassignment = $bindable() }: Props = $props();
</script>

<div class="space-y-4 rounded-lg border bg-card p-6">
	<h3 class="border-b pb-2 text-lg font-semibold">Advanced Options</h3>

	<!-- Requires Manual Reassignment -->
	<div class="flex items-center justify-between">
		<div class="space-y-0.5">
			<Label>Requires Manual Reassignment</Label>
			<p class="text-sm text-muted-foreground">
				Prevent automatic reassignment during organizational changes
			</p>
		</div>
		<Switch bind:checked={requiresManualReassignment} />
	</div>
</div>
