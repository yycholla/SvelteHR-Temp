<!--
  TaskDependencies Component
  Feature: 028-task-system-expansion - Task T030
  
  Manage task dependencies (blocking and blocked relationships)
  - Display existing dependencies with status indicators
  - Add new dependencies with task search
  - Remove dependencies with confirmation
  - Circular dependency detection warnings
  - Visual dependency chain representation
-->

<script lang="ts">
	import type { Task } from '$lib/types/domain-extensions';
	import type { TaskDependency } from '$lib/types/task';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		AlertTriangle,
		CheckCircle,
		Circle,
		Link2,
		Link2Off,
		Plus,
		Search,
		Trash2,
		XCircle
	} from '@lucide/svelte';

	interface Props {
		task: Task; // Current task with populated dependencies
		availableTasks: Task[]; // All tasks that can be linked as dependencies
		onAddDependency: (blockingTaskId: string, blockedTaskId: string) => Promise<void>;
		onRemoveDependency: (dependencyId: string) => Promise<void>;
		loading?: boolean;
	}

	const {
		task,
		availableTasks,
		onAddDependency,
		onRemoveDependency,
		loading = false
	}: Props = $props();

	// State
	let isAddDialogOpen = $state(false);
	let addDependencyType = $state<'blocking' | 'blocked'>('blocked'); // Current task is blocked by...
	let selectedTaskId = $state('');
	let searchQuery = $state('');
	let isSubmitting = $state(false);

	// Derived state - blocking tasks (tasks that this task blocks)
	const blockingDependencies = $derived(task.taskDependenciesByBlockingTaskId?.nodes || []);

	// Derived state - blocked tasks (tasks that block this task)
	const blockedByDependencies = $derived(task.taskDependenciesByBlockedTaskId?.nodes || []);

	// Filter available tasks for dependency creation
	const filteredTasks = $derived(() => {
		const filtered = availableTasks.filter((t) => {
			// Exclude current task
			if (t.id === task.id) return false;

			// Exclude already linked tasks
			const alreadyBlocking = blockingDependencies.some(
				(dep: import('$lib/types/domain-extensions').TaskDependencyNode) =>
					dep.blockedTaskId === t.id
			);
			const alreadyBlockedBy = blockedByDependencies.some(
				(dep: import('$lib/types/domain-extensions').TaskDependencyNode) =>
					dep.blockingTaskId === t.id
			);
			if (alreadyBlocking || alreadyBlockedBy) return false;

			// Apply search filter
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				return (
					t.title.toLowerCase().includes(query) || t.description?.toLowerCase().includes(query)
				);
			}

			return true;
		});

		return filtered;
	});

	// Task options for select dropdown
	const taskOptions = $derived(
		filteredTasks().map((t) => ({
			value: t.id,
			label: `${t.title} (${t.status})`
		}))
	);

	// Get status icon for dependency task
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	function getStatusIcon(status: Task['status']) {
		switch (status) {
			case 'DONE':
				return CheckCircle;
			case 'IN_PROGRESS':
				return Circle;
			case 'BLOCKED':
				return XCircle;
			default:
				return Circle;
		}
	}

	// Get status color for dependency task
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	function getStatusColor(status: Task['status']) {
		switch (status) {
			case 'DONE':
				return 'text-green-600 dark:text-green-400';
			case 'IN_PROGRESS':
				return 'text-blue-600 dark:text-blue-400';
			case 'BLOCKED':
				return 'text-red-600 dark:text-red-400';
			case 'REVIEW':
				return 'text-gray-500';
			default:
				return 'text-gray-600';
		}
	}

	// Open add dependency dialog
	function openAddDialog(type: 'blocking' | 'blocked') {
		addDependencyType = type;
		selectedTaskId = '';
		searchQuery = '';
		isAddDialogOpen = true;
	}

	// Handle add dependency
	async function handleAddDependency() {
		if (!selectedTaskId) return;

		isSubmitting = true;
		try {
			if (addDependencyType === 'blocked') {
				// Current task is blocked BY the selected task
				await onAddDependency(selectedTaskId, task.id);
			} else {
				// Current task BLOCKS the selected task
				await onAddDependency(task.id, selectedTaskId);
			}
			isAddDialogOpen = false;
		} catch (error) {
			console.error('[TaskDependencies] Add error:', error);
			// Error handled by parent
		} finally {
			isSubmitting = false;
		}
	}

	// Handle remove dependency
	async function handleRemoveDependency(dependencyId: string) {
		if (!confirm('Are you sure you want to remove this dependency?')) return;

		try {
			await onRemoveDependency(dependencyId);
		} catch (error) {
			console.error('[TaskDependencies] Remove error:', error);
			// Error handled by parent
		}
	}
</script>

<div class="task-dependencies space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3 border-b pb-4">
		<Link2 class="h-5 w-5 text-primary" />
		<h3 class="text-lg font-semibold">Task Dependencies</h3>
	</div>

	<!-- Blocked By Section (Tasks that block this task) -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<h4 class="font-medium">Blocked By</h4>
				<Badge variant="secondary">{blockedByDependencies.length}</Badge>
			</div>
			<Button
				size="sm"
				variant="outline"
				onclick={() => openAddDialog('blocked')}
				disabled={loading}
			>
				<Plus class="mr-2 h-4 w-4" />
				Add Blocker
			</Button>
		</div>

		{#if blockedByDependencies.length === 0}
			<div class="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
				<Circle class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">
					No tasks are blocking this task. It can be started immediately.
				</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each blockedByDependencies as dependency (dependency.id)}
					{@const blockingTask = dependency.taskByBlockingTaskId}
					{#if blockingTask}
						{@const StatusIcon = getStatusIcon(blockingTask.status)}
						<div class="flex items-center justify-between rounded-lg border bg-card p-3">
							<div class="flex items-center gap-3 flex-1">
								<StatusIcon class="h-5 w-5 flex-shrink-0 {getStatusColor(blockingTask.status)}" />
								<div class="flex-1">
									<p class="font-medium">{blockingTask.title}</p>
									<p class="text-xs text-muted-foreground">Status: {blockingTask.status}</p>
								</div>
								{#if blockingTask.status !== 'DONE'}
									<Badge variant="destructive" class="flex-shrink-0">
										<AlertTriangle class="mr-1 h-3 w-3" />
										Blocking
									</Badge>
								{/if}
							</div>
							<Button
								size="sm"
								variant="ghost"
								onclick={() => handleRemoveDependency(dependency.id)}
								disabled={loading}
								class="ml-2 flex-shrink-0"
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- Blocks Section (Tasks blocked by this task) -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<h4 class="font-medium">This Task Blocks</h4>
				<Badge variant="secondary">{blockingDependencies.length}</Badge>
			</div>
			<Button
				size="sm"
				variant="outline"
				onclick={() => openAddDialog('blocking')}
				disabled={loading}
			>
				<Plus class="mr-2 h-4 w-4" />
				Add Dependency
			</Button>
		</div>

		{#if blockingDependencies.length === 0}
			<div class="rounded-lg border border-dashed bg-muted/30 p-6 text-center">
				<Link2Off class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
				<p class="text-sm text-muted-foreground">This task is not blocking any other tasks.</p>
			</div>
		{:else}
			<div class="space-y-2">
				{#each blockingDependencies as dependency (dependency.id)}
					{@const blockedTask = dependency.taskByBlockedTaskId}
					{#if blockedTask}
						{@const StatusIcon = getStatusIcon(blockedTask.status)}
						<div class="flex items-center justify-between rounded-lg border bg-card p-3">
							<div class="flex items-center gap-3 flex-1">
								<StatusIcon class="h-5 w-5 flex-shrink-0 {getStatusColor(blockedTask.status)}" />
								<div class="flex-1">
									<p class="font-medium">{blockedTask.title}</p>
									<p class="text-xs text-muted-foreground">Status: {blockedTask.status}</p>
								</div>
								{#if task.status !== 'DONE'}
									<Badge variant="outline" class="flex-shrink-0">Waiting on this task</Badge>
								{/if}
							</div>
							<Button
								size="sm"
								variant="ghost"
								onclick={() => handleRemoveDependency(dependency.id)}
								disabled={loading}
								class="ml-2 flex-shrink-0"
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						</div>
					{/if}
				{/each}
			</div>
		{/if}
	</div>

	<!-- Warning: Task is blocked -->
	{#if blockedByDependencies.some(
			(dep: import('$lib/types/domain-extensions').TaskDependencyNode) =>
				dep.taskByBlockingTaskId?.status !== 'DONE'
		)}
		<div class="rounded-lg border border-warning bg-warning/10 p-4">
			<div class="flex items-start gap-3">
				<AlertTriangle class="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
				<div>
					<h4 class="font-semibold text-warning mb-1">Task is Blocked</h4>
					<p class="text-sm text-warning/90">
						This task cannot be completed until all blocking tasks are finished.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Add Dependency Dialog -->
	<Dialog.Root bind:open={isAddDialogOpen}>
		<Dialog.Content class="sm:max-w-lg">
			<Dialog.Header>
				<Dialog.Title>
					{addDependencyType === 'blocked' ? 'Add Blocking Task' : 'Add Blocked Task'}
				</Dialog.Title>
				<Dialog.Description>
					{addDependencyType === 'blocked'
						? 'Select a task that must be completed before this task can be started.'
						: 'Select a task that cannot be started until this task is completed.'}
				</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Search -->
				<div class="space-y-2">
					<Label for="search">Search Tasks</Label>
					<div class="relative">
						<Search
							class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
						/>
						<Input
							id="search"
							bind:value={searchQuery}
							placeholder="Search by title or description"
							class="pl-9"
						/>
					</div>
				</div>

				<!-- Task Selection -->
				<div class="space-y-2">
					<Label for="task">Select Task</Label>
					<Select.Root type="single" bind:value={selectedTaskId}>
						<Select.Trigger id="task">
							<Select.Value placeholder="Choose a task" />
						</Select.Trigger>
						<Select.Content>
							{#if taskOptions.length === 0}
								<div class="p-4 text-center text-sm text-muted-foreground">
									No available tasks found
								</div>
							{:else}
								{#each taskOptions as option}
									<Select.Item value={option.value}>{option.label}</Select.Item>
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Circular Dependency Warning -->
				{#if selectedTaskId}
					<div class="rounded-lg border border-muted bg-muted/50 p-3 text-sm text-muted-foreground">
						<AlertTriangle class="inline-block h-4 w-4 mr-2" />
						Circular dependencies will be automatically detected and rejected.
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={() => (isAddDialogOpen = false)} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button onclick={handleAddDependency} disabled={!selectedTaskId || isSubmitting}>
					{#if isSubmitting}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
					{/if}
					Add Dependency
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
