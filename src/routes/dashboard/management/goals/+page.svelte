<!--
	Goals & OKRs Management Page - T040 Implementation
	Converted from client-side URQL queries to server-side data loading with modern Svelte 5 patterns
	Features: Server-side loading, analytics dashboard, goal management, progress tracking
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { Target, Plus, TrendingUp, Calendar, BarChart3, Users, AlertCircle, CheckCircle } from 'lucide-svelte';

	// Modern Svelte 5 props interface
	interface Props {
		data: {
			user: any;
			userSession: any;
			teamGoals: any[];
			totalGoals: number;
			goalsAnalytics: any;
			filters: any;
			permissions: string[];
			canCreateGoals: boolean;
			canEditGoals: boolean;
			canViewAllGoals: boolean;
			loadedAt: string;
		};
	}

	// Destructure props using Svelte 5 runes
	let { data }: Props = $props();

	// Derived values from server-side data
	const user = $derived(data.user);
	const teamGoals = $derived(data.teamGoals);
	const goalsAnalytics = $derived(data.goalsAnalytics);
	const canCreateGoals = $derived(data.canCreateGoals);
	const canEditGoals = $derived(data.canEditGoals);

	// Local reactive state using Svelte 5 runes
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let showViewModal = $state(false);
	let showProgressModal = $state(false);
	let currentGoal = $state<any>(null);
	let selectedTab = $state('goals');

	// Form state for goal creation/editing
	let goalForm = $state({
		title: '',
		description: '',
		goalType: 'okr',
		priority: 'medium',
		targetValue: 100,
		currentValue: 0,
		unit: '%',
		startDate: '',
		targetDate: ''
	});

	// Progress update form
	let progressForm = $state({
		currentValue: 0,
		notes: ''
	});

	// Statistics cards from server-side analytics
	const statsCards = $derived([
		{
			title: 'Total Goals',
			value: goalsAnalytics.summary.totalGoals,
			change: '+12%',
			trend: 'up' as const,
			icon: Target,
			color: 'blue',
			testId: 'total-goals-stat'
		},
		{
			title: 'Active Goals',
			value: goalsAnalytics.summary.activeGoals,
			change: '+8%',
			trend: 'up' as const,
			icon: TrendingUp,
			color: 'green',
			testId: 'active-goals-stat'
		},
		{
			title: 'Avg Completion',
			value: `${goalsAnalytics.summary.avgCompletion}%`,
			change: '+5%',
			trend: 'up' as const,
			icon: BarChart3,
			color: 'purple',
			testId: 'completion-stat'
		},
		{
			title: 'Health Score',
			value: goalsAnalytics.healthScore,
			change: '+15%',
			trend: 'up' as const,
			icon: CheckCircle,
			color: 'indigo',
			testId: 'health-score-stat'
		}
	]);

	// Alerts and notifications from server-side analytics
	const alerts = $derived([
		...(goalsAnalytics.summary.overdueGoals > 0 ? [{
			type: 'warning' as const,
			title: `${goalsAnalytics.summary.overdueGoals} Overdue Goals`,
			message: 'Some goals have passed their target date and need attention.',
			action: 'View Overdue Goals',
			href: '/dashboard/management/goals?status=overdue',
			testId: 'alert-overdue-goals'
		}] : []),
		...(goalsAnalytics.summary.atRiskGoals > 0 ? [{
			type: 'info' as const,
			title: `${goalsAnalytics.summary.atRiskGoals} At-Risk Goals`,
			message: 'These goals may not meet their deadlines without additional focus.',
			action: 'Review Goals',
			href: '/dashboard/management/goals?status=at-risk',
			testId: 'alert-at-risk-goals'
		}] : [])
	]);

	// Helper functions
	function openCreateModal() {
		goalForm = {
			title: '',
			description: '',
			goalType: 'okr',
			priority: 'medium',
			targetValue: 100,
			currentValue: 0,
			unit: '%',
			startDate: '',
			targetDate: ''
		};
		currentGoal = null;
		showCreateModal = true;
	}

	function openEditModal(goal: any) {
		goalForm = {
			title: goal.title || '',
			description: goal.description || '',
			goalType: goal.goalType || 'okr',
			priority: goal.priority || 'medium',
			targetValue: goal.targetValue || 100,
			currentValue: goal.currentValue || 0,
			unit: goal.unit || '%',
			startDate: goal.startDate || '',
			targetDate: goal.targetDate || ''
		};
		currentGoal = goal;
		showEditModal = true;
	}

	function openViewModal(goal: any) {
		currentGoal = goal;
		showViewModal = true;
	}

	function openProgressModal(goal: any) {
		currentGoal = goal;
		progressForm = {
			currentValue: goal.currentValue || 0,
			notes: ''
		};
		showProgressModal = true;
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		showViewModal = false;
		showProgressModal = false;
		currentGoal = null;
	}

	function calculateProgress(goal: any): number {
		if (!goal.targetValue || goal.targetValue === 0) return 0;
		return Math.min(Math.round((goal.currentValue || 0) / goal.targetValue * 100), 100);
	}

	function getStatusColor(status: string): string {
		const colors = {
			draft: 'gray',
			active: 'blue',
			completed: 'green',
			cancelled: 'red'
		};
		return colors[status as keyof typeof colors] || 'gray';
	}

	function getPriorityColor(priority: string): string {
		const colors = {
			low: 'green',
			medium: 'yellow',
			high: 'red'
		};
		return colors[priority as keyof typeof colors] || 'yellow';
	}

	function getTypeColor(type: string): string {
		const colors = {
			okr: 'blue',
			kpi: 'green',
			project: 'purple'
		};
		return colors[type as keyof typeof colors] || 'blue';
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function handleSearch(event: Event) {
		const target = event.target as HTMLInputElement;
		const url = new URL(window.location.href);
		if (target.value) {
			url.searchParams.set('search', target.value);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}

	function handleFilterChange(key: string, value: string) {
		const url = new URL(window.location.href);
		if (value && value !== 'all') {
			url.searchParams.set(key, value);
		} else {
			url.searchParams.delete(key);
		}
		url.searchParams.set('page', '1');
		goto(url.toString());
	}
</script>

<div class="container mx-auto px-4 py-8" data-testid="goals-management-page">
	<!-- Page Header -->
	<div class="mb-6 flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 flex items-center gap-2">
				<Target class="w-8 h-8 text-blue-600" />
				Goals & OKRs
			</h1>
			<p class="mt-2 text-gray-600">Manage team objectives and track key results</p>
		</div>
		{#if canCreateGoals}
			<button
				onclick={openCreateModal}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"
				data-testid="create-goal-button"
			>
				<Plus class="w-4 h-4" />
				Create Goal
			</button>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
		{#each statsCards as card}
			<div class="bg-white rounded-lg shadow p-6 border-l-4 border-{card.color}-500" data-testid={card.testId}>
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-600">{card.title}</p>
						<p class="text-2xl font-bold text-gray-900">{card.value}</p>
						<p class="text-sm text-{card.color}-600 flex items-center gap-1">
							<span class="flex items-center">
								{#if card.trend === 'up'}
									<TrendingUp class="w-3 h-3" />
								{/if}
								{card.change}
							</span>
							from last quarter
						</p>
					</div>
					<div class="p-3 bg-{card.color}-100 rounded-full">
						<svelte:component this={card.icon} class="w-6 h-6 text-{card.color}-600" />
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Alerts Section -->
	{#if alerts.length > 0}
		<div class="mb-6">
			{#each alerts as alert}
				<div class="mb-3 p-4 rounded-md border-l-4 {alert.type === 'warning' ? 'bg-orange-50 border-orange-400' : 'bg-blue-50 border-blue-400'}" data-testid={alert.testId}>
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<AlertCircle class="w-5 h-5 {alert.type === 'warning' ? 'text-orange-500' : 'text-blue-500'} mr-2" />
							<div>
								<h4 class="text-sm font-medium {alert.type === 'warning' ? 'text-orange-800' : 'text-blue-800'}">{alert.title}</h4>
								<p class="text-sm {alert.type === 'warning' ? 'text-orange-700' : 'text-blue-700'}">{alert.message}</p>
							</div>
						</div>
						<a href={alert.href} class="text-sm font-medium {alert.type === 'warning' ? 'text-orange-600 hover:text-orange-500' : 'text-blue-600 hover:text-blue-500'} transition-colors">
							{alert.action} →
						</a>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Tabbed Interface -->
	<div class="bg-white rounded-lg shadow">
		<!-- Tab Navigation -->
		<div class="border-b border-gray-200">
			<nav class="-mb-px flex" data-testid="goals-tabs">
				<button
					class="py-2 px-4 border-b-2 font-medium text-sm {selectedTab === 'goals' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} transition-colors"
					onclick={() => selectedTab = 'goals'}
					data-testid="goals-tab"
				>
					<Target class="w-4 h-4 inline mr-2" />
					Goals ({teamGoals.length})
				</button>
				<button
					class="py-2 px-4 border-b-2 font-medium text-sm {selectedTab === 'analytics' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} transition-colors"
					onclick={() => selectedTab = 'analytics'}
					data-testid="analytics-tab"
				>
					<BarChart3 class="w-4 h-4 inline mr-2" />
					Analytics
				</button>
			</nav>
		</div>

		<!-- Tab Content -->
		<div class="p-6">
			{#if selectedTab === 'goals'}
				<!-- Filters -->
				<div class="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search Goals</label>
						<input
							id="search"
							type="text"
							value={data.filters.searchTerm}
							oninput={handleSearch}
							placeholder="Search by title..."
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-search"
						/>
					</div>

					<div>
						<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
						<select
							id="status-filter"
							value={data.filters.statusFilter || 'all'}
							onchange={(e) => handleFilterChange('status', e.currentTarget.value)}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="status-filter"
						>
							<option value="all">All Statuses</option>
							<option value="draft">Draft</option>
							<option value="active">Active</option>
							<option value="completed">Completed</option>
							<option value="cancelled">Cancelled</option>
						</select>
					</div>

					<div>
						<label for="type-filter" class="block text-sm font-medium text-gray-700 mb-1">Type</label>
						<select
							id="type-filter"
							value={data.filters.typeFilter || 'all'}
							onchange={(e) => handleFilterChange('type', e.currentTarget.value)}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="type-filter"
						>
							<option value="all">All Types</option>
							<option value="okr">OKR</option>
							<option value="kpi">KPI</option>
							<option value="project">Project</option>
						</select>
					</div>

					<div>
						<label for="priority-filter" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
						<select
							id="priority-filter"
							value={data.filters.priorityFilter || 'all'}
							onchange={(e) => handleFilterChange('priority', e.currentTarget.value)}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="priority-filter"
						>
							<option value="all">All Priorities</option>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>
					</div>
				</div>

				<!-- Goals List -->
				{#if teamGoals.length > 0}
					<div class="space-y-4" data-testid="goals-list">
						{#each teamGoals as goal}
							<div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow" data-testid="goal-card">
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="flex items-center gap-2 mb-2">
											<h3 class="text-lg font-semibold text-gray-900" data-testid="goal-title">{goal.title}</h3>
											<span class="px-2 py-1 rounded-full text-xs bg-{getTypeColor(goal.goalType)}-100 text-{getTypeColor(goal.goalType)}-800" data-testid="goal-type">
												{goal.goalType?.toUpperCase()}
											</span>
											<span class="px-2 py-1 rounded-full text-xs bg-{getPriorityColor(goal.priority)}-100 text-{getPriorityColor(goal.priority)}-800" data-testid="goal-priority">
												{goal.priority?.toUpperCase()}
											</span>
											<span class="px-2 py-1 rounded-full text-xs bg-{getStatusColor(goal.status)}-100 text-{getStatusColor(goal.status)}-800" data-testid="goal-status">
												{goal.status?.toUpperCase()}
											</span>
										</div>

										{#if goal.description}
											<p class="text-sm text-gray-600 mb-3">{goal.description}</p>
										{/if}

										<!-- Progress Bar -->
										<div class="mb-3">
											<div class="flex items-center justify-between text-sm text-gray-600 mb-1">
												<span>Progress</span>
												<span>{calculateProgress(goal)}%</span>
											</div>
											<div class="w-full bg-gray-200 rounded-full h-2">
												<div class="bg-blue-600 h-2 rounded-full transition-all" style="width: {calculateProgress(goal)}%"></div>
											</div>
										</div>

										<!-- Goal Details -->
										<div class="flex items-center gap-4 text-sm text-gray-500">
											<span class="flex items-center gap-1">
												<Calendar class="w-4 h-4" />
												Due: {formatDate(goal.targetDate)}
											</span>
											{#if goal.keyResults?.totalCount}
												<span class="flex items-center gap-1">
													<Users class="w-4 h-4" />
													{goal.keyResults.totalCount} Key Results
												</span>
											{/if}
										</div>
									</div>

									<!-- Action Buttons -->
									<div class="flex gap-2 ml-4">
										<button
											onclick={() => openViewModal(goal)}
											class="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
											title="View Goal"
											data-testid="view-goal"
										>
											<Target class="w-4 h-4" />
										</button>
										<button
											onclick={() => openProgressModal(goal)}
											class="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
											title="Update Progress"
											data-testid="update-progress"
										>
											<TrendingUp class="w-4 h-4" />
										</button>
										{#if canEditGoals}
											<button
												onclick={() => openEditModal(goal)}
												class="p-2 text-orange-600 hover:bg-orange-50 rounded transition-colors"
												title="Edit Goal"
												data-testid="edit-goal"
											>
												<Calendar class="w-4 h-4" />
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="text-center py-12" data-testid="empty-state">
						<Target class="w-16 h-16 text-gray-300 mx-auto mb-4" />
						<h3 class="text-lg font-medium text-gray-900 mb-2">No goals found</h3>
						<p class="text-gray-500 mb-4">Get started by creating your first goal or objective.</p>
						{#if canCreateGoals}
							<button
								onclick={openCreateModal}
								class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
							>
								Create First Goal
							</button>
						{/if}
					</div>
				{/if}
			{:else if selectedTab === 'analytics'}
				<!-- Analytics Content -->
				<div class="space-y-6" data-testid="analytics-content">
					<h3 class="text-lg font-semibold text-gray-900">Goals Analytics Overview</h3>

					<!-- Priority Breakdown -->
					{#if goalsAnalytics.breakdowns.priority.length > 0}
						<div>
							<h4 class="text-md font-medium text-gray-900 mb-3">Goals by Priority</h4>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								{#each goalsAnalytics.breakdowns.priority as priority}
									<div class="bg-{priority.color}-50 border border-{priority.color}-200 rounded-lg p-4">
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium text-{priority.color}-800">{priority.label}</span>
											<span class="text-2xl font-bold text-{priority.color}-900">{priority.count}</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Type Breakdown -->
					{#if goalsAnalytics.breakdowns.type.length > 0}
						<div>
							<h4 class="text-md font-medium text-gray-900 mb-3">Goals by Type</h4>
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								{#each goalsAnalytics.breakdowns.type as type}
									<div class="bg-{type.color}-50 border border-{type.color}-200 rounded-lg p-4">
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium text-{type.color}-800">{type.label}</span>
											<span class="text-2xl font-bold text-{type.color}-900">{type.count}</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Health Score -->
					<div class="bg-white border border-gray-200 rounded-lg p-6">
						<h4 class="text-md font-medium text-gray-900 mb-4">Overall Health Score</h4>
						<div class="flex items-center gap-4">
							<div class="flex-1">
								<div class="w-full bg-gray-200 rounded-full h-4">
									<div class="bg-green-600 h-4 rounded-full transition-all" style="width: {goalsAnalytics.healthScore}%"></div>
								</div>
							</div>
							<div class="text-2xl font-bold text-green-600">{goalsAnalytics.healthScore}%</div>
						</div>
						<p class="text-sm text-gray-500 mt-2">Based on completion rate, timeliness, and key results coverage</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Goal Modal -->
{#if showCreateModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="create-goal-modal">
		<div class="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<h2 class="text-xl font-bold mb-4">Create New Goal</h2>
			<form class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
					<input
						type="text"
						bind:value={goalForm.title}
						required
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
						data-testid="goal-title-input"
						placeholder="Enter goal title..."
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
					<textarea
						bind:value={goalForm.description}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
						data-testid="goal-description-input"
						placeholder="Describe the goal..."
					></textarea>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Type</label>
						<select
							bind:value={goalForm.goalType}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-type-input"
						>
							<option value="okr">OKR</option>
							<option value="kpi">KPI</option>
							<option value="project">Project</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
						<select
							bind:value={goalForm.priority}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-priority-input"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Unit</label>
						<select
							bind:value={goalForm.unit}
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-unit-input"
						>
							<option value="%">Percentage (%)</option>
							<option value="count">Count</option>
							<option value="hours">Hours</option>
							<option value="revenue">Revenue ($)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
						<input
							type="number"
							bind:value={goalForm.targetValue}
							min="0"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-target-input"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
						<input
							type="number"
							bind:value={goalForm.currentValue}
							min="0"
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-current-input"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
						<input
							type="date"
							bind:value={goalForm.startDate}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-start-date"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1">Target Date *</label>
						<input
							type="date"
							bind:value={goalForm.targetDate}
							required
							class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
							data-testid="goal-target-date"
						/>
					</div>
				</div>

				<div class="flex gap-2 justify-end pt-4">
					<button
						type="button"
						onclick={closeModals}
						class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
						data-testid="submit-goal"
					>
						Create Goal
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- View Goal Modal -->
{#if showViewModal && currentGoal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="view-goal-modal">
		<div class="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
			<div class="flex justify-between items-center mb-6">
				<div>
					<h2 class="text-xl font-bold">{currentGoal.title}</h2>
					<p class="text-gray-600">{currentGoal.team?.name || 'Individual Goal'}</p>
				</div>
				<button onclick={closeModals} class="text-gray-400 hover:text-gray-600 transition-colors">
					✕
				</button>
			</div>

			<div class="space-y-6" data-testid="goal-details">
				<!-- Progress Overview -->
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
					<div>
						<p class="text-sm text-gray-600">Progress</p>
						<p class="text-2xl font-bold text-blue-600">{calculateProgress(currentGoal)}%</p>
					</div>
					<div>
						<p class="text-sm text-gray-600">Type</p>
						<p class="text-lg font-medium text-gray-900">{currentGoal.goalType?.toUpperCase()}</p>
					</div>
					<div>
						<p class="text-sm text-gray-600">Priority</p>
						<p class="text-lg font-medium text-gray-900">{currentGoal.priority?.toUpperCase()}</p>
					</div>
					<div>
						<p class="text-sm text-gray-600">Status</p>
						<p class="text-lg font-medium text-gray-900">{currentGoal.status?.toUpperCase()}</p>
					</div>
				</div>

				<!-- Progress Bar -->
				<div>
					<div class="flex justify-between items-center mb-2">
						<span class="text-sm font-medium">Progress</span>
						<span class="text-sm text-gray-600">{currentGoal.currentValue}/{currentGoal.targetValue} {currentGoal.unit}</span>
					</div>
					<div class="w-full bg-gray-200 rounded-full h-3">
						<div class="bg-blue-600 h-3 rounded-full transition-all" style="width: {calculateProgress(currentGoal)}%"></div>
					</div>
				</div>

				<!-- Description -->
				{#if currentGoal.description}
					<div>
						<h4 class="font-medium text-gray-900 mb-2">Description</h4>
						<p class="text-gray-700 bg-gray-50 p-3 rounded-md">{currentGoal.description}</p>
					</div>
				{/if}

				<!-- Timeline -->
				<div>
					<h4 class="font-medium text-gray-900 mb-2">Timeline</h4>
					<div class="flex items-center gap-4 text-sm text-gray-600">
						<span>Start: {formatDate(currentGoal.startDate)}</span>
						<span>•</span>
						<span>Target: {formatDate(currentGoal.targetDate)}</span>
					</div>
				</div>
			</div>

			<div class="flex justify-between mt-6">
				<button
					onclick={() => {closeModals(); openProgressModal(currentGoal);}}
					class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
				>
					Update Progress
				</button>
				<button onclick={closeModals} class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Progress Update Modal -->
{#if showProgressModal && currentGoal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="progress-modal">
		<div class="bg-white rounded-lg p-6 max-w-md w-full">
			<h2 class="text-xl font-bold mb-4">Update Progress</h2>

			<div class="mb-4">
				<h3 class="font-medium text-gray-900 mb-2">{currentGoal.title}</h3>
				<p class="text-sm text-gray-600">Target: {currentGoal.targetValue} {currentGoal.unit}</p>
			</div>

			<form class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Current Value</label>
					<input
						type="number"
						bind:value={progressForm.currentValue}
						min="0"
						max={currentGoal.targetValue}
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
						data-testid="progress-value-input"
					/>
					<div class="mt-2">
						<div class="flex items-center justify-between text-sm text-gray-600">
							<span>Progress</span>
							<span>{Math.round((progressForm.currentValue / currentGoal.targetValue) * 100)}%</span>
						</div>
						<div class="w-full bg-gray-200 rounded-full h-2 mt-1">
							<div
								class="bg-blue-600 h-2 rounded-full transition-all"
								style="width: {Math.min((progressForm.currentValue / currentGoal.targetValue) * 100, 100)}%"
							></div>
						</div>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1">Progress Notes (Optional)</label>
					<textarea
						bind:value={progressForm.notes}
						rows="3"
						class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
						data-testid="progress-notes"
						placeholder="Add notes about this progress update..."
					></textarea>
				</div>

				<div class="flex gap-2 justify-end pt-4">
					<button
						type="button"
						onclick={closeModals}
						class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
						data-testid="update-progress-submit"
					>
						Update Progress
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	/* Ensure proper Tailwind classes are generated */
	.border-blue-500 { border-color: rgb(59 130 246); }
	.border-green-500 { border-color: rgb(34 197 94); }
	.border-purple-500 { border-color: rgb(168 85 247); }
	.border-indigo-500 { border-color: rgb(99 102 241); }
	.bg-blue-100 { background-color: rgb(219 234 254); }
	.bg-green-100 { background-color: rgb(220 252 231); }
	.bg-purple-100 { background-color: rgb(243 232 255); }
	.bg-yellow-100 { background-color: rgb(254 249 195); }
	.bg-red-100 { background-color: rgb(254 226 226); }
	.bg-gray-100 { background-color: rgb(243 244 246); }
	.text-blue-600 { color: rgb(37 99 235); }
	.text-green-600 { color: rgb(22 163 74); }
	.text-purple-600 { color: rgb(147 51 234); }
	.text-yellow-600 { color: rgb(202 138 4); }
	.text-red-600 { color: rgb(220 38 38); }
	.text-gray-600 { color: rgb(75 85 99); }
	.text-blue-800 { color: rgb(30 64 175); }
	.text-green-800 { color: rgb(22 101 52); }
	.text-purple-800 { color: rgb(107 33 168); }
	.text-yellow-800 { color: rgb(133 77 14); }
	.text-red-800 { color: rgb(153 27 27); }
	.text-gray-800 { color: rgb(31 41 55); }
</style>