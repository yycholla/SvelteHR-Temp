<script lang="ts">
	import type { WorkflowInstance } from '$lib/stores/workflow';

	// Props
	const {
		instance,
		onclose = undefined
	}: {
		instance: WorkflowInstance;
		onclose?: (() => void) | undefined;
	} = $props();

	// Derived values
	const statusColor = $derived(getStatusColor(instance.status));
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

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function calculateDuration(startedAt: string | null, completedAt: string | null) {
		if (!startedAt) return null;

		const start = new Date(startedAt);
		const end = completedAt ? new Date(completedAt) : new Date();
		const diffMs = end.getTime() - start.getTime();

		const hours = Math.floor(diffMs / (1000 * 60 * 60));
		const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

		if (hours > 0) {
			return `${hours}h ${minutes}m ${seconds}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds}s`;
		} else {
			return `${seconds}s`;
		}
	}

	function handleClose() {
		onclose?.();
	}
</script>

<!-- Modal Backdrop -->
<div class="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75 p-4">
	<div class="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
		<!-- Header -->
		<div class="border-b border-gray-200 px-6 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<h3 class="text-lg font-medium text-gray-900">Workflow Instance Details</h3>
					<span
						class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${statusColor}`}
					>
						<span class="mr-1">
							{#if instance.status === 'running'}
								<svg
									class="h-5 w-5 animate-spin"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
							{:else if instance.status === 'completed'}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{:else if instance.status === 'failed'}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{:else if instance.status === 'pending'}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							{:else}
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
				<button
					onclick={handleClose}
					class="text-gray-400 hover:text-gray-600"
					aria-label="Close dialog"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="max-h-[calc(90vh-120px)] overflow-y-auto px-6 py-4">
			<!-- Basic Information -->
			<div class="mb-8">
				<h4 class="text-md mb-4 font-semibold text-gray-900">Basic Information</h4>
				<div class="rounded-lg bg-gray-50 p-4">
					<dl class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<dt class="text-sm font-medium text-gray-500">Instance ID</dt>
							<dd class="font-mono text-sm text-gray-900">{instance.id}</dd>
						</div>

						<div>
							<dt class="text-sm font-medium text-gray-500">Workflow Name</dt>
							<dd class="text-sm text-gray-900">
								{instance.workflowDefinitionByWorkflowDefinitionId?.name || 'Unknown Workflow'}
							</dd>
						</div>

						{#if instance.workflowDefinitionByWorkflowDefinitionId?.category}
							<div>
								<dt class="text-sm font-medium text-gray-500">Category</dt>
								<dd class="text-sm text-gray-900">
									{instance.workflowDefinitionByWorkflowDefinitionId.category}
								</dd>
							</div>
						{/if}

						<div>
							<dt class="text-sm font-medium text-gray-500">Status</dt>
							<dd class="text-sm text-gray-900">{instance.status}</dd>
						</div>
					</dl>
				</div>
			</div>

			<!-- Timeline -->
			<div class="mb-8">
				<h4 class="text-md mb-4 font-semibold text-gray-900">Timeline</h4>
				<div class="space-y-4">
					<!-- Created -->
					<div class="flex items-center">
						<div class="h-2 w-2 flex-shrink-0 rounded-full bg-gray-400"></div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-900">Created</p>
							<p class="text-sm text-gray-500">{formatDate(instance.createdAt)}</p>
						</div>
					</div>

					<!-- Started -->
					{#if instance.startedAt}
						<div class="flex items-center">
							<div class="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500"></div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-900">Started</p>
								<p class="text-sm text-gray-500">{formatDate(instance.startedAt)}</p>
							</div>
						</div>
					{/if}

					<!-- Completed -->
					{#if instance.completedAt}
						<div class="flex items-center">
							<div class="h-2 w-2 flex-shrink-0 rounded-full bg-green-500"></div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-900">Completed</p>
								<p class="text-sm text-gray-500">{formatDate(instance.completedAt)}</p>
								{#if duration}
									<p class="text-xs text-gray-400">Duration: {duration}</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Last Updated -->
					<div class="flex items-center">
						<div class="h-2 w-2 flex-shrink-0 rounded-full bg-gray-300"></div>
						<div class="ml-4">
							<p class="text-sm font-medium text-gray-900">Last Updated</p>
							<p class="text-sm text-gray-500">{formatDate(instance.updatedAt)}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Triggered By -->
			{#if instance.userByTriggeredByUserId}
				<div class="mb-8">
					<h4 class="text-md mb-4 font-semibold text-gray-900">Triggered By</h4>
					<div class="rounded-lg bg-gray-50 p-4">
						<div class="flex items-center">
							<div class="flex-shrink-0">
								<div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
									<svg
										class="h-5 w-5 text-blue-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
										/>
									</svg>
								</div>
							</div>
							<div class="ml-4">
								<p class="text-sm font-medium text-gray-900">
									{instance.userByTriggeredByUserId.displayName}
								</p>
								<p class="text-sm text-gray-500">
									{instance.userByTriggeredByUserId.email}
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<!-- Trigger Data -->
			{#if instance.triggerData}
				<div class="mb-8">
					<h4 class="text-md mb-4 font-semibold text-gray-900">Trigger Data</h4>
					<div class="overflow-x-auto rounded-lg bg-gray-900 p-4">
						<pre class="whitespace-pre-wrap text-sm text-green-400">{JSON.stringify(
								instance.triggerData,
								null,
								2
							)}</pre>
					</div>
				</div>
			{/if}

			<!-- Context Data -->
			{#if instance.contextData}
				<div class="mb-8">
					<h4 class="text-md mb-4 font-semibold text-gray-900">Context Data</h4>
					<div class="overflow-x-auto rounded-lg bg-gray-900 p-4">
						<pre class="whitespace-pre-wrap text-sm text-blue-400">{JSON.stringify(
								instance.contextData,
								null,
								2
							)}</pre>
					</div>
				</div>
			{/if}

			<!-- Progress Indicator for Running Instances -->
			{#if instance.status === 'running'}
				<div class="mb-8">
					<h4 class="text-md mb-4 font-semibold text-gray-900">Progress</h4>
					<div class="rounded-lg bg-blue-50 p-4">
						<div class="mb-2 flex items-center justify-between">
							<span class="text-sm font-medium text-blue-900">Workflow in Progress</span>
							<span class="text-sm text-blue-700">Running...</span>
						</div>
						<div class="h-2 w-full rounded-full bg-blue-200">
							<div class="h-2 animate-pulse rounded-full bg-blue-600" style="width: 60%"></div>
						</div>
						<p class="mt-2 text-xs text-blue-700">
							{#if duration}
								Running for {duration}
							{:else}
								Just started
							{/if}
						</p>
					</div>
				</div>
			{/if}

			<!-- Error Information for Failed Instances -->
			{#if instance.status === 'failed'}
				<div class="mb-8">
					<h4 class="text-md mb-4 font-semibold text-gray-900">Error Information</h4>
					<div class="rounded-lg border border-red-200 bg-red-50 p-4">
						<div class="flex">
							<svg class="mr-2 h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
								<path
									fill-rule="evenodd"
									d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
									clip-rule="evenodd"
								/>
							</svg>
							<div>
								<h3 class="text-sm font-medium text-red-800">Workflow Failed</h3>
								<p class="mt-1 text-sm text-red-700">
									The workflow instance failed to complete successfully. Check the logs for more
									details.
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<div class="flex justify-end border-t border-gray-200 px-6 py-4">
			<button
				onclick={handleClose}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
			>
				Close
			</button>
		</div>
	</div>
</div>
