<!--
  New Task Creation Page
  Feature: 028-task-system-expansion - Task T042

  Create new task with TaskForm component
  - Empty form or pre-populated with parent task info
  - Handle form submission
  - Validation and error handling
-->

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import TaskForm from '$lib/components/tasks/TaskForm.svelte';
	import { ArrowLeft, Plus } from 'lucide-svelte';

	// Page data and action result
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Debug logging
	$effect(() => {
		console.log('[Task Create Page] Data received:', {
			assignees: data.assignees?.length || 0,
			departments: data.departments?.length || 0,
			taskTypes: data.taskTypes?.length || 0,
			parentTasks: data.parentTasks?.length || 0,
			parentTask: data.parentTask,
			parentTaskId: data.parentTaskId
		});
		console.log('[Task Create Page] Full assignees data:', data.assignees);
		console.log('[Task Create Page] Full departments data:', data.departments);
	});

	// Handle cancel
	function handleCancel() {
		if (data.parentTaskId) {
			// If creating a subtask, go back to parent task
			goto(`/dashboard/tasks/${data.parentTaskId}`);
		} else {
			// Otherwise go to tasks dashboard
			goto('/dashboard/tasks');
		}
	}

	// Handle form submit
	async function handleSubmit(formData: any) {
		// TaskForm will handle the actual submission via native form action
		// This is called after validation passes
		console.log('[Task Create] Form validated, submitting:', formData);
		return true;
	}

	// Prepare initial values if creating a subtask
	let initialValues = $derived(() => {
		if (data.parentTask && data.parentTaskId) {
			return {
				parentTaskId: data.parentTaskId,
				assigneeId: data.parentTask.assigneeId,
				taskTypeId: data.parentTask.taskTypeId,
				priority: data.parentTask.priority,
				status: 'Not Started'
			};
		}
		return form?.values || {};
	});
</script>

<svelte:head>
	<title>Create New Task - SvelteHR</title>
	<meta name="description" content="Create a new task" />
</svelte:head>

<div class="task-create-page">
	<!-- Page Header -->
	<div class="page-header">
		<Button variant="ghost" size="sm" onclick={handleCancel}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			{data.parentTaskId ? 'Back to Parent Task' : 'Back to Tasks'}
		</Button>
	</div>

	<!-- Page Title -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Create New Task</h1>
		<p class="text-muted-foreground mt-2">
			{data.parentTask
				? `Create a subtask under "${data.parentTask.title}"`
				: 'Create a new task for your organization'}
		</p>
	</div>

	<!-- Parent Task Info -->
	{#if data.parentTask}
		<Card.Root class="mb-6 border-primary/20 bg-primary/5">
			<Card.Content class="pt-6">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
						<Plus class="h-4 w-4 text-primary" />
					</div>
					<div>
						<p class="text-sm font-medium">Creating Subtask</p>
						<p class="text-sm text-muted-foreground">
							Parent: {data.parentTask.title}
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Error Display -->
	{#if form?.error}
		<Card.Root class="mb-6 border-destructive">
			<Card.Content class="pt-6">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
						<span class="text-destructive">!</span>
					</div>
					<div>
						<p class="font-medium text-destructive">Creation Failed</p>
						<p class="text-sm text-destructive/80">{form.error}</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Task Form -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Task Information</Card.Title>
			<Card.Description>
				Enter task details, assignment, due date, and other information
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TaskForm
				assignees={data.assignees}
			departments={data.departments}
				taskTypes={data.taskTypes}
				parentTasks={data.parentTasks}
				mode="create"
				onSubmit={handleSubmit}
				onCancel={handleCancel}
				submitLabel="Create Task"
				initialValues={initialValues()}
			/>
		</Card.Content>
	</Card.Root>
</div>

<style>
	/* Page Layout */
	.task-create-page {
		@apply container mx-auto px-4 py-8;
	}

	/* Page Header */
	.page-header {
		@apply mb-6;
	}
</style>
