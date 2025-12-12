<script lang="ts">
	import { Plus, UserPlus, Users } from '@lucide/svelte';
</script>

<div class="rounded-xl border bg-card p-5">
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-2 text-muted-foreground">
			<Users class="h-4 w-4" />
			<span class="text-xs font-semibold uppercase tracking-wider">Dependents</span>
		</div>
		<!-- Placeholder button -->
		<button
			class="rounded-md bg-secondary p-1.5 text-xs opacity-50 transition-colors hover:bg-secondary/80"
			title="Feature coming soon"
		>
			<Plus class="h-3 w-3" />
		</button>
	</div>

	<div
		class="flex h-32 items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5"
	>
		<div class="text-center">
			<UserPlus class="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
			<p class="text-xs text-muted-foreground">No dependents listed</p>
		</div>
	</div>
</div>
