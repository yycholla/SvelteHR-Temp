<!--
  Quick Add Task Popover Component
  Reusable component for creating tasks with inline controls
-->

<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Popover from '$lib/components/ui/popover';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Command from '$lib/components/ui/command';
	import { Calendar as CalendarComponent } from '$lib/components/ui/calendar';
	import LoadingSpinner from '$lib/components/ui/loading-spinner.svelte';
	import {
		Briefcase,
		Calendar,
		Check,
		ChevronsUpDown,
		Flag,
		Plus,
		Send,
		User,
		X
	} from '@lucide/svelte';
	import { CalendarDate, type DateValue } from '@internationalized/date';
	import { format } from 'date-fns';

	// Props
	const {
		currentUser,
		assignees = [],
		taskTypes = [],
		canAssign = false,
		formAction = '/dashboard/tasks',
		parentTaskId,
		triggerLabel = 'New Task',
		triggerIcon = Plus,
		triggerVariant = 'default',
		triggerSize = 'default',
		onSuccess
	}: {
		currentUser: { id: string; displayName: string; role: string };
		assignees: Array<{ id: string; displayName: string }>;
		taskTypes: Array<{ id: string; name: string; colorCode: string }>;
		canAssign?: boolean;
		formAction?: string;
		parentTaskId?: string;
		triggerLabel?: string;
		triggerIcon?: any;
		triggerVariant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
		triggerSize?: 'default' | 'sm' | 'lg' | 'icon';
		onSuccess?: () => void;
	} = $props();

	// Quick-add task popover state
	let isQuickAddOpen = $state(false);
	let quickAddTitle = $state('');
	let quickAddDescription = $state('');
	let quickAddPriority = $state('MEDIUM');
	let quickAddDueDate = $state<DateValue | undefined>(undefined);
	let quickAddAssigneeId = $state(currentUser.id); // Default to current user
	let quickAddTaskTypeId = $state('');
	let isDatePickerOpen = $state(false);
	let isAssigneeComboboxOpen = $state(false);
	let isTaskTypeComboboxOpen = $state(false);
	let isPriorityComboboxOpen = $state(false);
	let assigneeComboboxTriggerRef = $state<HTMLButtonElement>(null!);
	let taskTypeComboboxTriggerRef = $state<HTMLButtonElement>(null!);
	let priorityComboboxTriggerRef = $state<HTMLButtonElement>(null!);
	let isSubmitting = $state(false);

	// Component for the trigger icon
	const TriggerIcon = triggerIcon;

	// Selected assignee display name
	const selectedAssigneeName = $derived(
		assignees.find((a) => a.id === quickAddAssigneeId)?.displayName ||
			currentUser.displayName ||
			currentUser.email ||
			'User'
	);

	// Get first name from display name
	const selectedAssigneeFirstName = $derived(
		selectedAssigneeName ? selectedAssigneeName.split(' ')[0] : 'User'
	);

	// Selected task type name and color
	const selectedTaskType = $derived(taskTypes.find((t) => t.id === quickAddTaskTypeId));
	const selectedTaskTypeName = $derived(selectedTaskType?.name || 'Type');
	const selectedTaskTypeColor = $derived(selectedTaskType?.colorCode || '#6b7280'); // Default to gray

	// Priority options with colors
	const priorityOptions = [
		{ value: 'LOW', label: 'Low', color: '#10b981' }, // green
		{ value: 'MEDIUM', label: 'Medium', color: '#f59e0b' }, // amber
		{ value: 'HIGH', label: 'High', color: '#ef4444' }, // red
		{ value: 'URGENT', label: 'Urgent', color: '#dc2626' } // darker red
	];

	// Selected priority label and color
	const selectedPriority = $derived(
		priorityOptions.find((p) => p.value === quickAddPriority) || priorityOptions[1]
	);
	const selectedPriorityLabel = $derived(selectedPriority.label);
	const selectedPriorityColor = $derived(selectedPriority.color);

	// Format date for badge display
	const formattedDateBadge = $derived(
		quickAddDueDate
			? format(
					new Date(quickAddDueDate.year, quickAddDueDate.month - 1, quickAddDueDate.day),
					'MMM d'
				)
			: null
	);

	// Close assignee combobox and refocus trigger
	function closeAssigneeCombobox() {
		isAssigneeComboboxOpen = false;
		tick().then(() => {
			assigneeComboboxTriggerRef?.focus();
		});
	}

	// Close task type combobox and refocus trigger
	function closeTaskTypeCombobox() {
		isTaskTypeComboboxOpen = false;
		tick().then(() => {
			taskTypeComboboxTriggerRef?.focus();
		});
	}

	// Close priority combobox and refocus trigger
	function closePriorityCombobox() {
		isPriorityComboboxOpen = false;
		tick().then(() => {
			priorityComboboxTriggerRef?.focus();
		});
	}

	// Clear the selected date
	function clearDueDate(e: MouseEvent | KeyboardEvent) {
		e.stopPropagation(); // Prevent opening the date picker
		quickAddDueDate = undefined;
	}

	// Convert DateValue to ISO date string (YYYY-MM-DD)
	function getDateString(): string | null {
		if (!quickAddDueDate) return null;
		const year = quickAddDueDate.year;
		const month = String(quickAddDueDate.month).padStart(2, '0');
		const day = String(quickAddDueDate.day).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
</script>

<Popover.Root bind:open={isQuickAddOpen}>
	<Popover.Trigger>
		<Button
			class="flex-shrink-0"
			data-testid="tasks-create-button"
			variant={triggerVariant}
			size={triggerSize}
		>
			<TriggerIcon class="mr-2 h-4 w-4" />
			{triggerLabel}
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-[550px] p-4" align="end">
		<form
			method="POST"
			action={formAction}
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						// Update page data
						await update();
						// Call success callback if provided (must await to ensure data refresh completes)
						await onSuccess?.();
						// Reset form after data is refreshed
						quickAddTitle = '';
						quickAddDescription = '';
						quickAddPriority = 'MEDIUM';
						quickAddDueDate = undefined;
						quickAddAssigneeId = currentUser.id;
						quickAddTaskTypeId = '';
						isQuickAddOpen = false;
					} else if (result.type === 'failure') {
						alert(result.data?.error || 'Failed to create task');
					}
				};
			}}
		>
			<!-- Hidden inputs for form data -->
			<input type="hidden" name="title" value={quickAddTitle} />
			<input type="hidden" name="description" value={quickAddDescription} />
			<input type="hidden" name="priority" value={quickAddPriority} />
			<input type="hidden" name="assigneeId" value={quickAddAssigneeId} />
			<input type="hidden" name="taskTypeId" value={quickAddTaskTypeId} />
			{#if parentTaskId}
				<input type="hidden" name="parentTaskId" value={parentTaskId} />
			{/if}
			{#if quickAddDueDate}
				<input type="hidden" name="dueDate" value={getDateString()} />
			{/if}

			<div class="space-y-3">
				<div>
					<h3 class="font-semibold text-base">{parentTaskId ? 'Add Subtask' : 'Quick Add Task'}</h3>
					<p class="text-xs text-muted-foreground">
						{parentTaskId
							? 'Break down this task into smaller steps'
							: 'Create a new task with inline controls'}
					</p>
				</div>

				<!-- Title Input -->
				<InputGroup.Root>
					<InputGroup.Input placeholder="Enter task title..." bind:value={quickAddTitle} />
				</InputGroup.Root>

				<!-- Description with Controls -->
				<InputGroup.Root class="min-h-[120px]">
					<InputGroup.Textarea
						placeholder="Add description..."
						bind:value={quickAddDescription}
						rows={4}
						class="resize-none"
					/>
					<InputGroup.Addon align="block-end" class="flex-wrap gap-1">
						<!-- Due Date Picker Badge -->
						<Popover.Root bind:open={isDatePickerOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									{#if formattedDateBadge}
										<!-- Date selected - show badge with date and X to clear -->
										<button
											{...props}
											type="button"
											class="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
										>
											<Calendar class="h-3 w-3" />
											{formattedDateBadge}
											<span
												onclick={clearDueDate}
												class="ml-0.5 rounded-full hover:bg-accent-foreground/10 p-0.5 cursor-pointer inline-flex"
												role="button"
												tabindex="0"
												onkeydown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														clearDueDate(e);
													}
												}}
											>
												<X class="h-3 w-3" />
											</span>
										</button>
									{:else}
										<!-- No date selected - show just calendar icon -->
										<InputGroup.Button {...props} variant="ghost" size="icon-sm" class="px-2">
											<Calendar class="h-3.5 w-3.5" />
											<span class="sr-only">Select date</span>
										</InputGroup.Button>
									{/if}
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-auto p-0" align="start">
								<CalendarComponent type="single" bind:value={quickAddDueDate} />
							</Popover.Content>
						</Popover.Root>

						<!-- Priority Combobox -->
						<Popover.Root bind:open={isPriorityComboboxOpen}>
							<Popover.Trigger bind:ref={priorityComboboxTriggerRef}>
								{#snippet child({ props })}
									<button
										{...props}
										type="button"
										role="combobox"
										aria-expanded={isPriorityComboboxOpen}
										class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
										style="background-color: {selectedPriorityColor}; color: white; border-color: {selectedPriorityColor};"
									>
										<Flag class="h-3 w-3" />
										{selectedPriorityLabel}
										<ChevronsUpDown class="h-3 w-3 opacity-70" />
									</button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[150px] p-0" align="start">
								<Command.Root>
									<Command.List>
										<Command.Group>
											{#each priorityOptions as priority (priority.value)}
												<Command.Item
													value={priority.label}
													onSelect={() => {
														quickAddPriority = priority.value;
														closePriorityCombobox();
													}}
												>
													<Check
														class={quickAddPriority !== priority.value ? 'text-transparent' : ''}
													/>
													<span
														class="mr-2 h-2 w-2 rounded-full"
														style="background-color: {priority.color}"
													></span>
													{priority.label}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						<!-- Task Type Combobox -->
						<Popover.Root bind:open={isTaskTypeComboboxOpen}>
							<Popover.Trigger bind:ref={taskTypeComboboxTriggerRef}>
								{#snippet child({ props })}
									<button
										{...props}
										type="button"
										role="combobox"
										aria-expanded={isTaskTypeComboboxOpen}
										class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
										style="background-color: {selectedTaskTypeColor}; color: white; border-color: {selectedTaskTypeColor};"
									>
										<Briefcase class="h-3 w-3" />
										{selectedTaskTypeName}
										<ChevronsUpDown class="h-3 w-3 opacity-70" />
									</button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[200px] p-0" align="start">
								<Command.Root>
									<Command.Input placeholder="Search task types..." class="h-9" />
									<Command.List>
										<Command.Empty>No task type found.</Command.Empty>
										<Command.Group>
											<Command.Item
												value="none"
												onSelect={() => {
													quickAddTaskTypeId = '';
													closeTaskTypeCombobox();
												}}
											>
												<Check class={quickAddTaskTypeId !== '' ? 'text-transparent' : ''} />
												No Type
											</Command.Item>
											{#each taskTypes as taskType (taskType.id)}
												<Command.Item
													value={taskType.name}
													onSelect={() => {
														quickAddTaskTypeId = taskType.id;
														closeTaskTypeCombobox();
													}}
												>
													<Check
														class={quickAddTaskTypeId !== taskType.id ? 'text-transparent' : ''}
													/>
													<span
														class="mr-2 h-2 w-2 rounded-full"
														style="background-color: {taskType.colorCode}"
													></span>
													{taskType.name}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						{#if canAssign}
							<!-- Assignee Combobox -->
							<Popover.Root bind:open={isAssigneeComboboxOpen}>
								<Popover.Trigger bind:ref={assigneeComboboxTriggerRef}>
									{#snippet child({ props })}
										<button
											{...props}
											type="button"
											role="combobox"
											aria-expanded={isAssigneeComboboxOpen}
											class="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
										>
											<User class="h-3 w-3" />
											{selectedAssigneeFirstName}
											<ChevronsUpDown class="h-3 w-3 opacity-50" />
										</button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-[200px] p-0" align="start">
									<Command.Root>
										<Command.Input placeholder="Search assignees..." class="h-9" />
										<Command.List>
											<Command.Empty>No assignee found.</Command.Empty>
											<Command.Group>
												{#each assignees as assignee (assignee.id)}
													<Command.Item
														value={assignee.displayName}
														onSelect={() => {
															quickAddAssigneeId = assignee.id;
															closeAssigneeCombobox();
														}}
													>
														<Check
															class={quickAddAssigneeId !== assignee.id ? 'text-transparent' : ''}
														/>
														{assignee.displayName}
													</Command.Item>
												{/each}
											</Command.Group>
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
						{/if}

						<!-- Spacer to push send button to the right -->
						<div class="flex-1"></div>

						<!-- Submit Button -->
						<InputGroup.Button
	variant="primary"
							class="rounded-full"
							size="icon-sm"
							type="submit"
							disabled={!quickAddTitle.trim() || isSubmitting}
						>
							{#if isSubmitting}
								<LoadingSpinner size="sm" variant="default" />
							{:else}
								<Send class="h-3.5 w-3.5" />
							{/if}
							<span class="sr-only">{isSubmitting ? 'Creating...' : 'Create Task'}</span>
						</InputGroup.Button>
					</InputGroup.Addon>
				</InputGroup.Root>
			</div>
		</form>
	</Popover.Content>
</Popover.Root>
