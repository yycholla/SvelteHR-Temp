<script lang="ts">
    import GenericStreamingPage from '$lib/components/streaming/GenericStreamingPage.svelte';
    import StreamingTasksList from '$lib/components/tasks/StreamingTasksList.svelte';
    import StatCard from '$lib/components/common/StatCard.svelte';
    import StreamingCard from '$lib/components/common/StreamingCard.svelte';
    import TaskList from '$lib/components/common/TaskList.svelte';
    import { CheckSquare, Clock, Users, AlertCircle } from 'lucide-svelte';
    import { transformTaskStats, transformTaskData, hasData } from '$lib/utils/dataTransformers.js';
    import type { PageData } from './$types';

    // Page data from server as fallback
    let { data }: { data: PageData } = $props();

    // Transform server data to fallback format
    const fallbackData = {
        'tasks-list': data.tasks || [],
        'task-stats': { completed: data.stats?.completed || 0 },
        'assignments': { pending: data.stats?.pending || 0 },
        'templates': data.templates || []
    };
</script>

<svelte:head>
	<title>HR - Task Management - SvelteHR</title>
</svelte:head>

<GenericStreamingPage 
    configKey="tasks" 
    title="Task Management"
    fallbackData={fallbackData}
>
    <div slot="streaming" let:data={streamingData}>
        {#key streamingData}
            {@const tasksArray = (Array.isArray(streamingData['tasks-list']) ? streamingData['tasks-list'] : [])}
            {@const stats = transformTaskStats(tasksArray)}
            {@const taskItems = transformTaskData(tasksArray, 5)}
            <div class="hr-tasks-content">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard title="Total Tasks" value={stats.totalTasks} icon={CheckSquare} tag="#hr" href="/hr/tasks" loading={!hasData(streamingData['tasks-list'])} />
                    <StatCard title="Completed" value={stats.completedTasks} icon={CheckSquare} tag="#hr" href="/hr/tasks" loading={!hasData(streamingData['tasks-list'])} />
                    <StatCard title="Pending" value={stats.pendingTasks} icon={Clock} tag="#hr" href="/hr/tasks" loading={!hasData(streamingData['tasks-list'])} />
                    <StatCard title="In Progress" value={stats.inProgressTasks} icon={Users} tag="#hr" href="/hr/tasks" loading={!hasData(streamingData['tasks-list'])} />
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <StreamingCard
                        title="Priority Tasks"
                        description="High priority items"
                        icon={AlertCircle}
                        tag="#hr"
                        href="/hr/tasks"
                        loading={!hasData(streamingData['tasks-list'])}
                        empty={taskItems.filter(t => t.priority === 'high' || t.priority === 'critical').length === 0}
                        emptyMessage="No high priority tasks"
                    >
                        {#snippet children()}
                            <TaskList tasks={taskItems.filter(t => t.priority === 'high' || t.priority === 'critical')} showCount={5} showType={true} />
                        {/snippet}
                    </StreamingCard>

                    <StreamingCard
                        title="All Tasks"
                        description="Full task list"
                        icon={CheckSquare}
                        tag="#hr"
                        href="/hr/tasks"
                        loading={!hasData(streamingData['tasks-list'])}
                        empty={stats.totalTasks === 0}
                        emptyMessage="No tasks"
                        class="lg:col-span-2"
                    >
                        {#snippet children()}
                            <StreamingTasksList data={streamingData} />
                        {/snippet}
                    </StreamingCard>
                </div>
            </div>
        {/key}
    </div>

    <div slot="static" let:data={fallbackData}>
        {#key fallbackData}
            {@const tasksArray = (Array.isArray(fallbackData['tasks-list']) ? fallbackData['tasks-list'] : [])}
            {@const stats = transformTaskStats(tasksArray)}
            {@const taskItems = transformTaskData(tasksArray, 5)}
            <div class="static-content">
                <div class="text-center py-8">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard title="Total Tasks" value={stats.totalTasks} icon={CheckSquare} tag="#hr" />
                        <StatCard title="Completed" value={stats.completedTasks} icon={CheckSquare} tag="#hr" />
                        <StatCard title="Pending" value={stats.pendingTasks} icon={Clock} tag="#hr" />
                        <StatCard title="In Progress" value={stats.inProgressTasks} icon={Users} tag="#hr" />
                    </div>
                    <div class="mt-6 grid grid-cols-1 gap-6">
                        <StreamingCard title="All Tasks" description="Cached task list" icon={CheckSquare} tag="#hr" loading={false} empty={stats.totalTasks === 0} emptyMessage="No tasks">
                            {#snippet children()}
                                <StreamingTasksList data={fallbackData} />
                            {/snippet}
                        </StreamingCard>
                    </div>
                </div>
            </div>
        {/key}
    </div>

    <div slot="fallback">
        <div class="fallback-content text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Loading Task Data</h3>
            <p class="text-gray-500">Please wait while we fetch your task information...</p>
        </div>
    </div>
</GenericStreamingPage>

<style>
	.hr-tasks-content {
		max-width: 1400px;
		margin: 0 auto;
	}

    /* Removed bespoke stat/task card styles in favor of modular components */

	.static-content {
		text-align: center;
		padding: 2rem;
	}

	.stat-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
		margin: 1rem 0;
	}

	.stat-item {
		background: #f9fafb;
		border-radius: 8px;
		padding: 1rem;
		border: 1px solid #e5e7eb;
	}

	.stat-label {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.5rem;
	}

	.fallback-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 300px;
	}
</style>