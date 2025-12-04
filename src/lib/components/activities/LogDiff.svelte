<script lang="ts">
	const { before = null, after = null } = $props();

	// Compute diffs
	const diffs = $derived.by(() => {
		// Handle nulls gracefully
		const beforeObj = before || {};
		const afterObj = after || {};

		const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

		const changes = [];

		for (const key of allKeys) {
			const oldVal = beforeObj[key];
			const newVal = afterObj[key];

			// Simple deep equality check for JSON objects/primitives
			if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
				changes.push({
					key,
					oldVal,
					newVal,
					type: oldVal === undefined ? 'added' : newVal === undefined ? 'removed' : 'changed'
				});
			}
		}
		return changes;
	});

	function formatValue(val: any) {
		if (val === undefined) return '—';
		if (val === null) return 'null';
		if (typeof val === 'object') return JSON.stringify(val, null, 2);
		return String(val);
	}
</script>

<div class="rounded-md border bg-card text-card-foreground shadow-sm">
	<div class="border-b px-4 py-3">
		<h3 class="font-semibold">Changes</h3>
	</div>
	<div class="divide-y">
		{#each diffs as change (change.key)}
			<div class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
				<div class="font-medium text-muted-foreground">{change.key}</div>
				<div class="space-y-1">
					<div class="text-xs font-semibold uppercase text-red-500">Before</div>
					<div class="rounded bg-muted/50 p-2 font-mono text-sm text-muted-foreground break-all">
						{formatValue(change.oldVal)}
					</div>
				</div>
				<div class="space-y-1">
					<div class="text-xs font-semibold uppercase text-green-500">After</div>
					<div class="rounded bg-muted/50 p-2 font-mono text-sm break-all">
						{formatValue(change.newVal)}
					</div>
				</div>
			</div>
		{:else}
			<div class="p-8 text-center text-muted-foreground">
				No changes detected or snapshots unavailable.
			</div>
		{/each}
	</div>
</div>
