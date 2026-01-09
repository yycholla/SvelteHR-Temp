<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import MultiSearchInput from '$lib/components/ui/tag-input/MultiSearchInput.svelte';

	interface Props {
		viewMode: 'grid' | 'list';
		searchTerms: string[];
		selectedParent: string;
		selectedHasHead: string;
		pageSize: string;
		departments: any[];
		departmentSearchOptions: any[];
		hasHeadOptions: any[];
		onSearch: () => void;
		onClear: () => void;
	}

	let {
		viewMode,
		searchTerms = $bindable(),
		selectedParent = $bindable(),
		selectedHasHead = $bindable(),
		pageSize = $bindable(),
		departments,
		departmentSearchOptions,
		hasHeadOptions,
		onSearch,
		onClear
	}: Props = $props();
</script>

{#if viewMode === 'grid'}
	<Card.Root>
		<Card.Header>
			<Card.Title>Search & Filter Departments</Card.Title>
			<Card.Description>Find departments by name, parent, or leadership status</Card.Description>
		</Card.Header>
		<Card.Content>
			<form
				onsubmit={(e) => {
					e.preventDefault();
					onSearch();
				}}
				class="space-y-4"
			>
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div class="space-y-2">
						<label for="search" class="text-sm font-medium">Search</label>
						<MultiSearchInput
							bind:searchTerms
							onSearchChange={onSearch}
							debounceMs={500}
							allowCustomTerms={true}
							placeholder="Search departments..."
							options={departmentSearchOptions}
						/>
					</div>
					<div class="space-y-2">
						<label for="parent" class="text-sm font-medium">Parent Department</label>
						<Select type="single" bind:value={selectedParent}>
							<SelectTrigger placeholder="All Parents" />
							<SelectContent>
								<SelectItem value="">All Parents</SelectItem>
								<SelectItem value="null">Top-level Only</SelectItem>
								{#each departments.filter((dept) => !dept.parentDepartmentId) as parent}
									<SelectItem value={parent.id}>{parent.name}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-2">
						<label for="hasHead" class="text-sm font-medium">Leadership Status</label>
						<Select type="single" bind:value={selectedHasHead}>
							<SelectTrigger placeholder="All Departments" />
							<SelectContent>
								{#each hasHeadOptions as option}
									<SelectItem value={option.value}>{option.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div class="space-y-2">
						<label for="pagesize" class="text-sm font-medium">Per Page</label>
						<Select type="single" bind:value={pageSize}>
							<SelectTrigger placeholder="20" />
							<SelectContent>
								<SelectItem value="10">10</SelectItem>
								<SelectItem value="20">20</SelectItem>
								<SelectItem value="50">50</SelectItem>
								<SelectItem value="100">100</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
				<div class="flex gap-2">
					<Button type="button" variant="outline" onclick={onClear}>Clear Filters</Button>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
{:else}
	<!-- List View Filters (Inline) -->
	<div class="flex items-end justify-between gap-3">
		<div class="flex items-end gap-3 flex-1">
			<!-- Search Input -->
			<div class="w-96 space-y-2">
				<label for="search-inline" class="text-sm font-medium">Search</label>
				<MultiSearchInput
					bind:searchTerms
					onSearchChange={onSearch}
					debounceMs={500}
					allowCustomTerms={true}
					placeholder="Search..."
					options={departmentSearchOptions}
				/>
			</div>

			<!-- Parent Filter -->
			<div class="w-48 space-y-2">
				<label for="parent-inline" class="text-sm font-medium">Parent</label>
				<select
					id="parent-inline"
					bind:value={selectedParent}
					onchange={onSearch}
					class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
				>
					<option value="">All Parents</option>
					<option value="null">Top-level Only</option>
					{#each departments.filter((dept) => !dept.parentDepartmentId) as parent}
						<option value={parent.id}>{parent.name}</option>
					{/each}
				</select>
			</div>

			<!-- Status Filter -->
			<div class="w-48 space-y-2">
				<label for="head-inline" class="text-sm font-medium">Leadership</label>
				<select
					id="head-inline"
					bind:value={selectedHasHead}
					onchange={onSearch}
					class="flex h-9 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-1 text-base shadow-xs ring-offset-background transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/80"
				>
					{#each hasHeadOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<div class="invisible text-sm font-medium">Clear</div>
				<Button type="button" variant="outline" size="sm" onclick={onClear}>Clear</Button>
			</div>
		</div>
	</div>
{/if}
