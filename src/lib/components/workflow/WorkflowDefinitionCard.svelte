<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { canManageWorkflows } from '$lib/stores/auth';
	import { workflowActions } from '$lib/stores/workflow';
	import type { WorkflowDefinitionWithStats } from '$lib/stores/workflow';

	export let definition: WorkflowDefinitionWithStats;

	const dispatch = createEventDispatcher();

	$: statusColor = getStatusColor(definition.status);
	$: categoryColor = getCategoryColor(definition.category);

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
		dispatch('view', definition);
	}

	function handleEdit() {
		dispatch('edit', definition);
	}

	function handleStartInstance() {
		dispatch('start', definition);
	}

	async function handleToggleStatus() {
		const newStatus = definition.status === 'active' ? 'inactive' : 'active';
		const success = await workflowActions.updateDefinition(definition.id, { status: newStatus });
		if (success) {
			dispatch('statusChanged', { definition, newStatus });
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
				<button on:click={handleView} class="text-sm font-medium text-blue-600 hover:text-blue-800">
					View Details
				</button>

				{#if $canManageWorkflows}
					<button
						on:click={handleEdit}
						class="text-sm font-medium text-gray-600 hover:text-gray-800"
					>
						Edit
					</button>
				{/if}
			</div>

			<div class="flex gap-2">
				{#if definition.status === 'active'}
					<button on:click={handleStartInstance} class="btn btn-primary btn-sm"> Start </button>
				{/if}

				{#if $canManageWorkflows}
					<button
						on:click={handleToggleStatus}
						class={`btn btn-sm ${definition.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
					>
						{definition.status === 'active' ? 'Deactivate' : 'Activate'}
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.workflow-card {
		@apply transition-all duration-200;
	}

	.workflow-card:hover {
		@apply shadow-lg;
	}

	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.line-clamp-3 {
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.btn {
		@apply inline-flex items-center rounded border border-transparent px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2;
	}

	.btn-sm {
		@apply px-2 py-1 text-xs;
	}

	.btn-primary {
		@apply bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500;
	}

	.btn-secondary {
		@apply border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500;
	}
</style>
