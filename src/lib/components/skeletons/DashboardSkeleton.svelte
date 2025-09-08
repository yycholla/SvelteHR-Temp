<!--
	Dashboard Skeleton Component
	
	Loading placeholder for the main dashboard page
	Shows skeleton versions of analytics cards, charts, and activity feeds
-->

<script lang="ts">
	import Skeleton from '../ui/Skeleton.svelte';

	interface DashboardSkeletonProps {
		showCharts?: boolean;
		showActivity?: boolean;
		showQuickActions?: boolean;
	}

	let {
		showCharts = true,
		showActivity = true,
		showQuickActions = true
	}: DashboardSkeletonProps = $props();
</script>

<div class="dashboard-skeleton p-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="space-y-2">
			<Skeleton class="h-8 w-64" />
			<Skeleton class="h-4 w-48" />
		</div>
		{#if showQuickActions}
			<div class="flex space-x-3">
				<Skeleton class="h-10 w-32" />
				<Skeleton class="h-10 w-28" />
			</div>
		{/if}
	</div>

	<!-- Analytics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		{#each Array(4) as _}
			<div class="border rounded-lg p-6 space-y-4">
				<div class="flex items-center justify-between">
					<Skeleton class="h-4 w-24" />
					<Skeleton variant="circular" class="w-8 h-8" />
				</div>
				<div class="space-y-2">
					<Skeleton class="h-8 w-16" />
					<div class="flex items-center space-x-2">
						<Skeleton class="h-3 w-12" />
						<Skeleton class="h-3 w-20" />
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Charts and Activity Section -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- Charts Column -->
		{#if showCharts}
			<div class="lg:col-span-2 space-y-6">
				<!-- Main Chart -->
				<div class="border rounded-lg p-6 space-y-4">
					<div class="flex items-center justify-between">
						<Skeleton class="h-6 w-48" />
						<div class="flex space-x-2">
							<Skeleton class="h-8 w-16" />
							<Skeleton class="h-8 w-16" />
						</div>
					</div>
					<Skeleton class="h-64 w-full" />
				</div>

				<!-- Secondary Charts -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each Array(2) as _}
						<div class="border rounded-lg p-6 space-y-4">
							<Skeleton class="h-5 w-32" />
							<Skeleton class="h-32 w-full" />
							<div class="flex justify-between">
								<Skeleton class="h-3 w-16" />
								<Skeleton class="h-3 w-12" />
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Activity and Events Column -->
		{#if showActivity}
			<div class="space-y-6">
				<!-- Recent Activity -->
				<div class="border rounded-lg p-6 space-y-4">
					<div class="flex items-center justify-between">
						<Skeleton class="h-5 w-32" />
						<Skeleton class="h-4 w-16" />
					</div>
					<div class="space-y-4">
						{#each Array(5) as _}
							<div class="flex items-start space-x-3">
								<Skeleton variant="circular" class="w-8 h-8 flex-shrink-0" />
								<div class="flex-1 space-y-2">
									<Skeleton class="h-4 w-full" />
									<Skeleton class="h-3 w-3/4" />
									<Skeleton class="h-3 w-16" />
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Upcoming Events -->
				<div class="border rounded-lg p-6 space-y-4">
					<div class="flex items-center justify-between">
						<Skeleton class="h-5 w-36" />
						<Skeleton class="h-4 w-20" />
					</div>
					<div class="space-y-3">
						{#each Array(3) as _}
							<div class="flex items-center space-x-3 p-3 border rounded">
								<div class="flex flex-col items-center space-y-1">
									<Skeleton class="h-6 w-8" />
									<Skeleton class="h-3 w-8" />
								</div>
								<div class="flex-1 space-y-1">
									<Skeleton class="h-4 w-full" />
									<Skeleton class="h-3 w-2/3" />
								</div>
								<Skeleton class="h-6 w-12" />
							</div>
						{/each}
					</div>
				</div>

				<!-- Quick Stats -->
				<div class="border rounded-lg p-6 space-y-4">
					<Skeleton class="h-5 w-28" />
					<div class="space-y-3">
						{#each Array(4) as _}
							<div class="flex items-center justify-between">
								<Skeleton class="h-4 w-24" />
								<Skeleton class="h-4 w-8" />
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Bottom Section -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
		<!-- Team Performance -->
		<div class="border rounded-lg p-6 space-y-4">
			<Skeleton class="h-5 w-36" />
			<div class="space-y-3">
				{#each Array(4) as _}
					<div class="flex items-center space-x-4">
						<Skeleton variant="circular" class="w-10 h-10" />
						<div class="flex-1 space-y-2">
							<div class="flex items-center justify-between">
								<Skeleton class="h-4 w-32" />
								<Skeleton class="h-4 w-12" />
							</div>
							<Skeleton class="h-2 w-full" />
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Recent Notifications -->
		<div class="border rounded-lg p-6 space-y-4">
			<Skeleton class="h-5 w-40" />
			<div class="space-y-3">
				{#each Array(4) as _}
					<div class="flex items-start space-x-3 p-3 border rounded">
						<Skeleton class="w-2 h-2 rounded-full flex-shrink-0 mt-2" />
						<div class="flex-1 space-y-2">
							<Skeleton class="h-4 w-full" />
							<Skeleton class="h-3 w-2/3" />
							<Skeleton class="h-3 w-16" />
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>