<!--
  Task Edit Page
  Feature: 028-task-system-expansion - Task T040

  Edit existing task with standard form components matching the design system
  - Pre-populate form with task data
  - Handle form submission
  - Validation and error handling
-->

<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { ArrowLeft, Calendar as CalendarIcon, Loader2, Save } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import * as Select from '$lib/components/ui/select';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import { cn } from '$lib/utils';
	import {
		DateFormatter,
		type DateValue,
		getLocalTimeZone,
		parseDate,
		today
	} from '@internationalized/date';

	// Page data and action result
	const { data, form }: { data: PageData; form: ActionData } = $props();

	let loading = $state(false);

	// Date handling
	const df = new DateFormatter('en-US', {
		dateStyle: 'long'
	});

	// Initialize date value from data
	let dateValue = $state<DateValue | undefined>(
		data.task.dueDate ? parseDate(data.task.dueDate.split('T')[0]) : undefined
	);

	// Convert selected date to string format for hidden input
	const dateInputValue = $derived(dateValue ? dateValue.toString() : '');

	// Handle cancel
	function handleCancel() {
		goto(`/dashboard/tasks/${data.task.id}`);
	}

	// Initial values from form or data
	const initialValues = $derived({
		title: form?.values?.title || data.task.title,
		description: form?.values?.description || data.task.description,
		status: form?.values?.status || data.task.status,
		priority: form?.values?.priority || data.task.priority,
		assigneeId: form?.values?.assigneeId || data.task.assigneeId,
		taskTypeId: form?.values?.taskTypeId || data.task.taskTypeId,
		parentTaskId: form?.values?.parentTaskId || data.task.parentTaskId,
		requiresManualReassignment:
			form?.values?.requiresManualReassignment === 'true' || data.task.requiresManualReassignment
	});

	// Select options mapping
	// Assignees
	const assigneeOptions = $derived([
		{ value: '', label: 'Unassigned' },
		...data.assignees.map((u: { id: string; displayName: string }) => ({ value: `user:${u.id}`, label: u.displayName })),
		...data.departments.map((d: { id: string; name: string }) => ({ value: `dept:${d.id}`, label: `${d.name} (Department)` }))
	]);

	// Task Types
	const taskTypeOptions = $derived(data.taskTypes.map((t: { id: string; name: string }) => ({ value: t.id, label: t.name })));

	// Parent Tasks
	const parentTaskOptions = $derived([
		{ value: '', label: 'None' },
		...data.parentTasks.map((t: { id: string; title: string }) => ({ value: t.id, label: t.title }))
	]);

	// Status options
	const statusOptions = [
		{ value: 'TO_DO', label: 'To Do' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'REVIEW', label: 'In Review' },
		{ value: 'BLOCKED', label: 'Blocked' },
		{ value: 'COMPLETED', label: 'Completed' },
		{ value: 'CANCELLED', label: 'Cancelled' },
		{ value: 'DEFERRED', label: 'Deferred' }
	];

	// Priority options
	const priorityOptions = [
		{ value: 'LOW', label: 'Low' },
		{ value: 'MEDIUM', label: 'Medium' },
		{ value: 'HIGH', label: 'High' },
		{ value: 'URGENT', label: 'Urgent' }
	];

	// Helper for Select default value
	function getSelectValue(
		options: { value: string; label: string }[],
		value: string | null | undefined
	) {
		if (!value) return undefined;
		// Handle potential prefixes for assignees if value doesn't have one but options do
		const match = options.find((o) => o.value === value || o.value === `user:${value}`);
		return match ? match.value : undefined;
	}

	const currentAssigneeVal = $derived(getSelectValue(assigneeOptions, initialValues.assigneeId));
</script>

<svelte:head>
	<title>Edit {data.task.title} - MountainHR</title>
	<meta name="description" content="Edit task details" />
</svelte:head>

<div class="min-h-screen bg-background p-4 md:p-8">
	<div class="mx-auto max-w-3xl space-y-8">
		<!-- Page Header -->
		<div class="flex items-center justify-between">
			<div class="space-y-1">
				<Button
					variant="ghost"
					size="sm"
					class="-ml-3 text-muted-foreground hover:text-foreground"
					onclick={handleCancel}
				>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to Task
				</Button>
				<h1 class="text-3xl font-bold tracking-tight">Edit Task</h1>
				<p class="text-muted-foreground">Update task details and settings</p>
			</div>
		</div>

		<!-- Error Display -->
		{#if form?.error}
			<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
				<div class="flex items-center gap-3">
					<div class="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/20">
						<span class="font-bold">!</span>
					</div>
					<div>
						<p class="font-medium">Update Failed</p>
						<p class="text-sm opacity-90">{form.error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Edit Form -->
		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="space-y-8"
		>
			<Card.Root>
				<Card.Header>
					<Card.Title>Task Information</Card.Title>
					<Card.Description>Core details about the task.</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<!-- Title -->
					<div class="space-y-2">
						<Label for="title">Title <span class="text-destructive">*</span></Label>
						<Input
							id="title"
							name="title"
							value={initialValues.title}
							required
							placeholder="Enter task title"
						/>
					</div>

					<!-- Description -->
					<div class="space-y-2">
						<Label for="description">Description</Label>
						<Textarea
							id="description"
							name="description"
							value={initialValues.description}
							placeholder="Detailed description of the task..."
							class="min-h-[120px]"
						/>
					</div>

					<div class="grid gap-6 md:grid-cols-2">
						<!-- Status -->
						<div class="space-y-2">
							<Label for="status">Status</Label>
							<Select.Root type="single" name="status" value={initialValues.status}>
								<Select.Trigger>
									{statusOptions.find((o) => o.value === initialValues.status)?.label ||
										'Select status'}
								</Select.Trigger>
								<Select.Content>
									{#each statusOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<!-- Priority -->
						<div class="space-y-2">
							<Label for="priority">Priority</Label>
							<Select.Root type="single" name="priority" value={initialValues.priority}>
								<Select.Trigger>
									{priorityOptions.find((o) => o.value === initialValues.priority)?.label ||
										'Select priority'}
								</Select.Trigger>
								<Select.Content>
									{#each priorityOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Assignment & Scheduling</Card.Title>
					<Card.Description>Who is responsible and when is it due?</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="grid gap-6 md:grid-cols-2">
						<!-- Assignee -->
						<div class="space-y-2">
							<Label for="assigneeId">Assignee</Label>
							<!-- Handle complex value matching for assignee (user: vs plain id) -->
							<Select.Root type="single" name="assigneeId" value={currentAssigneeVal}>
								<Select.Trigger>
									{assigneeOptions.find((o) => o.value === currentAssigneeVal)?.label ||
										'Unassigned'}
								</Select.Trigger>
								<Select.Content class="max-h-[300px]">
									{#each assigneeOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>

						<!-- Task Type -->
						<div class="space-y-2">
							<Label for="taskTypeId">Task Type</Label>
							<Select.Root type="single" name="taskTypeId" value={initialValues.taskTypeId}>
								<Select.Trigger>
									{taskTypeOptions.find((o: { value: string; label: string }) => o.value === initialValues.taskTypeId)?.label ||
										'Select type'}
								</Select.Trigger>
								<Select.Content>
									{#each taskTypeOptions as option}
										<Select.Item value={option.value}>{option.label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</div>
					</div>

					<!-- Due Date -->
					<div class="space-y-2">
						<Label>Due Date</Label>
						<Popover.Root>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class={cn(
											'w-full justify-start text-left font-normal',
											!dateValue && 'text-muted-foreground'
										)}
										{...props}
									>
										<CalendarIcon class="mr-2 h-4 w-4" />
										{dateValue ? df.format(dateValue.toDate(getLocalTimeZone())) : 'Pick a date'}
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0">
								<Calendar type="single" bind:value={dateValue} />
							</Popover.Content>
						</Popover.Root>
						<input type="hidden" name="dueDate" value={dateInputValue} />
					</div>

					<!-- Manual Reassignment -->
					<div class="flex items-center space-x-2">
						<Checkbox
							id="requiresManualReassignment"
							name="requiresManualReassignment"
							value="true"
							checked={initialValues.requiresManualReassignment}
						/>
						<Label
							for="requiresManualReassignment"
							class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Requires manual reassignment approval
						</Label>
					</div>
				</Card.Content>
			</Card.Root>

			<div class="flex justify-end gap-4">
				<Button type="button" variant="outline" onclick={handleCancel} disabled={loading}>
					Cancel
				</Button>
				<Button type="submit" disabled={loading}>
					{#if loading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Saving...
					{:else}
						<Save class="mr-2 h-4 w-4" />
						Save Changes
					{/if}
				</Button>
			</div>
		</form>
	</div>
</div>
