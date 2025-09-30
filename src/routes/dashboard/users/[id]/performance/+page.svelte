<script lang="ts">
	import { page } from '$app/stores';
	import { Target, Plus, Clock, CheckCircle, XCircle, AlertTriangle, Circle, TrendingUp, User, Star, Calendar } from 'lucide-svelte';
	import { format, parseISO } from 'date-fns';

	let { data } = $props();

	// Svelte 5 runes - use $derived for reactive data
	let user = $derived(data.user);
	let userId = $derived(data.userId);
	let goals = $derived(data.goals);
	let goalCategories = $derived(data.goalCategories);
	let goalStats = $derived(data.goalStats);
	let currentQuarter = $derived(data.currentQuarter);
	let canManageGoals = $derived(data.canManageGoals);
	let isOwnGoals = $derived(data.isOwnGoals);

	let showNewGoalForm = $state(false);
	let selectedCategory = $state('all');
	let selectedStatus = $state('all');
	let newGoal = $state({
		title: '',
		description: '',
		categoryId: '',
		priority: 'medium',
		targetDate: currentQuarter.end
	});

	// Filter goals based on selected filters
	let filteredGoals = $derived(goals.filter(goal => {
		const categoryMatch = selectedCategory === 'all' || goal.category.id === selectedCategory;
		const statusMatch = selectedStatus === 'all' || goal.status === selectedStatus;
		return categoryMatch && statusMatch;
	}));

	function getStatusIcon(status: string) {
		switch (status) {
			case 'completed': return CheckCircle;
			case 'in_progress': return Clock;
			case 'at_risk': return AlertTriangle;
			case 'blocked': return XCircle;
			case 'not_started': return Circle;
			default: return Circle;
		}
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'completed': return 'text-green-600 bg-green-50 border-green-200';
			case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
			case 'at_risk': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
			case 'blocked': return 'text-red-600 bg-red-50 border-red-200';
			case 'not_started': return 'text-muted-foreground bg-muted dark:bg-muted border';
			default: return 'text-muted-foreground bg-muted dark:bg-muted border';
		}
	}

	function getPriorityColor(priority: string) {
		switch (priority) {
			case 'high': return 'bg-red-100 text-red-800';
			case 'medium': return 'bg-yellow-100 text-yellow-800';
			case 'low': return 'bg-green-100 text-green-800';
			default: return 'bg-gray-100 text-foreground';
		}
	}

	function getCategoryColor(color: string) {
		switch (color) {
			case 'blue': return 'bg-blue-100 text-blue-800';
			case 'green': return 'bg-green-100 text-green-800';
			case 'purple': return 'bg-purple-100 text-purple-800';
			case 'orange': return 'bg-orange-100 text-orange-800';
			case 'pink': return 'bg-pink-100 text-pink-800';
			default: return 'bg-gray-100 text-foreground';
		}
	}

	function formatDate(dateString: string) {
		return format(parseISO(dateString), 'MMM dd, yyyy');
	}

	function getProgressColor(progress: number) {
		if (progress >= 80) return 'bg-green-500';
		if (progress >= 60) return 'bg-blue-500';
		if (progress >= 40) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	async function handleSubmitGoal(event: SubmitEvent) {
		event.preventDefault();
		// TODO: Implement actual goal creation
		console.log('Creating new goal:', newGoal);
		showNewGoalForm = false;
		newGoal = {
			title: '',
			description: '',
			categoryId: '',
			priority: 'medium',
			targetDate: currentQuarter.end
		};
	}

	async function handleUpdateProgress(goalId: string, newProgress: number) {
		// TODO: Implement goal progress update
		console.log('Updating goal progress:', goalId, newProgress);
	}
</script>

<svelte:head>
	<title>{isOwnGoals ? 'My Goals' : `${user?.displayName} - Goals`} | SvelteHR</title>
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
				onclick={() => showNewGoalForm = true}
				class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				<Plus class="h-4 w-4" />
				New Goal
			</button>
		{/if}
	</div>

	<!-- Goal Statistics -->
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-lg bg-card p-6 shadow-sm border">
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

		<div class="rounded-lg bg-card p-6 shadow-sm border">
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

		<div class="rounded-lg bg-card p-6 shadow-sm border">
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

		<div class="rounded-lg bg-card p-6 shadow-sm border">
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
	<div class="rounded-lg bg-card p-4 shadow-sm border">
		<div class="flex flex-wrap gap-4">
			<div>
				<label for="category-filter" class="block text-sm font-medium text-foreground mb-1">
					Category
				</label>
				<select
					id="category-filter"
					bind:value={selectedCategory}
					class="rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
				>
					<option value="all">All Categories</option>
					{#each goalCategories as category}
						<option value={category.id}>{category.name}</option>
					{/each}
				</select>
			</div>

			<div>
				<label for="status-filter" class="block text-sm font-medium text-foreground mb-1">
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
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="w-full max-w-lg rounded-lg bg-card p-6 shadow-xl">
				<h2 class="text-lg font-semibold text-foreground mb-4">Create New Goal</h2>
				<form onsubmit={handleSubmitGoal} class="space-y-4">
					<div>
						<label for="goalTitle" class="block text-sm font-medium text-foreground mb-1">
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
						<label for="goalDescription" class="block text-sm font-medium text-foreground mb-1">
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

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="goalCategory" class="block text-sm font-medium text-foreground mb-1">
								Category
							</label>
							<select
								id="goalCategory"
								bind:value={newGoal.categoryId}
								required
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							>
								<option value="">Select category</option>
								{#each goalCategories as category}
									<option value={category.id}>{category.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="goalPriority" class="block text-sm font-medium text-foreground mb-1">
								Priority
							</label>
							<select
								id="goalPriority"
								bind:value={newGoal.priority}
								class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							>
								<option value="low">Low</option>
								<option value="medium">Medium</option>
								<option value="high">High</option>
							</select>
						</div>
					</div>

					<div>
						<label for="goalTargetDate" class="block text-sm font-medium text-foreground mb-1">
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

					<div class="flex justify-end gap-3 pt-4">
						<button
							type="button"
							onclick={() => showNewGoalForm = false}
							class="px-4 py-2 text-sm font-medium text-foreground hover:text-foreground"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Create Goal
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Goals Grid -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		{#each filteredGoals as goal}
			<div class="rounded-lg bg-card p-6 shadow-sm border">
				<!-- Goal Header -->
				<div class="flex items-start justify-between mb-4">
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-2">
							<h3 class="text-lg font-semibold text-foreground">{goal.title}</h3>
							<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getPriorityColor(goal.priority)}">
								{goal.priority}
							</span>
						</div>
						<p class="text-sm text-muted-foreground mb-3">{goal.description}</p>
					</div>
				</div>

				<!-- Goal Metadata -->
				<div class="flex items-center gap-4 mb-4">
					<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {getCategoryColor(goal.category.color)}">
						{goal.category.name}
					</span>
					<span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium {getStatusColor(goal.status)}">
						<svelte:component
							this={getStatusIcon(goal.status)}
							class="h-3 w-3"
						/>
						{goal.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
					</span>
				</div>

				<!-- Progress Bar -->
				<div class="mb-4">
					<div class="flex items-center justify-between text-sm text-muted-foreground mb-1">
						<span>Progress</span>
						<span>{goal.progress}%</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-2">
						<div
							class="h-2 rounded-full transition-all duration-300 {getProgressColor(goal.progress)}"
							style="width: {goal.progress}%"
						></div>
					</div>
				</div>

				<!-- Key Results -->
				{#if goal.keyResults && goal.keyResults.length > 0}
					<div class="mb-4">
						<h4 class="text-sm font-medium text-foreground mb-2">Key Results</h4>
						<div class="space-y-2">
							{#each goal.keyResults as kr}
								<div class="text-xs text-muted-foreground">
									<div class="flex items-center justify-between">
										<span>{kr.description}</span>
										<span>{kr.current}/{kr.target} {kr.unit}</span>
									</div>
									<div class="w-full bg-gray-200 rounded-full h-1 mt-1">
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
					<span>Updated: {formatDate(goal.lastUpdated)}</span>
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
						{selectedCategory !== 'all' || selectedStatus !== 'all'
							? 'No goals match your current filters.'
							: isOwnGoals
							? 'Create your first goal to get started!'
							: 'This user has no goals set yet.'}
					</p>
					{#if isOwnGoals && selectedCategory === 'all' && selectedStatus === 'all'}
						<button
							onclick={() => showNewGoalForm = true}
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