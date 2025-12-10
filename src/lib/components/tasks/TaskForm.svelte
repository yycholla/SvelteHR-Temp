<!--
  TaskForm Component
  Feature: 028-task-system-expansion - Task T028
  
  Comprehensive task create/edit form with validation
  - Parent task selection (for subtasks)
  - Assignee selection (user dropdown)
  - Task type selection
  - Priority and status selection
  - Due date picker with reminder configuration
  - Description rich text editor
  - Form validation and error handling
-->

<script lang="ts">
	import type { Task, TaskPriority, TaskStatus, TaskType } from '$lib/types/task';
	import type { User } from '$lib/types/user';
	import type { CreateTaskInput, UpdateTaskInput } from '$lib/graphql/tasks-operations';
	import { validateTaskInput } from '$lib/graphql/tasks-operations';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { TagInput, TaskTypeTagInput } from '$lib/components/ui/tag-input';
	import {
		AlertCircle,
		Building2,
		Calendar,
		CheckSquare,
		Clock,
		User as UserIcon
	} from '@lucide/svelte';
	import { format } from 'date-fns';

	interface Department {
		id: string;
		name: string;
		description?: string;
	}

	interface Props {
		task?: Task | null; // For edit mode
		taskTypes?: TaskType[];
		users?: User[];
		assignees?: User[]; // Alternative name for users (compatibility)
		departments?: Department[]; // Departments for assignment
		parentTasks?: Task[]; // Available parent tasks (excluding current task and its children)
		onSubmit?: (data: CreateTaskInput | UpdateTaskInput) => Promise<void>; // Optional - for custom submission
		onCancel: () => void;
		loading?: boolean;
	}

	const {
		task = null,
		taskTypes = [],
		users = [],
		assignees = [],
		departments = [],
		parentTasks = [],
		onSubmit,
		onCancel,
		loading = false
	}: Props = $props();

	// Use assignees if provided, otherwise use users
	const availableUsers = $derived(assignees.length > 0 ? assignees : users);

	// Form mode
	const isEditing = $derived(task !== null);
	const formTitle = $derived(isEditing ? 'Edit Task' : 'Create New Task');

	// Form state
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	// Assignees are now an array of "user:id" or "dept:id" strings
	let formData = $state({
		title: task?.title || '',
		description: task?.description || '',
		assignees: task?.assigneeId ? [`user:${task.assigneeId}`] : ([] as string[]),
		taskTypeId: task?.taskTypeId || '',
		status: task?.status || ('TODO' as TaskStatus),
		priority: task?.priority || ('MEDIUM' as TaskPriority),
		dueDate: task?.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
		parentTaskId: task?.parentTaskId || '',
		reminderTime: '60', // Default 60 minutes before due date (string for Select compatibility)
		requiresManualReassignment: task?.requiresManualReassignment || false
	});

	// Search state for dropdowns
	let parentTaskSearchTerm = $state('');

	// Validation state
	let validationErrors = $state<string[]>([]);
	let fieldErrors = $state<Record<string, string>>({});

	// Combined assignee options for TagInput (both users and departments)
	const combinedAssigneeOptions = $derived(() => {
		const combined = [
			...userOptions.map((opt) => ({
				value: opt.value,
				label: opt.label,
				type: 'User',
				icon: UserIcon
			})),
			...departmentOptions.map((opt) => ({
				value: opt.value,
				label: opt.label,
				type: 'Department',
				icon: Building2
			}))
		];
		// Sort alphabetically by label
		return combined.sort((a, b) => a.label.localeCompare(b.label));
	});

	// Derived state
	const isValid = $derived(() => {
		// Required fields
		if (!formData.title.trim()) return false;
		if (!formData.assignees || formData.assignees.length === 0) return false;
		if (!formData.taskTypeId) return false;

		// No validation errors
		return validationErrors.length === 0;
	});

	// Status options
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	// Status options - Rust GraphQL schema enums
	const statusOptions = [
		{ value: 'TODO', label: 'To Do' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'BLOCKED', label: 'Blocked' },
		{ value: 'REVIEW', label: 'Review' },
		{ value: 'DONE', label: 'Done' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	];

	// Priority options with colors
	// NOTE: PostGraphile returns enum values in GraphQL format (SCREAMING_SNAKE_CASE)
	const priorityOptions = [
		{ value: 'LOW', label: 'Low', color: 'text-gray-600' },
		{ value: 'MEDIUM', label: 'Medium', color: 'text-blue-600' },
		{ value: 'HIGH', label: 'High', color: 'text-orange-600' },
		{ value: 'URGENT', label: 'Urgent', color: 'text-red-600' }
	];

	// Reminder time options (in minutes)
	// NOTE: Values must be strings for Select component compatibility
	const reminderTimeOptions = [
		{ value: '15', label: '15 minutes before' },
		{ value: '30', label: '30 minutes before' },
		{ value: '60', label: '1 hour before' },
		{ value: '120', label: '2 hours before' },
		{ value: '240', label: '4 hours before' },
		{ value: '1440', label: '1 day before' },
		{ value: '2880', label: '2 days before' },
		{ value: '10080', label: '1 week before' }
	];

	// Computed options for select fields
	const taskTypeOptions = $derived(
		taskTypes.map((type) => ({
			value: type.id,
			label: type.name
		}))
	);

	const userOptions = $derived(
		availableUsers.map((user) => ({
			value: `user:${user.id}`,
			label: user.displayName || user.email,
			type: 'user' as const
		}))
	);

	const departmentOptions = $derived(
		departments.map((dept) => ({
			value: `dept:${dept.id}`,
			label: dept.name,
			type: 'department' as const
		}))
	);

	// Filter parent tasks based on selected assignees (multi-assignee support)
	// Only show tasks that are assigned to any of the selected users/departments or are unassigned
	const filteredParentTasks = $derived(() => {
		if (!formData.assignees || formData.assignees.length === 0) {
			// No assignees selected, show all tasks
			return parentTasks;
		}

		// Extract the actual IDs without the prefixes
		const selectedIds = formData.assignees.map((assignee) =>
			assignee.replace(/^(user:|dept:)/, '')
		);

		return parentTasks.filter((task) => {
			// Always allow unassigned tasks as parents
			if (!task.assigneeId) return true;

			// Check if the parent task is assigned to any of the selected entities
			return selectedIds.includes(task.assigneeId);
		});
	});

	const parentTaskOptions = $derived([
		{ value: '', label: 'None (Top-level task)' },
		...filteredParentTasks().map((parentTask) => ({
			value: parentTask.id,
			label: parentTask.title
		}))
	]);

	// Filtered parent task options based on search
	const filteredParentTaskOptions = $derived(() => {
		if (!parentTaskSearchTerm.trim()) return parentTaskOptions;
		const searchLower = parentTaskSearchTerm.toLowerCase();
		return parentTaskOptions.filter((task) => task.label.toLowerCase().includes(searchLower));
	});

	// Selected values for Select components (Svelte 5 runes format)
	// Note: $derived creates a reactive value, not a function
	const selectedTaskType = $derived(
		taskTypeOptions.find((opt) => opt.value === formData.taskTypeId)
	);

	const selectedParentTask = $derived(
		parentTaskOptions.find((opt) => opt.value === formData.parentTaskId)
	);

	const selectedStatus = $derived(statusOptions.find((opt) => opt.value === formData.status));

	const selectedPriority = $derived(priorityOptions.find((opt) => opt.value === formData.priority));

	const selectedReminderTime = $derived(
		reminderTimeOptions.find((opt) => opt.value === formData.reminderTime)
	);

	// Clear parent task selection if it's no longer valid for the selected assignees
	$effect(() => {
		if (formData.parentTaskId && formData.assignees && formData.assignees.length > 0) {
			const isParentTaskStillValid = filteredParentTasks().some(
				(task) => task.id === formData.parentTaskId
			);

			if (!isParentTaskStillValid) {
				console.log(
					'[TaskForm] Parent task no longer valid for selected assignees, clearing selection'
				);
				formData.parentTaskId = '';
			}
		}
	});

	// Debug logging
	$effect(() => {
		console.log('[TaskForm] Available users:', availableUsers.length);
		console.log('[TaskForm] Available departments:', departments.length);
		console.log('[TaskForm] Combined assignee options:', combinedAssigneeOptions().length);
		console.log('[TaskForm] Task types:', taskTypes.length);
		console.log('[TaskForm] Form data assignees:', formData.assignees);
		console.log('[TaskForm] Total parent tasks:', parentTasks.length);
		console.log('[TaskForm] Filtered parent tasks:', filteredParentTasks().length);
		console.log('[TaskForm] Form data status:', formData.status);
		console.log('[TaskForm] Selected status:', selectedStatus);
		console.log('[TaskForm] Form data priority:', formData.priority);
		console.log('[TaskForm] Selected priority:', selectedPriority);
	});

	// Validate form on data changes
	$effect(() => {
		const validation = validateTaskInput({
			title: formData.title,
			description: formData.description || undefined,
			dueDate: formData.dueDate || undefined
		});

		validationErrors = validation.errors;

		// Field-specific errors
		const newFieldErrors: Record<string, string> = {};
		if (!formData.title.trim()) {
			newFieldErrors.title = 'Title is required';
		} else if (formData.title.length > 255) {
			newFieldErrors.title = 'Title must be less than 255 characters';
		}

		if (formData.description && formData.description.length > 5000) {
			newFieldErrors.description = 'Description must be less than 5000 characters';
		}

		if (!formData.assignees || formData.assignees.length === 0) {
			newFieldErrors.assignees = 'At least one assignee is required';
		}

		if (!formData.taskTypeId) {
			newFieldErrors.taskTypeId = 'Task type is required';
		}

		if (formData.dueDate) {
			const dueDate = new Date(formData.dueDate);
			const now = new Date();
			if (dueDate < now) {
				newFieldErrors.dueDate = 'Due date cannot be in the past';
			}
		}

		fieldErrors = newFieldErrors;
	});

	// Handle client-side validation before form submission
	function handleClientSideValidation(e: Event) {
		// Validate form
		if (!isValid()) {
			e.preventDefault();
			return false;
		}

		// Call optional onSubmit callback if provided (for backwards compatibility)
		if (onSubmit) {
			e.preventDefault();

			// Extract first assignee ID (temporary until backend supports multiple assignees)
			// Remove the "user:" or "dept:" prefix
			const firstAssignee = formData.assignees[0];
			const assigneeId = firstAssignee ? firstAssignee.replace(/^(user:|dept:)/, '') : '';

			if (isEditing && task) {
				// Update task
				const updateData: UpdateTaskInput = {
					id: task.id,
					taskPatch: {
						title: formData.title,
						description: formData.description || null,
						assigneeId,
						taskTypeId: formData.taskTypeId,
						status: formData.status,
						priority: formData.priority,
						dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
						parentTaskId: formData.parentTaskId || null,
						requiresManualReassignment: formData.requiresManualReassignment
					}
				};
				onSubmit(updateData).catch((error) => {
					console.error('[TaskForm] Submit error:', error);
				});
			} else {
				// Create task
				const createData: CreateTaskInput = {
					task: {
						title: formData.title,
						description: formData.description || undefined,
						assigneeId,
						taskTypeId: formData.taskTypeId,
						status: formData.status,
						priority: formData.priority,
						dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
						parentTaskId: formData.parentTaskId || undefined,
						requiresManualReassignment: formData.requiresManualReassignment
					}
				};
				onSubmit(createData).catch((error) => {
					console.error('[TaskForm] Submit error:', error);
				});
			}

			return false;
		}

		// If no onSubmit callback, allow native form submission to proceed
		return true;
	}

	// Handle cancel
	function handleCancel() {
		onCancel();
	}

	// Reset form
	function handleReset() {
		if (isEditing && task) {
			formData = {
				title: task.title,
				description: task.description || '',
				assignees: task.assigneeId ? [`user:${task.assigneeId}`] : [],
				taskTypeId: task.taskTypeId,
				status: task.status,
				priority: task.priority,
				dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
				parentTaskId: task.parentTaskId || '',
				reminderTime: '60',
				requiresManualReassignment: task.requiresManualReassignment
			};
		} else {
			formData = {
				title: '',
				description: '',
				assignees: [],
				taskTypeId: '',
				status: 'TODO' as TaskStatus,
				priority: 'MEDIUM' as TaskPriority,
				dueDate: '',
				parentTaskId: '',
				reminderTime: '60',
				requiresManualReassignment: false
			};
		}
		validationErrors = [];
		fieldErrors = {};
	}
</script>

<div class="task-form">
	<!-- Form Header -->
	<div class="mb-6 flex items-center gap-3">
		<CheckSquare class="h-6 w-6 text-primary" />
		<h2 class="text-2xl font-bold text-foreground">{formTitle}</h2>
	</div>

	<!-- Validation Errors Summary -->
	{#if validationErrors.length > 0}
		<div class="mb-4 rounded-lg border border-destructive bg-destructive/10 p-4">
			<div class="flex items-start gap-2">
				<AlertCircle class="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
				<div class="flex-1">
					<h3 class="mb-1 font-semibold text-destructive">Please fix the following errors:</h3>
					<ul class="list-inside list-disc space-y-1 text-sm text-destructive">
						{#each validationErrors as error}
							<li>{error}</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}

	<form method="POST" onsubmit={handleClientSideValidation} class="space-y-6">
		<!-- Basic Information Section -->
		<div class="space-y-4 rounded-lg border bg-card p-6">
			<h3 class="border-b pb-2 text-lg font-semibold">Basic Information</h3>

			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">
					Task Title <span class="text-destructive">*</span>
				</Label>
				<Input
					id="title"
					bind:value={formData.title}
					placeholder="Enter task title"
					class={fieldErrors.title ? 'border-destructive' : ''}
					maxlength={255}
					required
				/>
				{#if fieldErrors.title}
					<p class="text-sm text-destructive">{fieldErrors.title}</p>
				{/if}
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={formData.description}
					placeholder="Enter task description (optional)"
					class={fieldErrors.description ? 'border-destructive' : ''}
					rows={5}
					maxlength={5000}
				/>
				{#if fieldErrors.description}
					<p class="text-sm text-destructive">{fieldErrors.description}</p>
				{/if}
				<p class="text-xs text-muted-foreground">
					{formData.description?.length || 0} / 5000 characters
				</p>
			</div>
		</div>

		<!-- Assignment Section -->
		<div class="space-y-4 rounded-lg border bg-card p-6">
			<h3 class="flex items-center gap-2 border-b pb-2 text-lg font-semibold">
				<UserIcon class="h-4 w-4" />
				Assignment
			</h3>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Assignees (Multi-select with email-style tag input) -->
				<div class="space-y-2">
					<Label for="assignees">
						Assignees <span class="text-destructive">*</span>
					</Label>
					<TagInput
						options={combinedAssigneeOptions()}
						bind:selected={formData.assignees}
						placeholder="Type to search users or departments..."
						onSelectedChange={(selected) => {
							console.log('[TaskForm] Assignees changed:', selected);
							formData.assignees = selected;
						}}
					/>
					{#if fieldErrors.assignees}
						<p class="text-sm text-destructive">{fieldErrors.assignees}</p>
					{/if}
					<p class="text-xs text-muted-foreground">
						{combinedAssigneeOptions().length} available ({availableUsers.length} users, {departments.length}
						departments)
					</p>
				</div>

				<!-- Task Type -->
				<div class="space-y-2">
					<Label for="taskType">
						Task Type <span class="text-destructive">*</span>
					</Label>
					<TaskTypeTagInput
						{taskTypes}
						bind:selected={formData.taskTypeId}
						placeholder="Select or create task type..."
						disabled={loading}
						onSelectedChange={(selected) => {
							formData.taskTypeId = selected;
							if (fieldErrors.taskTypeId) {
								delete fieldErrors.taskTypeId;
							}
						}}
						onCreate={(newTaskType) => {
							console.log('Created new task type:', newTaskType);
						}}
					/>
					{#if fieldErrors.taskTypeId}
						<p class="text-sm text-destructive">{fieldErrors.taskTypeId}</p>
					{/if}
				</div>
			</div>

			<!-- Parent Task (for subtasks) -->
			<div class="space-y-2">
				<Label for="parentTask">Parent Task (Optional)</Label>
				<Select.Root
					type="single"
					bind:value={formData.parentTaskId}
					onSelectedChange={(v: { value?: string; label?: string } | undefined) => {
						parentTaskSearchTerm = ''; // Reset search on selection
					}}
				>
					<Select.Trigger id="parentTask">
						{selectedParentTask?.label ?? 'None (Top-level task)'}
					</Select.Trigger>
					<Select.Content class="max-h-[300px]">
						{#if parentTaskOptions.length > 1}
							<!-- Search Input (only show if there are tasks beyond "None") -->
							<div class="sticky top-0 z-10 border-b bg-popover p-2">
								<Input
									type="text"
									placeholder="Search tasks..."
									bind:value={parentTaskSearchTerm}
									class="h-8 text-sm"
									onclick={(e) => e.stopPropagation()}
									onkeydown={(e) => e.stopPropagation()}
								/>
							</div>

							<!-- Scrollable Task List -->
							<div class="max-h-[200px] overflow-y-auto">
								{#if filteredParentTaskOptions().length === 0}
									<div class="p-4 text-center text-sm text-muted-foreground">
										No tasks found matching "{parentTaskSearchTerm}"
									</div>
								{:else}
									{#each filteredParentTaskOptions() as parent}
										<Select.Item value={parent.value} label={parent.label}
											>{parent.label}</Select.Item
										>
									{/each}
								{/if}
							</div>
						{:else}
							<!-- No tasks available, just show the "None" option -->
							{#each parentTaskOptions as parent}
								<Select.Item value={parent.value} label={parent.label}>{parent.label}</Select.Item>
							{/each}
						{/if}
					</Select.Content>
				</Select.Root>
				<p class="text-xs text-muted-foreground">
					{#if parentTaskOptions.length > 1}
						{filteredParentTaskOptions().length} of {parentTaskOptions.length} tasks available
						{#if formData.assignees && formData.assignees.length > 0 && filteredParentTasks().length < parentTasks.length}
							<span class="text-primary">(filtered by assignees)</span>
						{/if}
					{:else}
						Select a parent task to create a subtask
					{/if}
				</p>
			</div>
		</div>

		<!-- Status & Priority Section -->
		<div class="space-y-4 rounded-lg border bg-card p-6">
			<h3 class="border-b pb-2 text-lg font-semibold">Status & Priority</h3>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Status -->
				<div class="space-y-2">
					<Label for="status">Status</Label>
					<Select.Root type="single" bind:value={formData.status}>
						<Select.Trigger id="status">
							{selectedStatus?.label ?? 'Select status'}
						</Select.Trigger>
						<Select.Content>
							{#each statusOptions as status}
								<Select.Item value={status.value} label={status.label}>{status.label}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Priority -->
				<div class="space-y-2">
					<Label for="priority">Priority</Label>
					<Select.Root type="single" bind:value={formData.priority}>
						<Select.Trigger id="priority">
							{selectedPriority?.label ?? 'Select priority'}
						</Select.Trigger>
						<Select.Content>
							{#each priorityOptions as priority}
								<Select.Item value={priority.value} label={priority.label}>
									<span class={priority.color}>{priority.label}</span>
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
		</div>

		<!-- Due Date & Reminders Section -->
		<div class="space-y-4 rounded-lg border bg-card p-6">
			<h3 class="flex items-center gap-2 border-b pb-2 text-lg font-semibold">
				<Clock class="h-4 w-4" />
				Due Date & Reminders
			</h3>

			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<!-- Due Date -->
				<div class="space-y-2">
					<Label for="dueDate">Due Date</Label>
					<div class="relative">
						<Input
							id="dueDate"
							type="date"
							bind:value={formData.dueDate}
							class={fieldErrors.dueDate ? 'border-destructive' : ''}
						/>
						<Calendar
							class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
						/>
					</div>
					{#if fieldErrors.dueDate}
						<p class="text-sm text-destructive">{fieldErrors.dueDate}</p>
					{/if}
				</div>

				<!-- Reminder Time -->
				{#if formData.dueDate}
					<div class="space-y-2">
						<Label for="reminderTime">Reminder Before Due Date</Label>
						<Select.Root type="single" bind:value={formData.reminderTime}>
							<Select.Trigger id="reminderTime">
								{selectedReminderTime?.label ?? 'Select reminder time'}
							</Select.Trigger>
							<Select.Content>
								{#each reminderTimeOptions as reminder}
									<Select.Item value={reminder.value} label={reminder.label}
										>{reminder.label}</Select.Item
									>
								{/each}
							</Select.Content>
						</Select.Root>
						<p class="text-xs text-muted-foreground">You'll be notified before the task is due</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Advanced Options Section -->
		<div class="space-y-4 rounded-lg border bg-card p-6">
			<h3 class="border-b pb-2 text-lg font-semibold">Advanced Options</h3>

			<!-- Requires Manual Reassignment -->
			<div class="flex items-center justify-between">
				<div class="space-y-0.5">
					<Label>Requires Manual Reassignment</Label>
					<p class="text-sm text-muted-foreground">
						Prevent automatic reassignment during organizational changes
					</p>
				</div>
				<Switch bind:checked={formData.requiresManualReassignment} />
			</div>
		</div>

		<!-- Form Actions -->
		<div class="flex items-center justify-between border-t pt-6">
			<Button type="button" variant="ghost" onclick={handleReset} disabled={loading}>Reset</Button>

			<div class="flex items-center gap-3">
				<Button type="button" variant="outline" onclick={handleCancel} disabled={loading}>
					Cancel
				</Button>

				<Button type="submit" disabled={!isValid() || loading} class="min-w-32">
					{#if loading}
						<div class="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
					{/if}
					{isEditing ? 'Update Task' : 'Create Task'}
				</Button>
			</div>
		</div>

		<!-- Hidden inputs for form submission (native HTML forms) -->
		<input type="hidden" name="title" bind:value={formData.title} />
		<input type="hidden" name="description" bind:value={formData.description} />
		<input type="hidden" name="status" bind:value={formData.status} />
		<input type="hidden" name="priority" bind:value={formData.priority} />
		<input type="hidden" name="taskTypeId" bind:value={formData.taskTypeId} />
		<input type="hidden" name="parentTaskId" bind:value={formData.parentTaskId} />
		<input type="hidden" name="dueDate" bind:value={formData.dueDate} />
		<input type="hidden" name="reminderTime" bind:value={formData.reminderTime} />
		<input
			type="hidden"
			name="requiresManualReassignment"
			bind:value={formData.requiresManualReassignment}
		/>
		<!-- assigneeId derived from first assignee in array -->
		{#if formData.assignees.length > 0}
			<input type="hidden" name="assigneeId" value={formData.assignees[0]} />
		{/if}
	</form>
</div>
