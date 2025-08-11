<script lang="ts">
	import { onMount } from 'svelte';
	import { Clock, CheckSquare, AlertTriangle, Loader, User } from 'lucide-svelte';
	import { apiClient } from '$lib/api/client.js';
	import type { CardProps } from '../types.js';
	
let { instance, metadata, data }: CardProps = $props();
	
	// State
	let loading = $state(true);
	let error = $state<string | null>(null);
	let tasks = $state<any[]>([]);
	let taskStats = $state({
		total: 0,
		completed: 0,
		inProgress: 0,
		pending: 0,
		blocked: 0
	});
	
	// Fetch live tasks
	async function fetchTasks() {
		try {
			loading = true;
			error = null;
			
			// Fetch tasks from the API
			const response = await apiClient.get('tasks');
			const taskData = Array.isArray(response) ? response : (response.data || []);
			
			// Calculate stats
			const stats = {
				total: taskData.length,
				completed: taskData.filter((t: any) => t.status === 'Completed').length,
				inProgress: taskData.filter((t: any) => t.status === 'InProgress').length,
				pending: taskData.filter((t: any) => t.status === 'Pending').length,
				blocked: taskData.filter((t: any) => t.status === 'Blocked').length
			};
			
			// Get recent tasks (limit for compact display)
			const recentTasks = taskData
				.sort((a: any, b: any) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
				.slice(0, 4);
			
			tasks = recentTasks;
			taskStats = stats;
			
		} catch (err: any) {
			console.error('Failed to fetch tasks:', err);
			error = 'Failed to load tasks';
		} finally {
			loading = false;
		}
	}
	
	// Get status badge info
	function getStatusInfo(status: string) {
		switch (status) {
			case 'Completed': return { icon: CheckSquare, color: 'text-green-600', bg: 'bg-green-100' };
			case 'InProgress': return { icon: Loader, color: 'text-blue-600', bg: 'bg-blue-100' };
			case 'Blocked': return { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' };
			default: return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
		}
	}
	
	// Format due date
	function formatDueDate(dateString: string | null): string {
		if (!dateString) return 'No due date';
		const date = new Date(dateString);
		const now = new Date();
		const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		
		if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
		if (diffDays === 0) return 'Due today';
		if (diffDays === 1) return 'Due tomorrow';
		return `Due in ${diffDays} days`;
	}
	
onMount(() => {
    if (!data) fetchTasks();
});

$: if (data) {
    const taskData = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    if (taskData.length) {
        const stats = {
            total: taskData.length,
            completed: taskData.filter((t: any) => t.status === 'Completed').length,
            inProgress: taskData.filter((t: any) => t.status === 'InProgress').length,
            pending: taskData.filter((t: any) => t.status === 'Pending').length,
            blocked: taskData.filter((t: any) => t.status === 'Blocked').length
        };
        const recentTasks = taskData
            .sort((a: any, b: any) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
            .slice(0, 4);
        tasks = recentTasks;
        taskStats = stats;
        loading = false;
        error = null;
    }
}
</script>

<div class="h-full overflow-hidden">
	{#if loading}
		<div class="flex items-center justify-center h-full">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div class="flex items-center justify-center h-full text-center">
			<div class="space-y-2">
				<AlertTriangle class="h-8 w-8 text-destructive mx-auto" />
				<p class="text-sm text-destructive">{error}</p>
			</div>
		</div>
	{:else}
		<div class="space-y-3 h-full">
			<!-- Stats Overview -->
			<div class="flex justify-between items-center">
				<div class="text-center">
					<div class="text-lg font-bold text-primary">{taskStats.total}</div>
					<div class="text-xs text-muted-foreground">Total</div>
				</div>
				<div class="text-center">
					<div class="text-lg font-bold text-blue-600">{taskStats.inProgress}</div>
					<div class="text-xs text-muted-foreground">Active</div>
				</div>
				<div class="text-center">
					<div class="text-lg font-bold text-green-600">{taskStats.completed}</div>
					<div class="text-xs text-muted-foreground">Done</div>
				</div>
				<div class="text-center">
					<div class="text-lg font-bold text-yellow-600">{taskStats.pending}</div>
					<div class="text-xs text-muted-foreground">Pending</div>
				</div>
			</div>
			
			<!-- Recent Tasks -->
			<div class="flex-1 min-h-0 overflow-hidden">
				{#if tasks.length === 0}
					<div class="flex items-center justify-center h-full text-center">
						<div class="space-y-2">
							<CheckSquare class="h-6 w-6 text-muted-foreground mx-auto" />
							<p class="text-sm text-muted-foreground">No tasks found</p>
						</div>
					</div>
				{:else}
					<div class="space-y-2 max-h-full overflow-hidden">
						{#each tasks as task}
							{@const statusInfo = getStatusInfo(task.status)}
							<div class="flex items-center space-x-2 p-2 rounded border border-border/50 hover:bg-muted/30">
								<div class="w-6 h-6 {statusInfo.bg} rounded-full flex items-center justify-center flex-shrink-0">
									<svelte:component this={statusInfo.icon} class="h-3 w-3 {statusInfo.color}" />
								</div>
								<div class="flex-1 min-w-0">
									<div class="text-sm font-medium truncate">{task.title}</div>
									<div class="text-xs text-muted-foreground">{formatDueDate(task.dueDate)}</div>
								</div>
							</div>
						{/each}
						
						{#if taskStats.total > 4}
							<div class="text-center text-xs text-muted-foreground py-1">
								+{taskStats.total - 4} more tasks
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>