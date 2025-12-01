<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { workflowActions } from '$lib/stores/workflow';
	import type { WorkflowDefinitionWithStats } from '$lib/stores/workflow';

	// Props
	let {
		definition,
		onview = undefined,
		onedit = undefined,
		onstart = undefined,
		onstatusChanged = undefined
	}: {
		definition: WorkflowDefinitionWithStats;
		onview?: ((detail: WorkflowDefinitionWithStats) => void) | undefined;
		onedit?: ((detail: WorkflowDefinitionWithStats) => void) | undefined;
		onstart?: ((detail: WorkflowDefinitionWithStats) => void) | undefined;
		onstatusChanged?: ((detail: { definition: WorkflowDefinitionWithStats; newStatus: string }) => void) | undefined;
	} = $props();

	// Derived values
	const statusColor = $derived(getStatusColor(definition.status));
	const categoryColor = $derived(getCategoryColor(definition.category));

	function getStatusColor(status: string) {
		switch (status) {
			case 'active':
				return 'bg-green-100 text-green-800';
			case 'inactive':
				return 'bg-gray-100 text-gray-800';
			case 'draft':
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
			day: 'numeric'
		});
	}

	function handleView() {
		onview?.(definition);
	}

	function handleEdit() {
		onedit?.(definition);
	}

	function handleStartInstance() {
		onstart?.(definition);
	}

	async function handleToggleStatus() {
		const newStatus = definition.status === 'active' ? 'inactive' : 'active';
		const success = await workflowActions.updateDefinition(definition.id, { status: newStatus });
		if (success) {
			onstatusChanged?.({ definition, newStatus });
		}
	}
</script>

<div
	class="workflow-card rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
>
	<!-- Header -->
	<div class="p-6 pb-4">
		<div class="mb-3 flex items-start justify-between">
			<h3 class="line-clamp-2 text-lg font-semibold text-gray-900">
				{definition.name}
			</h3>

			<!-- Status Badge -->
			<span
				class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}
			>
				{definition.status}
			</span>
		</div>

		<!-- Description -->
		{#if definition.description}
			<p class="mb-4 line-clamp-3 text-sm text-gray-600">
				{definition.description}
			</p>
		{/if}

		<!-- Category and Trigger Type -->
		<div class="mb-4 flex flex-wrap gap-2">
			{#if definition.category}
				<span
					class={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${categoryColor}`}
				>
					{definition.category}
				</span>
			{/if}

			<span
				class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
			>
				{definition.triggerType}
			</span>

			{#if definition.isTemplate}
				<span
					class="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
				>
					Template
				</span>
			{/if}
		</div>
	</div>

	<!-- Stats -->
	<div class="border-t border-gray-200 bg-gray-50 px-6 py-3">
		<dl class="grid grid-cols-3 gap-4 text-center">
			<div>
				<dt class="text-xs font-medium text-gray-500">Instances</dt>
				<dd class="text-lg font-semibold text-gray-900">
					{definition.instanceCount || 0}
				</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-gray-500">Success Rate</dt>
				<dd class="text-lg font-semibold text-gray-900">
					{definition.successRate ? `${Math.round(definition.successRate)}%` : 'N/A'}
				</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-gray-500">Version</dt>
				<dd class="text-lg font-semibold text-gray-900">
					v{definition.version}
				</dd>
			</div>
		</dl>
	</div>

	<!-- Footer -->
	<div class="border-t border-gray-200 bg-gray-50 px-6 py-4">
		<!-- Metadata -->
		<div class="mb-3 flex items-center justify-between text-xs text-gray-500">
			<span>Created {formatDate(definition.createdAt)}</span>
			{#if definition.userByCreatedBy}
				<span>by {definition.userByCreatedBy.displayName}</span>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex items-center justify-between gap-2">
			<div class="flex gap-2">
				<button onclick={handleView} class="text-sm font-medium text-blue-600 hover:text-blue-800">
					View Details
				</button>

				{#if $canManageWorkflows}
					<button
						onclick={handleEdit}
						class="text-sm font-medium text-gray-600 hover:text-gray-800"
					>
						Edit
					</button>
				{/if}
			</div>

			<div class="flex gap-2">
				{#if definition.status === 'active'}
					<button onclick={handleStartInstance} class="btn btn-primary btn-sm"> Start </button>
				{/if}

				{#if $canManageWorkflows}
					<button
						onclick={handleToggleStatus}
						class={`btn btn-sm ${definition.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
					>
						{definition.status === 'active' ? 'Deactivate' : 'Activate'}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>
