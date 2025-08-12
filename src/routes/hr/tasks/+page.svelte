<script lang="ts">
    import StatCard from '$lib/components/common/StatCard.svelte';
    import TaskList from '$lib/components/common/TaskList.svelte';
    import { CheckSquare, Clock, Users, AlertCircle } from 'lucide-svelte';
    import { transformTaskStats } from '$lib/utils/dataTransformers.js';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // Transform server data
    const tasksData = data.tasks || [];
    const taskStats = transformTaskStats({ data: tasksData, total: tasksData.length });
</script>

<svelte:head>
	<title>HR - Task Management - SvelteHR</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Task Management</h1>
		<p class="text-gray-600 dark:text-gray-400">Manage and track tasks across your organization</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		<StatCard 
			title="Total Tasks" 
			value={taskStats.totalTasks} 
			icon={CheckSquare} 
			tag="#hr" 
			loading={false} 
		/>
		<StatCard 
			title="Completed" 
			value={taskStats.completedTasks} 
			icon={CheckSquare} 
			tag="#hr" 
			loading={false} 
		/>
		<StatCard 
			title="Pending" 
			value={taskStats.pendingTasks} 
			icon={Clock} 
			tag="#hr" 
			loading={false} 
		/>
		<StatCard 
			title="In Progress" 
			value={taskStats.inProgressTasks} 
			icon={Users} 
			tag="#hr" 
			loading={false} 
		/>
	</div>

	<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
		<div class="flex items-center gap-2 mb-6">
			<CheckSquare class="w-5 h-5 text-blue-600" />
			<h2 class="text-xl font-semibold text-gray-900 dark:text-white">All Tasks</h2>
		</div>
		
		{#if taskStats.totalTasks === 0}
			<div class="text-center py-8">
				<CheckSquare class="w-12 h-12 text-gray-400 mx-auto mb-4" />
				<p class="text-gray-500">No tasks found</p>
			</div>
		{:else}
			<TaskList 
				tasks={tasksData}
				showCount={50}
				showType={true}
			/>
		{/if}
	</div>
</div>

