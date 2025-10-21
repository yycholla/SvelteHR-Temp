<!--
  Task Edit Page
  Feature: 028-task-system-expansion - Task T040

  Edit existing task with TaskForm component
  - Pre-populate form with task data
  - Handle form submission
  - Validation and error handling
-->

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import TaskForm from '$lib/components/tasks/TaskForm.svelte';
	import { ArrowLeft, Save } from 'lucide-svelte';

	// Page data and action result
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Handle cancel
	function handleCancel() {
		goto(`/dashboard/tasks/${data.task.id}`);
	}

	// Handle form submit
	async function handleSubmit(formData: any) {
		// TaskForm will handle the actual submission via native form action
		// This is called after validation passes
		console.log('[Task Edit] Form validated, submitting:', formData);
		return true;
	}
</script>

<svelte:head>
	<title>Edit {data.task.title} - SvelteHR</title>
	<meta name="description" content="Edit task details" />
</svelte:head>

<div class="task-edit-page">
	<!-- Page Header -->
	<div class="page-header">
		<Button variant="ghost" size="sm" onclick={handleCancel}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to Task
		</Button>
	</div>

	<!-- Page Title -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">Edit Task</h1>
		<p class="text-muted-foreground mt-2">Update task details and settings</p>
	</div>

	<!-- Error Display -->
	{#if form?.error}
		<Card.Root class="mb-6 border-destructive">
			<Card.Content class="pt-6">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
						<span class="text-destructive">!</span>
					</div>
					<div>
						<p class="font-medium text-destructive">Update Failed</p>
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
				Modify task details, assignment, status, and related information
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<TaskForm
				task={data.task}
				assignees={data.assignees}
			departments={data.departments}
				taskTypes={data.taskTypes}
				parentTasks={data.parentTasks}
				mode="edit"
				onSubmit={handleSubmit}
				onCancel={handleCancel}
				submitLabel="Update Task"
				initialValues={form?.values}
			/>
		</Card.Content>
	</Card.Root>
</div>

<style>
	/* Page Layout */
	.task-edit-page {
		@apply container mx-auto px-4 py-8;
	}

	/* Page Header */
	.page-header {
		@apply mb-6;
	}
</style>
