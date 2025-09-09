<!--
	Employee List Skeleton Component
	
	Loading placeholder for the employee management page
	Shows skeleton for search, filters, table, and pagination
-->

<script lang="ts">
	import Skeleton from '../ui/Skeleton.svelte';

	interface EmployeeListSkeletonProps {
		showFilters?: boolean;
		showSearch?: boolean;
		showBulkActions?: boolean;
		rows?: number;
	}

	let {
		showFilters = true,
		showSearch = true,
		showBulkActions = true,
		rows = 10
	}: EmployeeListSkeletonProps = $props();
</script>

<div class="employee-list-skeleton p-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="space-y-2">
			<Skeleton class="h-8 w-40" />
			<Skeleton class="h-4 w-64" />
		</div>
		<div class="flex space-x-3">
			<Skeleton class="h-10 w-24" />
			<Skeleton class="h-10 w-32" />
		</div>
	</div>

	<!-- Search and Filters -->
	{#if showSearch || showFilters}
		<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
			{#if showSearch}
				<div class="flex-1 max-w-sm">
					<Skeleton class="h-10 w-full" />
				</div>
			{/if}
			
			{#if showFilters}
				<div class="flex space-x-3">
					<Skeleton class="h-10 w-28" />
					<Skeleton class="h-10 w-32" />
					<Skeleton class="h-10 w-24" />
				</div>
			{/if}
		</div>
	{/if}

	<!-- Bulk Actions -->
	{#if showBulkActions}
		<div class="flex items-center justify-between p-3 bg-muted/20 rounded-lg border-dashed border-2">
			<div class="flex items-center space-x-4">
				<Skeleton class="w-4 h-4" />
				<Skeleton class="h-4 w-40" />
			</div>
			<div class="flex space-x-2">
				<Skeleton class="h-8 w-20" />
				<Skeleton class="h-8 w-24" />
			</div>
		</div>
	{/if}

	<!-- Data Table -->
	<div class="border rounded-lg overflow-hidden">
		<!-- Table Header -->
		<div class="border-b bg-muted/50 p-4">
			<div class="flex items-center space-x-4">
				<Skeleton class="w-4 h-4" />
				<div class="grid grid-cols-6 gap-4 flex-1">
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-full" />
					<Skeleton class="h-4 w-16" />
				</div>
			</div>
		</div>

		<!-- Table Rows -->
		{#each Array(rows) as _, index}
			<div class="border-b last:border-b-0 p-4 hover:bg-muted/20">
				<div class="flex items-center space-x-4">
					<Skeleton class="w-4 h-4" />
					<div class="grid grid-cols-6 gap-4 flex-1 items-center">
						<!-- Employee Info -->
						<div class="flex items-center space-x-3">
							<Skeleton variant="circular" class="w-10 h-10" />
							<div class="space-y-1">
								<Skeleton class="h-4 w-24" />
								<Skeleton class="h-3 w-20" />
							</div>
						</div>
						
						<!-- Email -->
						<Skeleton class="h-4 w-full" />
						
						<!-- Department -->
						<Skeleton class="h-4 w-20" />
						
						<!-- Position -->
						<Skeleton class="h-4 w-28" />
						
						<!-- Status -->
						<Skeleton class="h-6 w-16 rounded-full" />
						
						<!-- Actions -->
						<div class="flex space-x-2">
							<Skeleton class="w-8 h-8 rounded" />
							<Skeleton class="w-8 h-8 rounded" />
							<Skeleton class="w-8 h-8 rounded" />
						</div>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-between">
		<Skeleton class="h-4 w-32" />
		<div class="flex items-center space-x-2">
			<Skeleton class="h-8 w-8" />
			<Skeleton class="h-8 w-8" />
			<Skeleton class="h-8 w-8" />
			<span class="text-muted-foreground">...</span>
			<Skeleton class="h-8 w-8" />
			<Skeleton class="h-8 w-8" />
		</div>
	</div>

	<!-- Stats Footer -->
	<div class="flex items-center justify-center space-x-8 pt-4 border-t">
		{#each Array(4) as _}
			<div class="text-center space-y-1">
				<Skeleton class="h-6 w-8 mx-auto" />
				<Skeleton class="h-3 w-16" />
			</div>
		{/each}
	</div>
</div>