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
	import { logger } from '$lib/utils/logger';
	import type { User } from '$lib/types/user';
	import type { CreateTaskInput, UpdateTaskInput } from '$lib/graphql/tasks-operations';
	import { validateTaskInput } from '$lib/graphql/tasks-operations';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, Building2, CheckSquare, User as UserIcon } from '@lucide/svelte';
	import { format } from 'date-fns';

	// Import decomposed components
	import TaskBasicInfo from './form/TaskBasicInfo.svelte';
	import TaskAssignment from './form/TaskAssignment.svelte';
	import TaskStatusPriority from './form/TaskStatusPriority.svelte';
	import TaskScheduling from './form/TaskScheduling.svelte';
	import TaskAdvancedOptions from './form/TaskAdvancedOptions.svelte';

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
		initialValues?: Partial<CreateTaskInput> & { assigneeId?: string };
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
		loading = false,
		initialValues = {}
	}: Props = $props();

	// Use assignees if provided, otherwise use users
	const availableUsers = $derived(assignees.length > 0 ? assignees : users);

	// Form mode
	const isEditing = $derived(task !== null);
	const formTitle = $derived(isEditing ? 'Edit Task' : 'Create New Task');

	// Form state
	let formData = $state({
		title: task?.title || initialValues.title || '',
		description: task?.description || initialValues.description || '',
		assignees: task?.assigneeId
			? [`user:${task.assigneeId}`]
			: initialValues.assigneeId
				? [`user:${initialValues.assigneeId}`]
				: ([] as string[]),
		taskTypeId: task?.taskTypeId || initialValues.taskTypeId || '',
		status: task?.status || initialValues.status || ('TODO' as TaskStatus),
		priority: task?.priority || initialValues.priority || ('MEDIUM' as TaskPriority),
		dueDate: task?.dueDate
			? format(new Date(task.dueDate), 'yyyy-MM-dd')
			: initialValues.dueDate
				? format(new Date(initialValues.dueDate), 'yyyy-MM-dd')
				: '',
		parentTaskId: task?.parentTaskId || initialValues.parentTaskId || '',
		reminderTime: '60', // Default 60 minutes before due date (string for Select compatibility)
		requiresManualReassignment:
			task?.requiresManualReassignment || initialValues.requiresManualReassignment || false
	});

	// Search state for dropdowns
	let parentTaskSearchTerm = $state('');

	// Validation state
	let validationErrors = $state<string[]>([]);
	let fieldErrors = $state<Record<string, string>>({});

	// Combined assignee options for TagInput (both users and departments)
	const combinedAssigneeOptions = $derived.by(() => {
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
	const isValid = $derived.by(() => {
		// Required fields
		if (!formData.title.trim()) return false;
		if (!formData.assignees || formData.assignees.length === 0) return false;
		if (!formData.taskTypeId) return false;

		// No validation errors
		return validationErrors.length === 0;
	});

	// Status options
	const statusOptions = [
		{ value: 'TODO', label: 'To Do' },
		{ value: 'IN_PROGRESS', label: 'In Progress' },
		{ value: 'BLOCKED', label: 'Blocked' },
		{ value: 'REVIEW', label: 'Review' },
		{ value: 'DONE', label: 'Done' },
		{ value: 'CANCELLED', label: 'Cancelled' }
	];

	// Priority options with colors
	const priorityOptions = [
		{ value: 'LOW', label: 'Low', color: 'text-gray-600' },
		{ value: 'MEDIUM', label: 'Medium', color: 'text-blue-600' },
		{ value: 'HIGH', label: 'High', color: 'text-orange-600' },
		{ value: 'URGENT', label: 'Urgent', color: 'text-red-600' }
	];

	// Reminder time options (in minutes)
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
	const filteredParentTasks = $derived.by(() => {
		if (!formData.assignees || formData.assignees.length === 0) {
			return parentTasks;
		}

		const selectedIds = formData.assignees.map((assignee) =>
			assignee.replace(/^(user:|dept:)/, '')
		);

		return parentTasks.filter((task) => {
			if (!task.assigneeId) return true;
			return selectedIds.includes(task.assigneeId);
		});
	});

	const parentTaskOptions = $derived([
		{ value: '', label: 'None (Top-level task)' },
		...filteredParentTasks.map((parentTask) => ({
			value: parentTask.id,
			label: parentTask.title
		}))
	]);

	// Filtered parent task options based on search
	const filteredParentTaskOptions = $derived.by(() => {
		if (!parentTaskSearchTerm.trim()) return parentTaskOptions;
		const searchLower = parentTaskSearchTerm.toLowerCase();
		return parentTaskOptions.filter((task) => task.label.toLowerCase().includes(searchLower));
	});

	// Selected values for Select components
	const selectedParentTask = $derived(
		parentTaskOptions.find((opt) => opt.value === formData.parentTaskId)
	);

	const selectedStatus = $derived(statusOptions.find((opt) => opt.value === formData.status));

	const selectedPriority = $derived(priorityOptions.find((opt) => opt.value === formData.priority));

	const selectedReminderTime = $derived(
		reminderTimeOptions.find((opt) => opt.value === formData.reminderTime)
	);

	// Clear parent task selection if it's no longer valid
	$effect(() => {
		if (formData.parentTaskId && formData.assignees && formData.assignees.length > 0) {
			const isParentTaskStillValid = filteredParentTasks.some(
				(task) => task.id === formData.parentTaskId
			);

			if (!isParentTaskStillValid) {
				logger.info(
					'[TaskForm] Parent task no longer valid for selected assignees, clearing selection'
				);
				formData.parentTaskId = '';
			}
		}
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

	function handleClientSideValidation(e: Event) {
		if (!isValid) {
			e.preventDefault();
			return false;
		}

		if (onSubmit) {
			e.preventDefault();

			const firstAssignee = formData.assignees[0];
			const assigneeId = firstAssignee ? firstAssignee.replace(/^(user:|dept:)/, '') : '';

			if (isEditing && task) {
				const updateData: UpdateTaskInput = {
					title: formData.title,
					description: formData.description || undefined,
					assigneeId,
					taskTypeId: formData.taskTypeId,
					status: formData.status,
					priority: formData.priority,
					dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
					parentTaskId: formData.parentTaskId || undefined,
					requiresManualReassignment: formData.requiresManualReassignment
				};
				onSubmit(updateData).catch((error) => {
					logger.error('Task update failed', error as Error);
				});
			} else {
				const createData: CreateTaskInput = {
					title: formData.title,
					description: formData.description || undefined,
					assigneeId,
					taskTypeId: formData.taskTypeId,
					status: formData.status,
					priority: formData.priority,
					dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
					parentTaskId: formData.parentTaskId || undefined,
					requiresManualReassignment: formData.requiresManualReassignment
				};
				onSubmit(createData).catch((error) => {
					logger.error('Task creation failed', error as Error);
				});
			}

			return false;
		}

		return true;
	}

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
		<TaskBasicInfo
			bind:title={formData.title}
			bind:description={formData.description}
			{fieldErrors}
		/>

		<TaskAssignment
			bind:assignees={formData.assignees}
			bind:taskTypeId={formData.taskTypeId}
			bind:parentTaskId={formData.parentTaskId}
			{combinedAssigneeOptions}
			{availableUsers}
			{departments}
			{taskTypes}
			{parentTaskOptions}
			{filteredParentTaskOptions}
			{selectedParentTask}
			bind:parentTaskSearchTerm
			filteredParentTasksCount={filteredParentTasks.length}
			totalParentTasksCount={parentTasks.length}
			{loading}
			{fieldErrors}
		/>

		<TaskStatusPriority
			bind:status={formData.status}
			bind:priority={formData.priority}
			{selectedStatus}
			{selectedPriority}
			{statusOptions}
			{priorityOptions}
		/>

		<TaskScheduling
			bind:dueDate={formData.dueDate}
			bind:reminderTime={formData.reminderTime}
			{selectedReminderTime}
			{reminderTimeOptions}
			{fieldErrors}
		/>

		<TaskAdvancedOptions bind:requiresManualReassignment={formData.requiresManualReassignment} />

		<!-- Form Actions -->
		<div class="flex items-center justify-between border-t pt-6">
			<Button type="button" variant="ghost" onclick={handleReset} disabled={loading}>Reset</Button>

			<div class="flex items-center gap-3">
				<Button type="button" variant="outline" onclick={onCancel} disabled={loading}>
					Cancel
				</Button>

				<Button type="submit" disabled={!isValid || loading} class="min-w-32">
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
