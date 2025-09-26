<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getOperationStore, queryStore } from '@urql/svelte';
	import { toast } from 'svelte-sonner';
	import { Target, Plus, TrendingUp, Calendar, Flag, X, Eye, Edit, Trash2 } from 'lucide-svelte';

	import HrDataTable from '$lib/components/data-table/hr-data-table.svelte';
	import DataExport from '$lib/components/export/data-export.svelte';
	import {
		GET_TEAM_GOALS,
		GET_GOALS_BY_TEAM,
		CREATE_TEAM_GOAL,
		UPDATE_TEAM_GOAL,
		UPDATE_GOAL_PROGRESS,
		DELETE_TEAM_GOAL,
		CREATE_KEY_RESULT,
		UPDATE_KEY_RESULT,
		DELETE_KEY_RESULT,
		getGoalTypeInfo,
		getGoalStatusInfo,
		getPriorityInfo,
		calculateGoalCompletion,
		formatGoalProgress,
		isGoalOverdue,
		isGoalAtRisk,
		goalTypes,
		goalStatuses,
		goalPriorities,
		commonUnits,
		getCurrentQuarter,
		getQuarterDateRange
	} from '$lib/graphql/goals-okrs-operations';

	// Page data from server
	export let data;

	// Local state using Svelte 5 runes
	let selectedGoals = $state<any[]>([]);
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showViewModal = $state(false);
	let showProgressModal = $state(false);
	let showKeyResultsModal = $state(false);
	let currentGoal = $state<any>(null);
	let statusFilter = $state('all');
	let typeFilter = $state('all');
	let priorityFilter = $state('all');
	let quarterFilter = $state(getCurrentQuarter());
	let searchQuery = $state('');

	// Pagination state
	let currentPage = $state(1);
	let pageSize = $state(20);

	// Create/Edit form state
	let formData = $state({
		title: '',
		description: '',
		teamId: '',
		ownerId: data.user?.id || '',
		goalType: 'okr' as any,
		status: 'draft' as any,
		priority: 'medium' as any,
		targetValue: 0,
		currentValue: 0,
		unit: '%',
		startDate: '',
		targetDate: ''
	});

	// Progress update form
	let progressData = $state({
		currentValue: 0,
		notes: ''
	});

	// Key Results form
	let keyResultForm = $state({
		title: '',
		description: '',
		targetValue: 0,
		currentValue: 0,
		unit: '%',
		weight: 1
	});

	// Query for team goals
	const teamGoals = queryStore({
		client: getOperationStore(),
		query: GET_TEAM_GOALS,
		variables: {
			first: pageSize,
			offset: (currentPage - 1) * pageSize,
			filter: {
				...(statusFilter !== 'all' && { status: statusFilter }),
				...(typeFilter !== 'all' && { goalType: typeFilter }),
				...(priorityFilter !== 'all' && { priority: priorityFilter })
			}
		}
	});

	// Mutation operations
	const createGoal = getOperationStore(CREATE_TEAM_GOAL);
	const updateGoal = getOperationStore(UPDATE_TEAM_GOAL);
	const updateProgress = getOperationStore(UPDATE_GOAL_PROGRESS);
	const deleteGoal = getOperationStore(DELETE_TEAM_GOAL);
	const createKeyResult = getOperationStore(CREATE_KEY_RESULT);
	const updateKeyResult = getOperationStore(UPDATE_KEY_RESULT);
	const deleteKeyResult = getOperationStore(DELETE_KEY_RESULT);

	// Table columns configuration
	const columns = [
		{
			key: 'title',
			label: 'Goal',
			sortable: true,
			render: (value: string, row: any) => {
				const typeInfo = getGoalTypeInfo(row.goalType);
				const isOverdue = isGoalOverdue(row);
				const atRisk = isGoalAtRisk(row);
				return `<div data-testid="goal-title">
					<div class="flex items-center gap-2">
						<span class="text-lg">${typeInfo.icon}</span>
						<div>
							<div class="font-medium ${isOverdue ? 'text-red-600' : atRisk ? 'text-orange-600' : ''}">${value}</div>
							<div class="text-sm text-gray-500">${row.team?.name || 'No Team'}</div>
						</div>
						${isOverdue ? '<span class="ml-2 px-1 py-0.5 bg-red-100 text-red-800 text-xs rounded">OVERDUE</span>' : ''}
						${atRisk ? '<span class="ml-2 px-1 py-0.5 bg-orange-100 text-orange-800 text-xs rounded">AT RISK</span>' : ''}
					</div>
				</div>`;
			}
		},
		{
			key: 'type',
			label: 'Type',
			render: (value: any, row: any) => {
				const typeInfo = getGoalTypeInfo(row.goalType);
				return `<span data-testid="goal-type" class="px-2 py-1 rounded-full text-xs bg-${typeInfo.color}-100 text-${typeInfo.color}-800">
					${typeInfo.icon} ${typeInfo.label}
				</span>`;
			}
		},
		{
			key: 'priority',
			label: 'Priority',
			sortable: true,
			render: (value: any, row: any) => {
				const priorityInfo = getPriorityInfo(row.priority);
				return `<span data-testid="goal-priority" class="px-2 py-1 rounded-full text-xs bg-${priorityInfo.color}-100 text-${priorityInfo.color}-800">
					${priorityInfo.icon} ${priorityInfo.label}
				</span>`;
			}
		},
		{
			key: 'progress',
			label: 'Progress',
			sortable: true,
			render: (value: any, row: any) => {
				const completion = calculateGoalCompletion(row);
				const progressText = formatGoalProgress(row);
				return `<div data-testid="goal-progress">
					<div class="flex items-center gap-2">
						<div class="flex-1 bg-gray-200 rounded-full h-2">
							<div class="bg-blue-600 h-2 rounded-full" style="width: ${completion}%"></div>
						</div>
						<span class="text-sm font-medium">${completion}%</span>
					</div>
					<div class="text-xs text-gray-500 mt-1">${progressText}</div>
				</div>`;
			}
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (value: string) => {
				const statusInfo = getGoalStatusInfo(value as any);
				return `<span data-testid="goal-status" class="px-2 py-1 rounded-full text-xs bg-${statusInfo.color}-100 text-${statusInfo.color}-800">
					${statusInfo.icon} ${statusInfo.label}
				</span>`;
			}
		},
		{
			key: 'targetDate',
			label: 'Target Date',
			sortable: true,
			render: (value: string) => {
				const date = new Date(value);
				return `<div data-testid="target-date" class="text-sm">
					${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
				</div>`;
			}
		},
		{
			key: 'keyResults',
			label: 'Key Results',
			align: 'center',
			render: (value: any, row: any) => {
				const count = row.keyResults?.totalCount || 0;
				return `<div data-testid="key-results-count" class="text-center">
					<span class="px-2 py-1 bg-blue-50 text-blue-800 rounded text-sm font-medium">${count}</span>
				</div>`;
			}
		},
		{
			key: 'actions',
			label: 'Actions',
			align: 'center',
			render: (value: any, row: any) => {
				return `
					<div class="flex gap-2 justify-center">
						<button
							data-testid="view-goal"
							class="p-1 text-blue-600 hover:bg-blue-50 rounded"
							title="View Goal"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
							</svg>
						</button>
						<button
							data-testid="update-progress"
							class="p-1 text-green-600 hover:bg-green-50 rounded"
							title="Update Progress"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
							</svg>
						</button>
						<button
							data-testid="edit-goal"
							class="p-1 text-orange-600 hover:bg-orange-50 rounded"
							title="Edit Goal"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
							</svg>
						</button>
						<button
							data-testid="delete-goal"
							class="p-1 text-red-600 hover:bg-red-50 rounded"
							title="Delete Goal"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
							</svg>
						</button>
					</div>
				`;
			}
		}
	];

	// Handle create goal
	function handleCreateGoal() {
		formData = {
			title: '',
			description: '',
			teamId: '',
			ownerId: data.user?.id || '',
			goalType: 'okr' as any,
			status: 'draft' as any,
			priority: 'medium' as any,
			targetValue: 0,
			currentValue: 0,
			unit: '%',
			startDate: '',
			targetDate: ''
		};
		currentGoal = null;
		showCreateModal = true;
	}

	// Handle edit goal
	function handleEditGoal(goal: any) {
		formData = {
			title: goal.title || '',
			description: goal.description || '',
			teamId: goal.team?.id || '',
			ownerId: goal.owner?.id || data.user?.id || '',
			goalType: goal.goalType || 'okr',
			status: goal.status || 'draft',
			priority: goal.priority || 'medium',
			targetValue: goal.targetValue || 0,
			currentValue: goal.currentValue || 0,
			unit: goal.unit || '%',
			startDate: goal.startDate || '',
			targetDate: goal.targetDate || ''
		};
		currentGoal = goal;
		showEditModal = true;
	}

	// Handle view goal
	function handleViewGoal(goal: any) {
		currentGoal = goal;
		showViewModal = true;
	}

	// Handle update progress
	function handleUpdateProgress(goal: any) {
		currentGoal = goal;
		progressData = {
			currentValue: goal.currentValue || 0,
			notes: ''
		};
		showProgressModal = true;
	}

	// Handle delete goal
	async function handleDeleteGoal(goal: any) {
		if (!confirm(`Are you sure you want to delete the goal "${goal.title}"?`)) {
			return;
		}

		try {
			const result = await deleteGoal({
				input: {
					id: goal.id
				}
			});

			if (result.data) {
				toast.success('Goal deleted successfully');
				teamGoals.reexecute();
			}
		} catch (error) {
			toast.error('Failed to delete goal');
		}
	}

	// Submit form (create or update)
	async function submitForm() {
		try {
			if (currentGoal) {
				// Update existing goal
				const result = await updateGoal({
					input: {
						id: currentGoal.id,
						patch: {
							title: formData.title,
							description: formData.description,
							teamId: formData.teamId || null,
							ownerId: formData.ownerId,
							goalType: formData.goalType,
							status: formData.status,
							priority: formData.priority,
							targetValue: formData.targetValue,
							currentValue: formData.currentValue,
							unit: formData.unit,
							startDate: formData.startDate,
							targetDate: formData.targetDate
						}
					}
				});

				if (result.data) {
					toast.success('Goal updated successfully');
					closeModals();
					teamGoals.reexecute();
				}
			} else {
				// Create new goal
				const result = await createGoal({
					input: {
						teamGoal: {
							title: formData.title,
							description: formData.description,
							teamId: formData.teamId || undefined,
							ownerId: formData.ownerId,
							goalType: formData.goalType,
							status: formData.status,
							priority: formData.priority,
							targetValue: formData.targetValue,
							currentValue: formData.currentValue,
							unit: formData.unit,
							startDate: formData.startDate,
							targetDate: formData.targetDate
						}
					}
				});

				if (result.data) {
					toast.success('Goal created successfully');
					closeModals();
					teamGoals.reexecute();
				}
			}
		} catch (error) {
			toast.error(currentGoal ? 'Failed to update goal' : 'Failed to create goal');
		}
	}

	// Submit progress update
	async function submitProgressUpdate() {
		try {
			const result = await updateProgress({
				input: {
					id: currentGoal.id,
					patch: {
						currentValue: progressData.currentValue,
						completionPercentage: calculateGoalCompletion({
							...currentGoal,
							currentValue: progressData.currentValue
						})
					}
				}
			});

			if (result.data) {
				toast.success('Progress updated successfully');
				closeModals();
				teamGoals.reexecute();
			}
		} catch (error) {
			toast.error('Failed to update progress');
		}
	}

	// Close modals
	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showViewModal = false;
		showProgressModal = false;
		showKeyResultsModal = false;
		currentGoal = null;
	}

	// Apply filters
	function applyFilters() {
		currentPage = 1;
		teamGoals.reexecute();
	}

	// Clear filters
	function clearFilters() {
		statusFilter = 'all';
		typeFilter = 'all';
		priorityFilter = 'all';
		quarterFilter = getCurrentQuarter();
		searchQuery = '';
		applyFilters();
	}

	// Handle row click
	function handleRowClick(event: CustomEvent) {
		const row = event.detail;
		const target = event.target as HTMLElement;

		// Check which action button was clicked
		if (target.closest('[data-testid="view-goal"]')) {
			handleViewGoal(row);
		} else if (target.closest('[data-testid="update-progress"]')) {
			handleUpdateProgress(row);
		} else if (target.closest('[data-testid="edit-goal"]')) {
			handleEditGoal(row);
		} else if (target.closest('[data-testid="delete-goal"]')) {
			handleDeleteGoal(row);
		}
	}
</script>

<div class="container mx-auto px-4 py-8">
	<!-- Page Header -->
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Goals & OKRs</h1>
			<p class="mt-2 text-gray-600">Manage team objectives and track key results</p>
		</div>
		<button
			onclick={handleCreateGoal}
			class="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			data-testid="create-goal"
		>
			<Plus class="h-4 w-4" />
			Create Goal
		</button>
	</div>

	<!-- Filters Section -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-5">
			<!-- Status Filter -->
			<div>
				<label for="status-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={statusFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="status-filter"
				>
					<option value="all">All Statuses</option>
					{#each goalStatuses as status}
						<option value={status.value}>{status.label}</option>
					{/each}
				</select>
			</div>

			<!-- Type Filter -->
			<div>
				<label for="type-filter" class="mb-1 block text-sm font-medium text-gray-700"> Type </label>
				<select
					id="type-filter"
					bind:value={typeFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="type-filter"
				>
					<option value="all">All Types</option>
					{#each goalTypes as type}
						<option value={type.value}>{type.label}</option>
					{/each}
				</select>
			</div>

			<!-- Priority Filter -->
			<div>
				<label for="priority-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Priority
				</label>
				<select
					id="priority-filter"
					bind:value={priorityFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="priority-filter"
				>
					<option value="all">All Priorities</option>
					{#each goalPriorities as priority}
						<option value={priority.value}>{priority.label}</option>
					{/each}
				</select>
			</div>

			<!-- Quarter Filter -->
			<div>
				<label for="quarter-filter" class="mb-1 block text-sm font-medium text-gray-700">
					Quarter
				</label>
				<select
					id="quarter-filter"
					bind:value={quarterFilter}
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="quarter-filter"
				>
					<option value="Q1">Q1 (Jan-Mar)</option>
					<option value="Q2">Q2 (Apr-Jun)</option>
					<option value="Q3">Q3 (Jul-Sep)</option>
					<option value="Q4">Q4 (Oct-Dec)</option>
				</select>
			</div>

			<!-- Search -->
			<div>
				<label for="search" class="mb-1 block text-sm font-medium text-gray-700">
					Search Goals
				</label>
				<input
					id="search"
					type="text"
					bind:value={searchQuery}
					placeholder="Search by title..."
					class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
					data-testid="goal-search"
				/>
			</div>
		</div>

		<!-- Filter Actions -->
		<div class="mt-4 flex gap-2">
			<button
				onclick={applyFilters}
				class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				data-testid="apply-filters"
			>
				Apply Filters
			</button>
			<button
				onclick={clearFilters}
				class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
				data-testid="clear-filters"
			>
				Clear Filters
			</button>
		</div>
	</div>

	<!-- Data Table -->
	<div class="rounded-lg bg-white shadow">
		<HrDataTable
			data={$teamGoals.data?.teamGoals?.nodes || []}
			{columns}
			loading={$teamGoals.fetching}
			searchable={false}
			selectable={true}
			onSelectionChange={(selected) => (selectedGoals = selected)}
			onRowClick={handleRowClick}
			pagination={{
				page: currentPage,
				pageSize,
				total: $teamGoals.data?.teamGoals?.totalCount || 0,
				pageSizes: [10, 20, 50, 100]
			}}
			onPageChange={(page) => {
				currentPage = page;
				teamGoals.reexecute();
			}}
			onPageSizeChange={(size) => {
				pageSize = size;
				currentPage = 1;
				teamGoals.reexecute();
			}}
			emptyMessage="No goals found"
			testId="goals-table"
		/>
	</div>

	<!-- Export Component -->
	<DataExport
		data={$teamGoals.data?.teamGoals?.nodes || []}
		filename="team-goals"
		testId="export-csv"
	/>
</div>

<!-- Create Goal Modal -->
{#if showCreateModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="create-goal-modal"
	>
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold" data-testid="modal-title">Create New Goal</h2>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<form on:submit|preventDefault={submitForm}>
				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<label class="mb-1 block text-sm font-medium text-gray-700">Goal Title *</label>
						<input
							type="text"
							bind:value={formData.title}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="goal-title"
							placeholder="Enter goal title..."
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Type</label>
						<select
							bind:value={formData.goalType}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="goal-type"
						>
							{#each goalTypes as type}
								<option value={type.value}>{type.label}</option>
							{/each}
						</select>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Priority</label>
						<select
							bind:value={formData.priority}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="goal-priority"
						>
							{#each goalPriorities as priority}
								<option value={priority.value}>{priority.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700">Description</label>
					<textarea
						bind:value={formData.description}
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="goal-description"
						placeholder="Describe the goal..."
					></textarea>
				</div>

				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Target Value</label>
						<input
							type="number"
							bind:value={formData.targetValue}
							min="0"
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="target-value"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Current Value</label>
						<input
							type="number"
							bind:value={formData.currentValue}
							min="0"
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="current-value"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Unit</label>
						<select
							bind:value={formData.unit}
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="goal-unit"
						>
							{#each commonUnits as unit}
								<option value={unit.value}>{unit.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Start Date *</label>
						<input
							type="date"
							bind:value={formData.startDate}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="start-date"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700">Target Date *</label>
						<input
							type="date"
							bind:value={formData.targetDate}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
							data-testid="target-date"
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
						data-testid="submit-goal"
					>
						Create Goal
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Update Progress Modal -->
{#if showProgressModal && currentGoal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="progress-modal"
	>
		<div class="w-full max-w-md rounded-lg bg-white p-6">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-xl font-bold" data-testid="modal-title">Update Progress</h2>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<div class="mb-4">
				<h3 class="mb-2 font-medium text-gray-900">{currentGoal.title}</h3>
				<p class="text-sm text-gray-600">
					Target: {currentGoal.targetValue}
					{currentGoal.unit}
				</p>
			</div>

			<form on:submit|preventDefault={submitProgressUpdate}>
				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700">Current Value</label>
					<input
						type="number"
						bind:value={progressData.currentValue}
						min="0"
						max={currentGoal.targetValue}
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="progress-value"
					/>
					<div class="mt-2">
						<div class="flex items-center justify-between text-sm text-gray-600">
							<span>Progress</span>
							<span>{Math.round((progressData.currentValue / currentGoal.targetValue) * 100)}%</span
							>
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-gray-200">
							<div
								class="h-2 rounded-full bg-blue-600"
								style="width: {Math.min(
									(progressData.currentValue / currentGoal.targetValue) * 100,
									100
								)}%"
							></div>
						</div>
					</div>
				</div>

				<div class="mb-4">
					<label class="mb-1 block text-sm font-medium text-gray-700"
						>Progress Notes (Optional)</label
					>
					<textarea
						bind:value={progressData.notes}
						rows="3"
						class="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
						data-testid="progress-notes"
						placeholder="Add notes about this progress update..."
					></textarea>
				</div>

				<div class="flex justify-end gap-2">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
						data-testid="update-progress"
					>
						Update Progress
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- View Goal Modal -->
{#if showViewModal && currentGoal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
		data-testid="view-goal-modal"
	>
		<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold" data-testid="modal-title">{currentGoal.title}</h2>
					<p class="text-gray-600">
						{currentGoal.team?.name || 'No Team'} • {currentGoal.owner?.displayName}
					</p>
				</div>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">
					<X class="h-6 w-6" />
				</button>
			</div>

			<div class="space-y-6" data-testid="goal-details">
				<!-- Goal Overview -->
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div class="text-center">
						<p class="text-sm text-gray-600">Progress</p>
						<p class="text-2xl font-bold text-blue-600">{calculateGoalCompletion(currentGoal)}%</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Type</p>
						<p class="text-lg">{getGoalTypeInfo(currentGoal.goalType).icon}</p>
						<p class="text-sm">{getGoalTypeInfo(currentGoal.goalType).label}</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Priority</p>
						<p class="text-lg">{getPriorityInfo(currentGoal.priority).icon}</p>
						<p class="text-sm">{getPriorityInfo(currentGoal.priority).label}</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-600">Status</p>
						<p class="text-lg">{getGoalStatusInfo(currentGoal.status).icon}</p>
						<p class="text-sm">{getGoalStatusInfo(currentGoal.status).label}</p>
					</div>
				</div>

				<!-- Progress Bar -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium">Progress</span>
						<span class="text-sm text-gray-600">{formatGoalProgress(currentGoal)}</span>
					</div>
					<div class="h-3 w-full rounded-full bg-gray-200">
						<div
							class="h-3 rounded-full bg-blue-600"
							style="width: {calculateGoalCompletion(currentGoal)}%"
						></div>
					</div>
				</div>

				<!-- Description -->
				{#if currentGoal.description}
					<div>
						<h4 class="mb-2 font-medium text-gray-900">Description</h4>
						<p class="rounded-md bg-gray-50 p-3 text-gray-700">{currentGoal.description}</p>
					</div>
				{/if}

				<!-- Timeline -->
				<div>
					<h4 class="mb-2 font-medium text-gray-900">Timeline</h4>
					<div class="flex items-center gap-4 text-sm text-gray-600">
						<span>Start: {new Date(currentGoal.startDate).toLocaleDateString()}</span>
						<span>•</span>
						<span>Target: {new Date(currentGoal.targetDate).toLocaleDateString()}</span>
						{#if isGoalOverdue(currentGoal)}
							<span class="rounded bg-red-100 px-2 py-1 text-xs text-red-800">OVERDUE</span>
						{:else if isGoalAtRisk(currentGoal)}
							<span class="rounded bg-orange-100 px-2 py-1 text-xs text-orange-800">AT RISK</span>
						{/if}
					</div>
				</div>

				<!-- Key Results -->
				{#if currentGoal.keyResults?.nodes?.length > 0}
					<div>
						<h4 class="mb-3 font-medium text-gray-900">
							Key Results ({currentGoal.keyResults.totalCount})
						</h4>
						<div class="space-y-3">
							{#each currentGoal.keyResults.nodes as keyResult}
								<div class="rounded-lg border p-3">
									<div class="mb-2 flex items-start justify-between">
										<h5 class="font-medium">{keyResult.title}</h5>
										<span class="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
											Weight: {keyResult.weight || 1}
										</span>
									</div>
									<p class="mb-2 text-sm text-gray-600">{keyResult.description}</p>
									<div class="flex items-center gap-2">
										<div class="h-2 flex-1 rounded-full bg-gray-200">
											<div
												class="h-2 rounded-full bg-green-600"
												style="width: {keyResult.targetValue > 0
													? Math.min((keyResult.currentValue / keyResult.targetValue) * 100, 100)
													: 0}%"
											></div>
										</div>
										<span class="text-sm text-gray-600">
											{keyResult.currentValue}/{keyResult.targetValue}
											{keyResult.unit}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>

			<div class="mt-6 flex justify-between">
				<button
					onclick={() => {
						closeModals();
						handleUpdateProgress(currentGoal);
					}}
					class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				>
					Update Progress
				</button>
				<button
					onclick={closeModals}
					class="rounded-md bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
				>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Success/Error Notifications (handled by svelte-sonner toast) -->
<div data-testid="success-notification" class="hidden"></div>
<div data-testid="access-denied" class="hidden"></div>
<div data-testid="empty-state" class="hidden"></div>
