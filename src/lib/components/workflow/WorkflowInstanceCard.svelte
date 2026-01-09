<script lang="ts">
	import type { WorkflowInstance } from '$lib/stores/workflow';

	// Props
	const {
		instance,
		onviewDetails = undefined
	}: {
		instance: WorkflowInstance;
		onviewDetails?: ((detail: WorkflowInstance) => void) | undefined;
	} = $props();

	// Derived values
	const statusColor = $derived(getStatusColor(instance.status));
	const categoryColor = $derived(
		getCategoryColor(instance.workflowDefinitionByWorkflowDefinitionId?.category ?? '')
	);
	const duration = $derived(calculateDuration(instance.startedAt, instance.completedAt));

	function getStatusColor(status: string) {
		switch (status) {
			case 'running':
				return 'bg-blue-100 text-blue-800';
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			case 'cancelled':
				return 'bg-gray-100 text-gray-800';
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function getCategoryColor(category: string) {
		switch (category?.toLowerCase()) {
			case 'onboarding':
				return 'bg-blue-100 text-blue-800';
			case 'offboarding':
				return 'bg-red-100 text-red-800';
			case 'performance':
				return 'bg-purple-100 text-purple-800';
			case 'leave':
				return 'bg-indigo-100 text-indigo-800';
			case 'compliance':
				return 'bg-orange-100 text-orange-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function calculateDuration(startedAt: string | undefined, completedAt: string | undefined) {
		if (!startedAt) return null;

		const start = new Date(startedAt);
		const end = completedAt ? new Date(completedAt) : new Date();
		const diffMs = end.getTime() - start.getTime();

		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

		if (hours > 0) {
			return `${hours}h ${minutes}m`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		} else {
			return `${seconds}s`;
		}
	}

	function handleViewDetails() {
		onviewDetails?.(instance);
	}
</script>

<div
	class="workflow-instance-card rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
>
	<!-- Header -->
	<div class="mb-4 flex items-start justify-between">
		<div class="flex-1">
			<div class="mb-2 flex items-center gap-3">
				<h3 class="text-lg font-semibold text-gray-900">
					{instance.workflowDefinitionByWorkflowDefinitionId?.name || 'Unknown Workflow'}
				</h3>

				{#if instance.workflowDefinitionByWorkflowDefinitionId?.category}
					<span
						class={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${categoryColor}`}
					>
						{instance.workflowDefinitionByWorkflowDefinitionId.category}
					</span>
				{/if}
			</div>

			<p class="text-sm text-gray-600">
				Instance ID: <span class="font-mono">{instance.id}</span>
			</p>
		</div>

		<!-- Status Badge -->
		<span
			class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
		>
			<span class="mr-1">
				{#if instance.status === 'running'}
					<svg class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				{:else if instance.status === 'completed'}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{:else if instance.status === 'failed'}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{:else if instance.status === 'pending'}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{:else}
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				{/if}
			</span>
			{instance.status}
		</span>
	</div>

	<!-- Metadata Grid -->
	<div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
		<div>
			<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Created</dt>
			<dd class="mt-1 text-sm text-gray-900">{formatDate(instance.createdAt)}</dd>
		</div>

		{#if instance.startedAt}
			<div>
				<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Started</dt>
				<dd class="mt-1 text-sm text-gray-900">{formatDate(instance.startedAt)}</dd>
			</div>
		{/if}

		{#if instance.completedAt}
			<div>
				<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Completed</dt>
				<dd class="mt-1 text-sm text-gray-900">{formatDate(instance.completedAt)}</dd>
			</div>
		{/if}

		{#if duration}
			<div>
				<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Duration</dt>
				<dd class="mt-1 text-sm text-gray-900">{duration}</dd>
			</div>
		{/if}
	</div>

	<!-- Triggered By -->
	{#if instance.userByTriggeredByUserId}
		<div class="mb-4">
			<dt class="text-xs font-medium uppercase tracking-wide text-gray-500">Triggered By</dt>
			<dd class="mt-1 text-sm text-gray-900">
				{instance.userByTriggeredByUserId.displayName}
				<span class="text-gray-500">({instance.userByTriggeredByUserId.email})</span>
			</dd>
		</div>
	{/if}

	<!-- Trigger Data Preview -->
	{#if instance.triggerData && typeof instance.triggerData === 'object'}
		<div class="mb-4">
			<dt class="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Trigger Data</dt>
			<div class="rounded-md bg-gray-50 p-3">
				<pre class="overflow-x-auto text-xs text-gray-700">{JSON.stringify(
						instance.triggerData,
						null,
						2
					)}</pre>
			</div>
		</div>
	{/if}

	<!-- Progress Indicator -->
	{#if instance.status === 'running'}
		<div class="mb-4">
			<div class="mb-2 flex items-center justify-between">
				<span class="text-sm font-medium text-gray-700">In Progress</span>
				<span class="text-sm text-gray-500">Running...</span>
			</div>
			<div class="h-2 w-full rounded-full bg-gray-200">
				<div class="h-2 animate-pulse rounded-full bg-blue-600" style="width: 60%"></div>
			</div>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex items-center justify-between border-t border-gray-200 pt-4">
		<div class="text-xs text-gray-500">
			Last updated: {formatDate(instance.updatedAt)}
		</div>

		<button
			onclick={handleViewDetails}
			class="text-sm font-medium text-blue-600 hover:text-blue-800"
		>
			View Details →
		</button>
	</div>
</div>
