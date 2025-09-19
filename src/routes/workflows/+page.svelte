<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import WorkflowDefinitionList from '$lib/components/workflow/WorkflowDefinitionList.svelte';
	import WorkflowInstanceList from '$lib/components/workflow/WorkflowInstanceList.svelte';
	import WorkflowTaskList from '$lib/components/workflow/WorkflowTaskList.svelte';
	import { canManageWorkflows, user } from '$lib/stores/auth';

	let activeTab = 'definitions';

	// Check for URL tab parameter
	onMount(() => {
		const urlTab = $page.url.searchParams.get('tab');
		if (urlTab && ['definitions', 'instances', 'tasks'].includes(urlTab)) {
			activeTab = urlTab;
		}
	});

	function setActiveTab(tab: string) {
		activeTab = tab;

		// Update URL without causing navigation
		const url = new URL(window.location.href);
		url.searchParams.set('tab', tab);
		window.history.replaceState({}, '', url);
	}
</script>

<svelte:head>
	<title>Workflow Automation - SvelteHR</title>
	<meta
		name="description"
		content="Manage and monitor automated HR workflows, processes, and tasks"
	/>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Page Header -->
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">Workflow Automation</h1>
		<p class="mt-2 text-gray-600">Streamline HR processes with intelligent automation</p>
	</div>

	<!-- Navigation Tabs -->
	<div class="mb-8 border-b border-gray-200">
		<nav class="-mb-px flex space-x-8">
			<button
				on:click={() => setActiveTab('definitions')}
				class={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
					activeTab === 'definitions'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
			>
				<svg class="mr-2 inline h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
					/>
				</svg>
				Workflow Definitions
			</button>

			<button
				on:click={() => setActiveTab('instances')}
				class={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
					activeTab === 'instances'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
			>
				<svg class="mr-2 inline h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 10V3L4 14h7v7l9-11h-7z"
					/>
				</svg>
				Running Instances
			</button>

			<button
				on:click={() => setActiveTab('tasks')}
				class={`whitespace-nowrap border-b-2 px-1 py-2 text-sm font-medium transition-colors ${
					activeTab === 'tasks'
						? 'border-blue-500 text-blue-600'
						: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
				}`}
			>
				<svg class="mr-2 inline h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
					/>
				</svg>
				{$user ? 'My Tasks' : 'All Tasks'}
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	{#if activeTab === 'definitions'}
		<WorkflowDefinitionList />
	{:else if activeTab === 'instances'}
		<WorkflowInstanceList />
	{:else if activeTab === 'tasks'}
		<WorkflowTaskList assignedToId={$user?.id || null} />
	{/if}
</div>
