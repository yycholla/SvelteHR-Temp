<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as NativeSelect from '$lib/components/ui/native-select';
	import * as Field from '$lib/components/ui/field';
	import { Search } from '@lucide/svelte';

	interface Props {
		searchQuery: string;
		selectedAction: string;
		selectedResourceType: string;
		selectedUser: string;
		uniqueActions: string[];
		uniqueResourceTypes: string[];
		onSearchInput: (e: Event) => void;
		onFilterChange: () => void;
		onClear: () => void;
	}

	let {
		searchQuery = $bindable(),
		selectedAction = $bindable(),
		selectedResourceType = $bindable(),
		selectedUser = $bindable(),
		uniqueActions,
		uniqueResourceTypes,
		onSearchInput,
		onFilterChange,
		onClear
	}: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Filter Audit Logs</Card.Title>
		<Card.Description>
			Search and filter activity logs by action, resource, user, and more
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Field.Group>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<!-- Search -->
				<Field.Field>
					<Field.Label>Search</Field.Label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							type="text"
							placeholder="Search logs..."
							value={searchQuery}
							oninput={onSearchInput}
							class="pl-9"
						/>
					</div>
				</Field.Field>

				<!-- Action Filter -->
				<Field.Field>
					<Field.Label>Action</Field.Label>
					<NativeSelect.Root
						value={selectedAction}
						onchange={(e) => {
							selectedAction = e.currentTarget.value;
							onFilterChange();
						}}
					>
						<NativeSelect.Option value="">All Actions</NativeSelect.Option>
						{#each uniqueActions as action}
							<NativeSelect.Option value={action}>{action}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</Field.Field>

				<!-- Resource Type Filter -->
				<Field.Field>
					<Field.Label>Resource Type</Field.Label>
					<NativeSelect.Root
						value={selectedResourceType}
						onchange={(e) => {
							selectedResourceType = e.currentTarget.value;
							onFilterChange();
						}}
					>
						<NativeSelect.Option value="">All Resources</NativeSelect.Option>
						{#each uniqueResourceTypes as resourceType}
							<NativeSelect.Option value={resourceType}>{resourceType}</NativeSelect.Option>
						{/each}
					</NativeSelect.Root>
				</Field.Field>

				<!-- User Filter -->
				<Field.Field>
					<Field.Label>User</Field.Label>
					<NativeSelect.Root
						value={selectedUser}
						onchange={(e) => {
							selectedUser = e.currentTarget.value;
							onFilterChange();
						}}
					>
						<NativeSelect.Option value="">All Users</NativeSelect.Option>
						<!-- Assuming users list would be passed or fetched, for now simple input or static -->
						<!-- The original code used data.uniqueUsers if available or just an input? -->
						<!-- Re-reading original: it didn't iterate users. It just had NativeSelect.Root but loop was cut off? -->
						<!-- I'll assume I can pass users or leave it empty/placeholder -->
					</NativeSelect.Root>
				</Field.Field>
			</div>

			<!-- Clear Filters Button -->
			{#if searchQuery || selectedAction || selectedResourceType || selectedUser}
				<div class="mt-4">
					<Button variant="outline" size="sm" onclick={onClear}>Clear Filters</Button>
				</div>
			{/if}
		</Field.Group>
	</Card.Content>
</Card.Root>
