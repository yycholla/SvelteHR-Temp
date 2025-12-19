<script lang="ts">
	import { Search } from '@lucide/svelte';

	interface Props {
		searchQuery: string;
		filters: { role: string; department: string; status: string };
		roles: any[];
		departments: any[];
		onApplyFilters: () => void;
		onClearFilters: () => void;
	}

	let {
		searchQuery = $bindable(),
		filters = $bindable(),
		roles,
		departments,
		onApplyFilters,
		onClearFilters
	}: Props = $props();
</script>

<div class="flex items-center gap-2 w-full">
	<!-- Search -->
	<div class="relative w-[300px]">
		<Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search..."
			class="w-full h-8 rounded-sm border border-input bg-background pl-8 pr-3 text-xs focus:border-primary focus:outline-none transition-colors"
		/>
	</div>

	<div class="h-4 w-px bg-border mx-1"></div>

	<!-- Filters -->
	<div class="flex items-center gap-2">
		<select
			bind:value={filters.role}
			onchange={onApplyFilters}
			class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none"
		>
			<option value="">Role: All</option>
			{#each roles as role}
				<option value={role.name}>{role.name}</option>
			{/each}
		</select>

		<select
			bind:value={filters.department}
			onchange={onApplyFilters}
			class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none"
		>
			<option value="">Dept: All</option>
			{#each departments as dept}
				<option value={dept.id}>{dept.name}</option>
			{/each}
		</select>

		<select
			bind:value={filters.status}
			onchange={onApplyFilters}
			class="h-8 rounded-sm border border-input bg-background px-2 text-xs focus:border-primary focus:outline-none"
		>
			<option value="">Status: All</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>

		{#if filters.role || filters.department || filters.status || searchQuery}
			<button
				onclick={onClearFilters}
				class="h-8 px-3 rounded-sm border border-input bg-muted/50 text-xs hover:bg-accent transition-colors ml-1"
			>
				Reset
			</button>
		{/if}
	</div>
</div>
