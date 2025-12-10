<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '../base/Button.svelte';
	import Card from '../base/Card.svelte';
	import Badge from '../base/Badge.svelte';
	import Input from '../base/Input.svelte';
	import Textarea from '../base/Textarea.svelte';
	import type { OnboardingTask } from '$lib/services/onboardingService';

	export let tasks: OnboardingTask[] = [];
	export let readonly: boolean = false;
	export let showCategories: boolean = true;
	export let allowNotes: boolean = true;

	const dispatch = createEventDispatcher<{
		taskComplete: { taskId: string; notes?: string };
		taskStart: { taskId: string };
		taskUpdate: { taskId: string; updates: Partial<OnboardingTask> };
	}>();

	// Group tasks by category
	$: tasksByCategory = tasks.reduce(
		(acc, task) => {
			const category = task.category || 'Other';
			if (!acc[category]) acc[category] = [];
			acc[category].push(task);
			return acc;
		},
		{} as Record<string, OnboardingTask[]>
	);

	$: categoryOrder = ['HR', 'IT', 'Security', 'Training', 'Equipment', 'Documentation', 'Other'];

	let selectedTask: OnboardingTask | null = null;
	let taskNotes = '';

	function getStatusColor(status: string): string {
		switch (status) {
			case 'Completed':
				return 'text-green-600';
			case 'InProgress':
				return 'text-blue-600';
			case 'Blocked':
				return 'text-red-600';
			default:
				return 'text-gray-500';
		}
	}

	function getStatusIcon(status: string): string {
		switch (status) {
			case 'Completed':
				return 'check-circle';
			case 'InProgress':
				return 'clock';
			case 'Blocked':
				return 'x-circle';
			default:
				return 'circle';
		}
	}

	function getTaskTypeIcon(type: string): string {
		switch (type.toLowerCase()) {
			case 'document':
				return 'file-text';
			case 'meeting':
				return 'calendar';
			case 'training':
				return 'book';
			case 'system':
				return 'settings';
			case 'review':
				return 'eye';
			default:
				return 'check-square';
		}
	}

	function getPriorityLevel(task: OnboardingTask): 'high' | 'medium' | 'low' {
		if (task.is_required && task.due_date) {
			const dueDate = new Date(task.due_date);
			const today = new Date();
			const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

			if (daysUntilDue <= 1) return 'high';
			if (daysUntilDue <= 3) return 'medium';
		}
		return 'low';
	}

	function formatDueDate(dateString?: string): string {
		if (!dateString) return '';
		const date = new Date(dateString);
		const today = new Date();
		const daysUntilDue = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

		if (daysUntilDue < 0)
			return `Overdue by ${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'}`;
		if (daysUntilDue === 0) return 'Due today';
		if (daysUntilDue === 1) return 'Due tomorrow';
		return `Due in ${daysUntilDue} days`;
	}

	function handleTaskAction(task: OnboardingTask, action: 'start' | 'complete') {
		if (readonly) return;

		selectedTask = task;
		taskNotes = task.notes || '';

		if (action === 'start') {
			dispatch('taskStart', { taskId: task.id });
			selectedTask = null;
		} else if (action === 'complete') {
			// Show completion dialog if notes are allowed
			if (allowNotes) {
				// Modal will be handled by the parent component
				return;
			} else {
				dispatch('taskComplete', { taskId: task.id });
			}
		}
	}

	function handleCompleteWithNotes() {
		if (selectedTask) {
			dispatch('taskComplete', {
				taskId: selectedTask.id,
				notes: taskNotes.trim() || undefined
			});
			selectedTask = null;
			taskNotes = '';
		}
	}

	function cancelCompletion() {
		selectedTask = null;
		taskNotes = '';
	}
</script>

<div class="onboarding-checklist">
	{#if showCategories}
		<!-- Categorized View -->
		{#each categoryOrder as category}
			{#if tasksByCategory[category]?.length > 0}
				<Card padding="md" class="category-section">
					<div class="category-header">
						<h3 class="category-title">{category}</h3>
						<div class="category-stats">
							{tasksByCategory[category].filter((t) => t.status === 'Completed').length} / {tasksByCategory[
								category
							].length} completed
						</div>
					</div>

					<div class="task-list">
						{#each tasksByCategory[category] as task (task.id)}
							<div class="task-item" class:completed={task.status === 'Completed'}>
								<div class="task-main">
									<div class="task-status">
										<i
											class="icon-{getStatusIcon(task.status)} h-5 w-5 {getStatusColor(
												task.status
											)}"
										></i>
									</div>

									<div class="task-content">
										<div class="task-header">
											<div class="task-title-row">
												<span class="task-title">{task.title}</span>
												<div class="task-badges">
													{#if task.is_required}
														<Badge variant="destructive" size="xs">Required</Badge>
													{/if}
													{#if getPriorityLevel(task) === 'high'}
														<Badge variant="destructive" size="xs">Urgent</Badge>
													{/if}
												</div>
											</div>

											<div class="task-meta">
												<span class="task-type">
													<i class="icon-{getTaskTypeIcon(task.task_type)} h-4 w-4"></i>
													{task.task_type}
												</span>

												{#if task.due_date}
													<span class="task-due" class:overdue={getPriorityLevel(task) === 'high'}>
														<i class="icon-calendar h-4 w-4"></i>
														{formatDueDate(task.due_date)}
													</span>
												{/if}

												{#if task.estimated_hours}
													<span class="task-duration">
														<i class="icon-clock h-4 w-4"></i>
														{task.estimated_hours}h
													</span>
												{/if}
											</div>
										</div>

										{#if task.description}
											<p class="task-description">{task.description}</p>
										{/if}

										{#if task.assigned_to}
											<div class="task-assignee">
												<span class="assignee-label">Assigned to:</span>
												<span class="assignee-name"
													>{task.assigned_to.display_name || task.assigned_to.displayName}</span
												>
											</div>
										{/if}
									</div>

									{#if !readonly && task.status !== 'Completed'}
										<div class="task-actions">
											{#if task.status === 'Pending'}
												<Button
													variant="secondary"
													size="sm"
													leftIcon="play"
													onclick={() => handleTaskAction(task, 'start')}
												>
													Start
												</Button>
											{:else if task.status === 'InProgress'}
												<Button
	variant="default"
													size="sm"
													leftIcon="check"
													onclick={() => handleTaskAction(task, 'complete')}
												>
													Complete
												</Button>
											{/if}
										</div>
									{/if}
								</div>

								{#if task.instructions}
									<div class="task-instructions">
										<details>
											<summary class="instructions-toggle">
												<i class="icon-info h-4 w-4"></i>
												Instructions
											</summary>
											<div class="instructions-content">
												{task.instructions}
											</div>
										</details>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</Card>
			{/if}
		{/each}
	{:else}
		<!-- Flat List View -->
		<Card padding="md" class="task-list-flat">
			{#each tasks as task (task.id)}
				<div class="task-item" class:completed={task.status === 'Completed'}>
					<!-- Similar structure as above but without categories -->
				</div>
			{/each}
		</Card>
	{/if}
</div>

<!-- Completion Modal -->
{#if selectedTask && allowNotes}
	<div class="modal-overlay">
		<div class="modal-content">
			<div class="modal-header">
				<h3 class="modal-title">Complete Task</h3>
				<button class="modal-close" onclick={cancelCompletion} aria-label="Close modal">
					<i class="icon-x h-5 w-5"></i>
				</button>
			</div>

			<div class="modal-body">
				<div class="task-info">
					<h4 class="task-name">{selectedTask.title}</h4>
					{#if selectedTask.description}
						<p class="task-desc">{selectedTask.description}</p>
					{/if}
				</div>

				<div class="notes-section">
					<Textarea
						label="Completion Notes (Optional)"
						bind:value={taskNotes}
						placeholder="Add any notes about completing this task..."
						rows={4}
					/>
				</div>
			</div>

			<div class="modal-footer">
				<Button variant="secondary" onclick={cancelCompletion}>Cancel</Button>
				<Button variant="default" leftIcon="check" onclick={handleCompleteWithNotes}>
					Mark Complete
				</Button>
			</div>
		</div>
	</div>
{/if}
