<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Card from '$lib/components/ui/card';
	import { Search } from '@lucide/svelte';

	interface Props {
		searchTerm: string;
		selectedSize: string;
		selectedHead: string;
		pageSize: string;
		sizeOptions: any[];
		headOptions: any[];
		onSearch: () => void;
		onClear: () => void;
	}

	let {
		searchTerm = $bindable(),
		selectedSize = $bindable(),
		selectedHead = $bindable(),
		pageSize = $bindable(),
		sizeOptions,
		headOptions,
		onSearch,
		onClear
	}: Props = $props();
</script>

<Card.Root class="mb-6">
	<Card.Header>
		<Card.Title>Search & Filter Teams</Card.Title>
		<Card.Description>Find teams by name, size, or leadership status</Card.Description>
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
				<!-- Search Input -->
				<div class="space-y-2">
					<label for="search" class="text-sm font-medium">Search</label>
					<div class="relative">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							id="search"
							type="text"
							placeholder="Search team names..."
							bind:value={searchTerm}
							class="pl-9"
						/>
					</div>
				</div>

				<!-- Size Filter -->
				<div class="space-y-2">
					<label for="size" class="text-sm font-medium">Team Size</label>
					<Select type="single" bind:value={selectedSize}>
						<SelectTrigger placeholder="All Sizes" />
						<SelectContent>
							{#each sizeOptions as option}
								<SelectItem value={option.value}>{option.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<!-- Head Filter -->
				<div class="space-y-2">
					<label for="head" class="text-sm font-medium">Leadership</label>
					<Select type="single" bind:value={selectedHead}>
						<SelectTrigger placeholder="All Teams" />
						<SelectContent>
							{#each headOptions as option}
								<SelectItem value={option.value}>{option.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>

				<!-- Page Size -->
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
				<Button type="submit">
					<Search class="mr-2 h-4 w-4" />
					Search
				</Button>
				<Button type="button" variant="outline" onclick={onClear}>Clear Filters</Button>
			</div>
		</form>
	</Card.Content>
</Card.Root>
