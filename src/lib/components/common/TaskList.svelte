<script lang="ts">
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { formatDateShort, isOverdue } from '$lib/utils/dataTransformers.js';
	import type { TaskItem } from '$lib/utils/dataTransformers.js';

	interface Props {
		tasks: TaskItem[];
		showCount?: number;
		showPriority?: boolean;
		showType?: boolean;
		showDueDate?: boolean;
		class?: string;
	}

	let {
		tasks,
		showCount = 0,
		showPriority = true,
		showType = true,
		showDueDate = true,
		class: className = ''
	}: Props = $props();

	let displayTasks = $derived(showCount > 0 ? tasks.slice(0, showCount) : tasks);
	let remainingCount = $derived(
		showCount > 0 && tasks.length > showCount ? tasks.length - showCount : 0
	);

	function getPriorityVariant(
		priority: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (priority) {
			case 'critical':
			case 'high':
				return 'destructive';
			case 'medium':
				return 'secondary';
			case 'low':
				return 'outline';
			default:
				return 'outline';
		}
	}

	function getTypeVariant(type: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (type.toLowerCase()) {
			case 'onboarding':
				return 'default';
			case 'compliance':
				return 'secondary';
			case 'general':
				return 'outline';
			default:
				return 'outline';
		}
	}
</script>

<div class="task-list {className}">
	{#each displayTasks as task}
		<div class="task-item" class:overdue={isOverdue(task.dueDate)}>
			<div class="task-content">
				<div class="task-header">
					<h4 class="task-title">{task.title}</h4>
					{#if showDueDate}
						<span class="task-due" class:overdue-text={isOverdue(task.dueDate)}>
							{formatDateShort(task.dueDate)}
						</span>
					{/if}
				</div>

				{#if showPriority || showType}
					<div class="task-badges">
						{#if showType}
							<Badge variant={getTypeVariant(task.type)} class="task-type">
								{task.type}
							</Badge>
						{/if}
						{#if showPriority}
							<Badge variant={getPriorityVariant(task.priority)} class="task-priority">
								{task.priority}
							</Badge>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	{/each}

	{#if remainingCount > 0}
		<div class="remaining-count">
			+{remainingCount} more tasks
		</div>
	{/if}
</div>

<style>
	.task-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.task-item {
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 8px;
		border: 1px solid #f3f4f6;
		transition: all 0.2s ease;
	}

	.task-item:hover {
		background: #f3f4f6;
		transform: translateY(-1px);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
	}

	.task-item.overdue {
		border-color: #fecaca;
		background: #fef2f2;
	}

	.task-item.overdue:hover {
		background: #fee2e2;
	}

	.task-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.task-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.task-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: #1f2937;
		margin: 0;
		line-height: 1.25;
		flex: 1;
	}

	.task-due {
		font-size: 0.75rem;
		color: #6b7280;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.task-due.overdue-text {
		color: #dc2626;
		font-weight: 500;
	}

	.task-badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.task-type,
	.task-priority {
		font-size: 0.75rem;
	}

	.remaining-count {
		text-align: center;
		font-size: 0.875rem;
		color: #6b7280;
		font-style: italic;
		padding: 0.75rem;
		background: #f9fafb;
		border-radius: 6px;
		border: 1px dashed #d1d5db;
	}

	/* Responsive Design */
	@media (max-width: 480px) {
		.task-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.25rem;
		}

		.task-badges {
			margin-top: 0.25rem;
		}
	}
</style>
