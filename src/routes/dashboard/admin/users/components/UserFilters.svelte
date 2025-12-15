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

<div class="flex flex-col gap-4 sm:flex-row">
	<!-- Search -->
	<div class="relative flex-1">
		<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search users by email, name, or department..."
			class="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm focus:border-primary focus:outline-none"
		/>
	</div>

	<!-- Filters -->
	<div class="flex gap-2">
		<select
			bind:value={filters.role}
			onchange={onApplyFilters}
			class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
		>
			<option value="">All Roles</option>
			{#each roles as role}
				<option value={role.name}>{role.name}</option>
			{/each}
		</select>

		<select
			bind:value={filters.department}
			onchange={onApplyFilters}
			class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
		>
			<option value="">All Departments</option>
			{#each departments as dept}
				<option value={dept.id}>{dept.name}</option>
			{/each}
		</select>

		<select
			bind:value={filters.status}
			onchange={onApplyFilters}
			class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
		>
			<option value="">All Status</option>
			<option value="active">Active</option>
			<option value="inactive">Inactive</option>
		</select>

		{#if filters.role || filters.department || filters.status}
			<button
				onclick={onClearFilters}
				class="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-accent"
			>
				Clear
			</button>
		{/if}
	</div>
</div>
