<!--
  Quick Add Team Task Popover Component
  For creating tasks assigned to departments/teams
-->

<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import { Button } from '$lib/components/ui/button';
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
		Users,
		X
	} from '@lucide/svelte';
	import type { DateValue } from '@internationalized/date';
	import { format } from 'date-fns';

	// Props
	const {
		currentUser,
		departments = [],
		taskTypes = [],
		onSuccess
	}: {
		currentUser?: {
			id: string;
			email?: string;
			displayName?: string;
			display_name?: string;
			role?: string;
			firstName?: string;
			first_name?: string;
			lastName?: string;
			last_name?: string;
		};
		departments: Array<{ id: string; name: string; description?: string }>;
		taskTypes: Array<{ id: string; name: string; colorCode: string }>;
		onSuccess?: () => void;
	} = $props();

	// Quick-add task popover state
	let isQuickAddOpen = $state(false);
	let quickAddTitle = $state('');
	let quickAddDescription = $state('');
	let quickAddPriority = $state('MEDIUM');
	let quickAddDueDate = $state<DateValue | undefined>(undefined);
	let quickAddDepartmentId = $state(''); // Department selection instead of assignee
	let quickAddTaskTypeId = $state('');
	let isDatePickerOpen = $state(false);
	let isDepartmentComboboxOpen = $state(false);
	let isTaskTypeComboboxOpen = $state(false);
	let isPriorityComboboxOpen = $state(false);
	let departmentComboboxTriggerRef = $state<HTMLButtonElement>(null!);
	let taskTypeComboboxTriggerRef = $state<HTMLButtonElement>(null!);
	let priorityComboboxTriggerRef = $state<HTMLButtonElement>(null!);
	let isSubmitting = $state(false);

	// Selected department display name
	const selectedDepartmentName = $derived(
		departments.find((d) => d.id === quickAddDepartmentId)?.name || 'Department'
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

	// Close department combobox and refocus trigger
	function closeDepartmentCombobox() {
		isDepartmentComboboxOpen = false;
		tick().then(() => {
			departmentComboboxTriggerRef?.focus();
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
		<Button class="flex-shrink-0" data-testid="team-tasks-create-button">
			<Plus class="mr-2 h-4 w-4" />
			New Team Task
		</Button>
	</Popover.Trigger>
	<Popover.Content class="w-[550px] p-4" align="end">
		<form
			method="POST"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						// Reset form
						quickAddTitle = '';
						quickAddDescription = '';
						quickAddPriority = 'MEDIUM';
						quickAddDueDate = undefined;
						quickAddDepartmentId = '';
						quickAddTaskTypeId = '';
						isQuickAddOpen = false;
						// Update page data
						await update();
						// Call success callback if provided
						onSuccess?.();
					} else if (result.type === 'failure') {
						alert(result.data?.error || 'Failed to create team task');
					}
				};
			}}
		>
			<!-- Hidden inputs for form data -->
			<input type="hidden" name="title" value={quickAddTitle} />
			<input type="hidden" name="description" value={quickAddDescription} />
			<input type="hidden" name="priority" value={quickAddPriority} />
			<input type="hidden" name="departmentId" value={quickAddDepartmentId} />
			<input type="hidden" name="taskTypeId" value={quickAddTaskTypeId} />
			{#if quickAddDueDate}
				<input type="hidden" name="dueDate" value={getDateString()} />
			{/if}

			<div class="space-y-3">
				<div>
					<h3 class="font-semibold text-base">Quick Add Team Task</h3>
					<p class="text-xs text-muted-foreground">Create a task assigned to a department/team</p>
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

						<!-- Department Combobox (replaces Assignee for team tasks) -->
						<Popover.Root bind:open={isDepartmentComboboxOpen}>
							<Popover.Trigger bind:ref={departmentComboboxTriggerRef}>
								{#snippet child({ props })}
									<button
										{...props}
										type="button"
										role="combobox"
										aria-expanded={isDepartmentComboboxOpen}
										class="inline-flex items-center gap-1 rounded-full border border-input bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
									>
										<Users class="h-3 w-3" />
										{selectedDepartmentName}
										<ChevronsUpDown class="h-3 w-3 opacity-50" />
									</button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[200px] p-0" align="start">
								<Command.Root>
									<Command.Input placeholder="Search departments..." class="h-9" />
									<Command.List>
										<Command.Empty>No department found.</Command.Empty>
										<Command.Group>
											{#each departments as department (department.id)}
												<Command.Item
													value={department.name}
													onSelect={() => {
														quickAddDepartmentId = department.id;
														closeDepartmentCombobox();
													}}
												>
													<Check
														class={quickAddDepartmentId !== department.id ? 'text-transparent' : ''}
													/>
													{department.name}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>

						<!-- Spacer to push send button to the right -->
						<div class="flex-1"></div>

						<!-- Submit Button -->
						<InputGroup.Button
	variant="default"
							class="rounded-full"
							size="icon-sm"
							type="submit"
							disabled={!quickAddTitle.trim() || !quickAddDepartmentId || isSubmitting}
						>
							{#if isSubmitting}
								<LoadingSpinner size="sm" variant="default" />
							{:else}
								<Send class="h-3.5 w-3.5" />
							{/if}
							<span class="sr-only">{isSubmitting ? 'Creating...' : 'Create Team Task'}</span>
						</InputGroup.Button>
					</InputGroup.Addon>
				</InputGroup.Root>
			</div>
		</form>
	</Popover.Content>
</Popover.Root>
