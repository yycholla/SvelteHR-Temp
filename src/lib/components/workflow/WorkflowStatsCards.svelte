<script lang="ts">
	import { workflowStats } from '$lib/stores/workflow';

	// Derived from store
	const stats = $derived($workflowStats);
</script>

<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
	<!-- Definitions Stats -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Total Definitions</p>
				<p class="text-3xl font-bold text-gray-900">{stats.definitions.total}</p>
			</div>
			<div class="rounded-full bg-blue-100 p-3">
				<svg class="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
					/>
				</svg>
			</div>
		</div>
		<div class="mt-4 flex items-center">
			<span class="text-sm font-medium text-green-600">
				{stats.definitions.active} active
			</span>
			<span class="ml-2 text-sm text-gray-500">
				• {stats.definitions.inactive} inactive
			</span>
		</div>
	</div>

	<!-- Instances Stats -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Total Instances</p>
				<p class="text-3xl font-bold text-gray-900">{stats.instances.total}</p>
			</div>
			<div class="rounded-full bg-green-100 p-3">
				<svg class="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
			</div>
		</div>
		<div class="mt-4 flex items-center">
			<span class="text-sm font-medium text-blue-600">
				{stats.instances.running} running
			</span>
			<span class="ml-2 text-sm text-gray-500">
				• {stats.instances.completed} completed
			</span>
		</div>
	</div>

	<!-- Success Rate -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Success Rate</p>
				<p class="text-3xl font-bold text-gray-900">
					{stats.instances.successRate.toFixed(1)}%
				</p>
			</div>
			<div class="rounded-full bg-emerald-100 p-3">
				<svg class="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
		</div>
		<div class="mt-4 flex items-center">
			<span
				class={`text-sm font-medium ${stats.instances.successRate >= 90 ? 'text-green-600' : stats.instances.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
			>
				{stats.instances.completed} successful
			</span>
			<span class="ml-2 text-sm text-gray-500">
				• {stats.instances.failed} failed
			</span>
		</div>
	</div>

	<!-- Tasks Stats -->
	<div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-gray-600">Active Tasks</p>
				<p class="text-3xl font-bold text-gray-900">
					{stats.tasks.pending + stats.tasks.inProgress}
				</p>
			</div>
			<div class="rounded-full bg-purple-100 p-3">
				<svg class="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
			</div>
		</div>
		<div class="mt-4 flex items-center">
			<span class="text-sm font-medium text-orange-600">
				{stats.tasks.pending} pending
			</span>
			<span class="ml-2 text-sm text-gray-500">
				• {stats.tasks.inProgress} in progress
			</span>
		</div>
	</div>
</div>

<!-- Detailed Stats Row -->
<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
	<h3 class="mb-4 text-lg font-semibold text-gray-900">Performance Overview</h3>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Instance Status Breakdown -->
		<div>
			<h4 class="mb-3 text-sm font-medium text-gray-700">Instance Status</h4>
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Running</span>
					<div class="flex items-center">
						<div class="mr-2 h-2 w-16 rounded-full bg-gray-200">
							<div
								class="h-2 rounded-full bg-blue-600"
								style="width: {stats.instances.total > 0
									? (stats.instances.running / stats.instances.total) * 100
									: 0}%"
							></div>
						</div>
						<span class="text-sm font-medium text-gray-900">{stats.instances.running}</span>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Completed</span>
					<div class="flex items-center">
						<div class="mr-2 h-2 w-16 rounded-full bg-gray-200">
							<div
								class="h-2 rounded-full bg-green-600"
								style="width: {stats.instances.total > 0
									? (stats.instances.completed / stats.instances.total) * 100
									: 0}%"
							></div>
						</div>
						<span class="text-sm font-medium text-gray-900">{stats.instances.completed}</span>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Failed</span>
					<div class="flex items-center">
						<div class="mr-2 h-2 w-16 rounded-full bg-gray-200">
							<div
								class="h-2 rounded-full bg-red-600"
								style="width: {stats.instances.total > 0
									? (stats.instances.failed / stats.instances.total) * 100
									: 0}%"
							></div>
						</div>
						<span class="text-sm font-medium text-gray-900">{stats.instances.failed}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Task Completion Rate -->
		<div>
			<h4 class="mb-3 text-sm font-medium text-gray-700">Task Progress</h4>
			<div class="space-y-2">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Pending</span>
					<div class="flex items-center">
						<div class="mr-2 h-2 w-16 rounded-full bg-gray-200">
							<div
								class="h-2 rounded-full bg-yellow-600"
								style="width: {stats.tasks.total > 0
									? (stats.tasks.pending / stats.tasks.total) * 100
									: 0}%"
							></div>
						</div>
						<span class="text-sm font-medium text-gray-900">{stats.tasks.pending}</span>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">In Progress</span>
					<div class="flex items-center">
						<div class="mr-2 h-2 w-16 rounded-full bg-gray-200">
							<div
								class="h-2 rounded-full bg-blue-600"
								style="width: {stats.tasks.total > 0
									? (stats.tasks.inProgress / stats.tasks.total) * 100
									: 0}%"
							></div>
						</div>
						<span class="text-sm font-medium text-gray-900">{stats.tasks.inProgress}</span>
					</div>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Completed</span>
					<div class="flex items-center">
						<div class="mr-2 h-2 w-16 rounded-full bg-gray-200">
							<div
								class="h-2 rounded-full bg-green-600"
								style="width: {stats.tasks.total > 0
									? (stats.tasks.completed / stats.tasks.total) * 100
									: 0}%"
							></div>
						</div>
						<span class="text-sm font-medium text-gray-900">{stats.tasks.completed}</span>
					</div>
				</div>
			</div>
		</div>

		<!-- Key Metrics -->
		<div>
			<h4 class="mb-3 text-sm font-medium text-gray-700">Key Metrics</h4>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Workflow Success Rate</span>
					<span
						class={`text-sm font-medium ${stats.instances.successRate >= 90 ? 'text-green-600' : stats.instances.successRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
					>
						{stats.instances.successRate.toFixed(1)}%
					</span>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Task Completion Rate</span>
					<span
						class={`text-sm font-medium ${stats.tasks.completionRate >= 90 ? 'text-green-600' : stats.tasks.completionRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}
					>
						{stats.tasks.completionRate.toFixed(1)}%
					</span>
				</div>

				<div class="flex items-center justify-between">
					<span class="text-sm text-gray-600">Active Definitions</span>
					<span class="text-sm font-medium text-gray-900">
						{stats.definitions.active}/{stats.definitions.total}
					</span>
				</div>
			</div>
		</div>
	</div>
</div>
