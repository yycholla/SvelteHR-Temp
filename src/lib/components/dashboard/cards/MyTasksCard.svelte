<script lang="ts">
	import { CheckSquare, Clock, AlertTriangle, User } from 'lucide-svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import type { CardProps } from '../types.js';

	let { instance, metadata, data }: CardProps = $props();

	// Mock tasks data - in real app this would come from props.data
	const mockTasks = [
		{
			id: 1,
			title: 'Review Q1 Performance Reports',
			status: 'in_progress',
			priority: 'high',
			dueDate: '2025-08-10',
			assignedBy: 'Sarah Wilson'
		},
		{
			id: 2,
			title: 'Complete Security Training',
			status: 'pending',
			priority: 'medium',
			dueDate: '2025-08-15',
			assignedBy: 'HR Department'
		},
		{
			id: 3,
			title: 'Update Employee Handbook',
			status: 'in_progress',
			priority: 'low',
			dueDate: '2025-08-20',
			assignedBy: 'Mike Johnson'
		},
		{
			id: 4,
			title: 'Prepare Budget Presentation',
			status: 'completed',
			priority: 'high',
			dueDate: '2025-08-05',
			assignedBy: 'Finance Team'
		}
	];

	// Filter tasks by status
	const activeTasks = $derived(() => mockTasks.filter((task) => task.status !== 'completed'));
	const completedTasks = $derived(() => mockTasks.filter((task) => task.status === 'completed'));

	// Get status badge
	function getStatusBadge(status: string) {
		switch (status) {
			case 'completed':
				return { variant: 'success', label: 'Completed', icon: CheckSquare };
			case 'in_progress':
				return { variant: 'info', label: 'In Progress', icon: Clock };
			case 'pending':
				return { variant: 'warning', label: 'Pending', icon: AlertTriangle };
			default:
				return { variant: 'default', label: status, icon: Clock };
		}
	}

	// Get priority color
	function getPriorityColor(priority: string): string {
		switch (priority) {
			case 'high':
				return 'text-red-600';
			case 'medium':
				return 'text-yellow-600';
			case 'low':
				return 'text-green-600';
			default:
				return 'text-muted-foreground';
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Check if task is overdue
	function isOverdue(dateString: string): boolean {
		return new Date(dateString) < new Date();
	}
</script>

<div class="flex h-full flex-col space-y-4">
	<!-- Summary -->
	<div class="text-center">
		<div class="text-3xl font-bold text-primary">{activeTasks.length}</div>
		<div class="text-sm text-muted-foreground">Active Tasks</div>
	</div>

	<!-- Task List -->
	<div class="min-h-0 flex-1 space-y-2 overflow-hidden">
		{#if activeTasks.length === 0}
			<div class="py-4 text-center text-muted-foreground">
				<CheckSquare class="mx-auto mb-2 h-8 w-8 opacity-50" />
				<p class="text-sm">All tasks completed! 🎉</p>
			</div>
		{:else}
			{#each activeTasks.slice(0, 2) as task}
				<div class="rounded-lg border border-border p-3 transition-colors hover:bg-muted/30">
					<div class="flex items-center justify-between">
						<div class="min-w-0 flex-1">
							<h4 class="truncate text-sm leading-tight font-medium">{task.title}</h4>
							<div class="mt-1 text-xs text-muted-foreground">
								Due {formatDate(task.dueDate)}
							</div>
						</div>
						<div class="ml-3 flex-shrink-0">
							<div
								class="h-2 w-2 rounded-full {task.priority === 'high'
									? 'bg-red-500'
									: task.priority === 'medium'
										? 'bg-yellow-500'
										: 'bg-green-500'}"
							></div>
						</div>
					</div>
				</div>
			{/each}

			{#if activeTasks.length > 2}
				<div class="py-2 text-center text-xs text-muted-foreground">
					+{activeTasks.length - 2} more tasks
				</div>
			{/if}
		{/if}
	</div>

	<!-- Actions -->
	{#if activeTasks.length > 0}
		<div class="border-t border-border pt-2">
			<Button variant="outline" size="sm" class="w-full">
				<CheckSquare class="mr-2 h-4 w-4" />
				View All Tasks
			</Button>
		</div>
	{/if}
</div>
