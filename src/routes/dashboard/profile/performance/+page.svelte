<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import {
		AlertTriangle,
		Calendar,
		CheckCircle,
		Circle,
		Clock,
		Edit,
		Plus,
		Star,
		Target,
		Trash2,
		TrendingUp,
		User,
		XCircle
	} from '@lucide/svelte';
	import { format, parseISO } from 'date-fns';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	const { data } = $props();

	// Svelte 5 runes - use $derived for reactive data
	const user = $derived(data.user);
	const userId = $derived(data.userId);
	const goals = $derived(data.goals);
	const goalCategories = $derived(data.goalCategories);
	const goalStats = $derived(data.goalStats);
	const currentQuarter = $derived(data.currentQuarter);
	const canManageGoals = $derived(data.canManageGoals);
	const isOwnGoals = $derived(data.isOwnGoals);

	let showNewGoalForm = $state(false);
	let selectedCategory = $state('all');
	let selectedStatus = $state('all');
	let newGoal = $state({
		title: '',
		description: '',
		targetDate: data.currentQuarter.end
	});
	let isSubmitting = $state(false);
	let submitError = $state<string | null>(null);

	// Goal details modal state
	let showGoalDetails = $state(false);
	let selectedGoal = $state<any>(null);
	let isEditMode = $state(false);
	let editedGoal = $state<any>(null);
	let isDeleting = $state(false);
	let showDeleteConfirm = $state(false);

	// Filter goals based on selected filters
	const filteredGoals = $derived(
		goals.filter((goal) => {
			// Category filtering temporarily disabled - not yet supported in Rust backend
			const statusMatch = selectedStatus === 'all' || goal.status === selectedStatus;
			return statusMatch;
		})
	);

	function getStatusIcon(status: string) {
		switch (status) {
			case 'completed':
				return CheckCircle;
			case 'in_progress':
				return Clock;
			case 'at_risk':
				return AlertTriangle;
			case 'blocked':
				return XCircle;
			case 'not_started':
				return Circle;
			default:
				return Circle;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed':
				return 'text-green-600 bg-green-50 border-green-200';
			case 'in_progress':
				return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'at_risk':
				return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'blocked':
				return 'text-red-600 bg-red-50 border-red-200';
			case 'not_started':
				return 'text-muted-foreground bg-muted dark:bg-muted border';
			default:
				return 'text-muted-foreground bg-muted dark:bg-muted border';
		}
	}

	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'high':
				return 'bg-red-100 text-red-800';
			case 'medium':
				return 'bg-yellow-100 text-yellow-800';
			case 'low':
				return 'bg-green-100 text-green-800';
			default:
				return 'bg-gray-100 text-foreground';
		}
	}

	function getCategoryColor(color: string) {
		switch (color) {
			case 'blue':
				return 'bg-blue-100 text-blue-800';
			case 'green':
				return 'bg-green-100 text-green-800';
			case 'purple':
				return 'bg-purple-100 text-purple-800';
			case 'orange':
				return 'bg-orange-100 text-orange-800';
			case 'pink':
				return 'bg-pink-100 text-pink-800';
			default:
				return 'bg-gray-100 text-foreground';
		}
	}

	function formatDate(dateString: string | null | undefined) {
		if (!dateString) return 'No date set';
		try {
			return format(parseISO(dateString), 'MMM dd, yyyy');
		} catch (error) {
			console.error('Error formatting date:', dateString, error);
			return 'Invalid date';
		}
	}

	function getProgressColor(progress: number) {
		if (progress >= 80) return 'bg-green-500';
		if (progress >= 60) return 'bg-blue-500';
		if (progress >= 40) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	async function handleSubmitGoal(event: SubmitEvent) {
		event.preventDefault();
		isSubmitting = true;
		submitError = null;

		console.log('[snapshot] Creating new goal:', $state.snapshot(newGoal));

		try {
			// Call server-side API to create goal
			// Convert date to ISO 8601 timestamp (YYYY-MM-DDTHH:mm:ss.sssZ)
			const targetDateTime = newGoal.targetDate ? new Date(newGoal.targetDate + 'T23:59:59.999Z').toISOString() : null;

			const response = await fetch('/api/goals/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					employeeId: userId,
					title: newGoal.title,
					description: newGoal.description,
					targetDate: targetDateTime,
					status: 'NOT_STARTED',
					progressPercentage: 0
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to create goal');
			}

			// Success - reload data and reset form
			await invalidateAll();
			showNewGoalForm = false;
			newGoal = {
				title: '',
				description: '',
				targetDate: data.currentQuarter.end
			};
		} catch (error) {
			console.error('[Frontend] Error creating goal:', error);
			if (error instanceof Error) {
				submitError = error.message;
			} else {
				submitError = 'Failed to create goal';
			}
		} finally {
			isSubmitting = false;
		}
	}

	function openGoalDetails(goal: any) {
		selectedGoal = goal;
		editedGoal = { ...goal };
		isEditMode = false;
		showGoalDetails = true;
	}

	function startEdit() {
		isEditMode = true;
	}

	function cancelEdit() {
		editedGoal = { ...selectedGoal };
		isEditMode = false;
	}

	async function saveGoalChanges() {
		if (!editedGoal || !selectedGoal) return;

		isSubmitting = true;
		submitError = null;

		try {
			const targetDateTime = editedGoal.targetDate
				? new Date(editedGoal.targetDate).toISOString()
				: null;

			// Convert status from lowercase to GraphQL enum format (UPPERCASE)
			const statusEnum = editedGoal.status?.toUpperCase() || null;

			const response = await fetch(`/api/goals/${selectedGoal.id}/update`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: editedGoal.title,
					description: editedGoal.description,
					targetDate: targetDateTime,
					status: statusEnum,
					progressPercentage: editedGoal.progressPercentage
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to update goal');
			}

			// Success - reload data and exit edit mode
			await invalidateAll();
			isEditMode = false;
			showGoalDetails = false;
			selectedGoal = null;
		} catch (error) {
			console.error('[Frontend] Error updating goal:', error);
			submitError = error instanceof Error ? error.message : 'Failed to update goal';
		} finally {
			isSubmitting = false;
		}
	}

	async function deleteGoal() {
		if (!selectedGoal) return;

		isDeleting = true;

		try {
			const response = await fetch(`/api/goals/${selectedGoal.id}/delete`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'Failed to delete goal');
			}

			// Success - reload data and close modal
			await invalidateAll();
			showGoalDetails = false;
			showDeleteConfirm = false;
			selectedGoal = null;
		} catch (error) {
			console.error('[Frontend] Error deleting goal:', error);
			submitError = error instanceof Error ? error.message : 'Failed to delete goal';
		} finally {
			isDeleting = false;
		}
	}

	async function handleUpdateProgress(goalId: string, newProgress: number) {
		// TODO: Implement goal progress update
		console.log('Updating goal progress:', goalId, newProgress);
	}
</script>

<svelte:head>
	<title>{isOwnGoals ? 'My Goals' : `${user?.displayName} - Goals`} | MountainHR</title>
</svelte:head>

<div class="container mx-auto space-y-6 p-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
				<Target class="h-6 w-6 text-purple-600" />
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground">
					{isOwnGoals ? 'My Goals' : `${user?.displayName} - Goals`}
				</h1>
				<p class="text-muted-foreground">
					{user?.departmentByDepartmentId?.name || 'No Department'} • {user?.role} • {currentQuarter.name}
				</p>
			</div>
		</div>

		{#if isOwnGoals}
			<button
				onclick={() => (showNewGoalForm = true)}
				class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				<Plus class="h-4 w-4" />
				New Goal
			</button>
		{/if}
	</div>

	<!-- Goal Statistics -->
	<div
		class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
		data-testid="hr-performance-stats"
	>
		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Goals</p>
					<p class="text-2xl font-bold text-foreground">{goalStats.total}</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
					<Target class="h-6 w-6 text-purple-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Completed</p>
					<p class="text-2xl font-bold text-green-600">{goalStats.completed}</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
					<CheckCircle class="h-6 w-6 text-green-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">In Progress</p>
					<p class="text-2xl font-bold text-blue-600">{goalStats.inProgress}</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
					<Clock class="h-6 w-6 text-blue-600" />
				</div>
			</div>
		</div>

		<div class="rounded-lg border bg-card p-6 shadow-sm">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Avg. Progress</p>
					<p class="text-2xl font-bold text-foreground">{goalStats.averageProgress}%</p>
				</div>
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
					<TrendingUp class="h-6 w-6 text-orange-600" />
				</div>
			</div>
		</div>
	</div>

	<!-- Filters -->
	<div class="rounded-lg border bg-card p-4 shadow-sm">
		<div class="flex flex-wrap gap-4">
			<!-- Category filter temporarily disabled - not yet supported in Rust backend -->

			<div>
				<label for="status-filter" class="mb-1 block text-sm font-medium text-foreground">
					Status
				</label>
				<select
					id="status-filter"
					bind:value={selectedStatus}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				>
					<option value="all">All Statuses</option>
					<option value="not_started">Not Started</option>
					<option value="in_progress">In Progress</option>
					<option value="completed">Completed</option>
					<option value="at_risk">At Risk</option>
					<option value="blocked">Blocked</option>
				</select>
			</div>
		</div>
	</div>

	<!-- New Goal Form Modal -->
	{#if showNewGoalForm}
		<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
			<div class="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
				<h2 class="mb-4 text-lg font-semibold text-foreground">Create New Goal</h2>
				<form onsubmit={handleSubmitGoal} class="space-y-4">
					<div>
						<label for="goalTitle" class="mb-1 block text-sm font-medium text-foreground">
							Goal Title
						</label>
						<input
							id="goalTitle"
							type="text"
							bind:value={newGoal.title}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							placeholder="Enter goal title..."
						/>
					</div>

					<div>
						<label for="goalDescription" class="mb-1 block text-sm font-medium text-foreground">
							Description
						</label>
						<textarea
							id="goalDescription"
							bind:value={newGoal.description}
							rows="3"
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							placeholder="Describe your goal and how you plan to achieve it..."
						></textarea>
					</div>

					<!-- Category and Priority fields temporarily removed - not yet supported in Rust GraphQL backend -->

					<div>
						<label for="goalTargetDate" class="mb-1 block text-sm font-medium text-foreground">
							Target Date
						</label>
						<input
							id="goalTargetDate"
							type="date"
							bind:value={newGoal.targetDate}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						/>
					</div>

					{#if submitError}
						<div class="rounded-md bg-red-50 p-3 text-sm text-red-800">
							{submitError}
						</div>
					{/if}

					<div class="flex justify-end gap-3 pt-4">
						<button
							type="button"
							onclick={() => (showNewGoalForm = false)}
							disabled={isSubmitting}
							class="px-4 py-2 text-sm font-medium text-foreground hover:text-foreground disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isSubmitting}
							class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
						>
							{isSubmitting ? 'Creating...' : 'Create Goal'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Goals Grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2" data-testid="hr-performance-tab">
		{#each filteredGoals as goal}
			{@const StatusIcon = getStatusIcon(goal.status)}
			<div
				class="rounded-lg border bg-card p-6 shadow-sm cursor-pointer transition-shadow hover:shadow-md"
				onclick={() => openGoalDetails(goal)}
				role="button"
				tabindex="0"
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						openGoalDetails(goal);
					}
				}}
			>
				<!-- Goal Header -->
				<div class="mb-4 flex items-start justify-between">
					<div class="flex-1">
						<div class="mb-2 flex items-center gap-2">
							<h3 class="text-lg font-semibold text-foreground">{goal.title}</h3>
							<span
								class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getPriorityColor(
									goal.priority
								)}"
							>
								{goal.priority}
							</span>
						</div>
						<p class="mb-3 text-sm text-muted-foreground">{goal.description}</p>
					</div>
				</div>

				<!-- Goal Metadata -->
				<div class="mb-4 flex items-center gap-4">
					<!-- Category temporarily disabled - not yet supported in Rust backend -->
					<span
						class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium {getStatusColor(
							goal.status
						)}"
					>
						<StatusIcon class="h-3 w-3" />
						{goal.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
					</span>
				</div>

				<!-- Progress Bar -->
				<div class="mb-4">
					<div class="mb-1 flex items-center justify-between text-sm text-muted-foreground">
						<span>Progress</span>
						<span>{goal.progressPercentage || 0}%</span>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-200">
						<div
							class="h-2 rounded-full transition-all duration-300 {getProgressColor(goal.progressPercentage || 0)}"
							style="width: {goal.progressPercentage || 0}%"
						></div>
					</div>
				</div>

				<!-- Key Results -->
				{#if goal.keyResults && goal.keyResults.length > 0}
					<div class="mb-4">
						<h4 class="mb-2 text-sm font-medium text-foreground">Key Results</h4>
						<div class="space-y-2">
							{#each goal.keyResults as kr}
								<div class="text-xs text-muted-foreground">
									<div class="flex items-center justify-between">
										<span>{kr.description}</span>
										<span>{kr.current}/{kr.target} {kr.unit}</span>
									</div>
									<div class="mt-1 h-1 w-full rounded-full bg-gray-200">
										<div
											class="h-1 rounded-full bg-purple-500"
											style="width: {Math.min((kr.current / kr.target) * 100, 100)}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Goal Footer -->
				<div class="flex items-center justify-between text-xs text-muted-foreground">
					<div class="flex items-center gap-2">
						<Calendar class="h-3 w-3" />
						<span>Due: {formatDate(goal.targetDate)}</span>
					</div>
					<span>Updated: {formatDate(goal.updatedAt)}</span>
				</div>

				{#if goal.assignedBy}
					<div class="mt-2 text-xs text-muted-foreground">
						<div class="flex items-center gap-1">
							<User class="h-3 w-3" />
							<span>Assigned by: {goal.assignedBy.displayName}</span>
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<div class="col-span-full">
				<div class="rounded-lg bg-card p-8 shadow-sm border text-center">
					<Target class="h-12 w-12 text-muted-foreground mx-auto mb-4" />
					<h3 class="text-lg font-medium text-foreground mb-2">No goals found</h3>
					<p class="text-muted-foreground mb-4">
						{selectedStatus !== 'all'
							? 'No goals match your current filters.'
							: isOwnGoals
								? 'Create your first goal to get started!'
								: 'This user has no goals set yet.'}
					</p>
					{#if isOwnGoals && selectedStatus === 'all'}
						<button
							onclick={() => (showNewGoalForm = true)}
							class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							<Plus class="h-4 w-4" />
							Create Your First Goal
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Goal Details Modal -->
{#if selectedGoal}
	<Dialog.Root bind:open={showGoalDetails}>
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
				<Dialog.Header>
					<Dialog.Title>
						{isEditMode ? 'Edit Goal' : 'Goal Details'}
					</Dialog.Title>
					<Dialog.Description>
						{isEditMode
							? 'Update goal information below'
							: 'View and manage goal details'}
					</Dialog.Description>
				</Dialog.Header>

				<div class="space-y-6 py-4">
					{#if submitError}
						<div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
							{submitError}
						</div>
					{/if}

					{#if isEditMode}
						<!-- Edit Mode Form -->
						<div class="space-y-4">
							<div>
								<label for="edit-title" class="block text-sm font-medium text-foreground mb-1">
									Title
								</label>
								<input
									id="edit-title"
									type="text"
									bind:value={editedGoal.title}
									class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									required
								/>
							</div>

							<div>
								<label
									for="edit-description"
									class="block text-sm font-medium text-foreground mb-1"
								>
									Description
								</label>
								<textarea
									id="edit-description"
									bind:value={editedGoal.description}
									rows="4"
									class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
								></textarea>
							</div>

							<div class="grid grid-cols-2 gap-4">
								<div>
									<label
										for="edit-target-date"
										class="block text-sm font-medium text-foreground mb-1"
									>
										Target Date
									</label>
									<input
										id="edit-target-date"
										type="date"
										bind:value={editedGoal.targetDate}
										class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									/>
								</div>

								<div>
									<label for="edit-status" class="block text-sm font-medium text-foreground mb-1">
										Status
									</label>
									<select
										id="edit-status"
										bind:value={editedGoal.status}
										class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										<option value="not_started">Not Started</option>
										<option value="in_progress">In Progress</option>
										<option value="completed">Completed</option>
										<option value="cancelled">Cancelled</option>
									</select>
								</div>
							</div>

							<div>
								<label
									for="edit-progress"
									class="block text-sm font-medium text-foreground mb-1"
								>
									Progress: {editedGoal.progressPercentage}%
								</label>
								<input
									id="edit-progress"
									type="range"
									min="0"
									max="100"
									bind:value={editedGoal.progressPercentage}
									class="w-full"
								/>
							</div>
						</div>
					{:else}
						<!-- View Mode -->
						{@const StatusIcon = getStatusIcon(selectedGoal.status)}
						<div class="space-y-4">
							<div>
								<h4 class="text-sm font-medium text-muted-foreground mb-1">Title</h4>
								<p class="text-foreground">{selectedGoal.title}</p>
							</div>

							{#if selectedGoal.description}
								<div>
									<h4 class="text-sm font-medium text-muted-foreground mb-1">Description</h4>
									<p class="text-foreground">{selectedGoal.description}</p>
								</div>
							{/if}

							<div class="grid grid-cols-2 gap-4">
								<div>
									<h4 class="text-sm font-medium text-muted-foreground mb-1">Status</h4>
									<span
										class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium {getStatusColor(
											selectedGoal.status
										)}"
									>
										<StatusIcon class="h-3 w-3" />
										{selectedGoal.status.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
									</span>
								</div>

								<div>
									<h4 class="text-sm font-medium text-muted-foreground mb-1">Target Date</h4>
									<p class="text-foreground">{formatDate(selectedGoal.targetDate)}</p>
								</div>
							</div>

							<div>
								<h4 class="text-sm font-medium text-muted-foreground mb-2">
									Progress: {selectedGoal.progressPercentage}%
								</h4>
								<div class="h-2 overflow-hidden rounded-full bg-secondary">
									<div
										class="h-full {getProgressColor(selectedGoal.progressPercentage)} transition-all"
										style="width: {selectedGoal.progressPercentage}%"
									></div>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-4 pt-2 border-t text-sm text-muted-foreground">
								<div>
									<span class="font-medium">Created:</span>
									{formatDate(selectedGoal.createdAt)}
								</div>
								<div>
									<span class="font-medium">Updated:</span>
									{formatDate(selectedGoal.updatedAt)}
								</div>
							</div>
						</div>
					{/if}
				</div>

				<Dialog.Footer>
					<div class="flex items-center justify-between w-full">
						<div>
							{#if !isEditMode}
								<button
									onclick={() => {
										showDeleteConfirm = true;
									}}
									class="inline-flex items-center gap-2 rounded-md border border-destructive px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground"
								>
									<Trash2 class="h-4 w-4" />
									Delete
								</button>
							{/if}
						</div>

						<div class="flex items-center gap-2">
							{#if isEditMode}
								<button
									onclick={cancelEdit}
									disabled={isSubmitting}
									class="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
								>
									Cancel
								</button>
								<button
									onclick={saveGoalChanges}
									disabled={isSubmitting}
									class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
								>
									{isSubmitting ? 'Saving...' : 'Save Changes'}
								</button>
							{:else}
								<Dialog.Close
									class="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
								>
									Close
								</Dialog.Close>
								<button
									onclick={startEdit}
									class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
								>
									<Edit class="h-4 w-4" />
									Edit Goal
								</button>
							{/if}
						</div>
					</div>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>
{/if}

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDeleteConfirm}>
	<AlertDialog.Portal>
		<AlertDialog.Overlay />
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete Goal?</AlertDialog.Title>
				<AlertDialog.Description>
					Are you sure you want to delete "{selectedGoal?.title}"? This action cannot be undone.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel
					disabled={isDeleting}
					class="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
				>
					Cancel
				</AlertDialog.Cancel>
				<button
					onclick={deleteGoal}
					disabled={isDeleting}
					class="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
				>
					{isDeleting ? 'Deleting...' : 'Delete Goal'}
				</button>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Portal>
</AlertDialog.Root>
