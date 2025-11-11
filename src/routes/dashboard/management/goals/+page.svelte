<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		AlertCircle,
		BarChart3,
		Calendar,
		CheckCircle,
		Plus,
		Target,
		TrendingUp,
		Users
	} from '@lucide/svelte';

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
	const { data }: Props = $props();

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
		...(goalsAnalytics.summary.overdueGoals > 0
			? [
					{
						type: 'warning' as const,
						title: `${goalsAnalytics.summary.overdueGoals} Overdue Goals`,
						message: 'Some goals have passed their target date and need attention.',
						action: 'View Overdue Goals',
						href: '/dashboard/management/goals?status=overdue',
						testId: 'alert-overdue-goals'
					}
				]
			: []),
		...(goalsAnalytics.summary.atRiskGoals > 0
			? [
					{
						type: 'info' as const,
						title: `${goalsAnalytics.summary.atRiskGoals} At-Risk Goals`,
						message: 'These goals may not meet their deadlines without additional focus.',
						action: 'Review Goals',
						href: '/dashboard/management/goals?status=at-risk',
						testId: 'alert-at-risk-goals'
					}
				]
			: [])
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
		return Math.min(Math.round(((goal.currentValue || 0) / goal.targetValue) * 100), 100);
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

	function getAlertIcon(type: string) {
		switch (type) {
			case 'error':
				return AlertCircle;
			case 'warning':
				return AlertCircle;
			case 'info':
				return AlertCircle;
			default:
				return AlertCircle;
		}
	}

	function getAlertColors(type: string) {
		switch (type) {
			case 'error':
				return {
					bg: 'bg-red-50',
					border: 'border-red-200',
					icon: 'text-red-500',
					title: 'text-red-900',
					message: 'text-red-700',
					button: 'bg-red-100 text-red-800 hover:bg-red-200'
				};
			case 'warning':
				return {
					bg: 'bg-yellow-50',
					border: 'border-yellow-200',
					icon: 'text-yellow-500',
					title: 'text-yellow-900',
					message: 'text-yellow-700',
					button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
				};
			case 'info':
				return {
					bg: 'bg-blue-50',
					border: 'border-blue-200',
					icon: 'text-blue-500',
					title: 'text-blue-900',
					message: 'text-blue-700',
					button: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
				};
			default:
				return {
					bg: 'bg-muted dark:bg-muted',
					border: 'border',
					icon: 'text-muted-foreground',
					title: 'text-foreground',
					message: 'text-foreground',
					button: 'bg-gray-100 text-foreground hover:bg-gray-200'
				};
		}
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

<!--
	Goals & OKRs Management Page - T040 Implementation
	Converted from client-side URQL queries to server-side data loading with modern Svelte 5 patterns
	Features: Server-side loading, analytics dashboard, goal management, progress tracking
-->

<svelte:head>
	<title>Goals & OKRs Management - MountainHR</title>
	<meta
		name="description"
		content="Manage team goals, objectives, and key results. Track progress, set priorities, and monitor performance metrics across your organization."
	/>
	<meta property="og:title" content="Goals & OKRs Management - MountainHR" />
	<meta
		property="og:description"
		content="Comprehensive goal management dashboard for tracking team objectives and key results"
	/>
</svelte:head>

<div class="mb-8" data-testid="goals-management-page">
	<!-- Page Header -->
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-foreground">Goals & OKRs</h1>
			<p class="mt-2 text-muted-foreground">Manage team objectives and track key results</p>
		</div>
		{#if canCreateGoals}
			<button
				onclick={openCreateModal}
				class="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
				data-testid="create-goal-button"
			>
				<Plus class="h-4 w-4" />
				Create Goal
			</button>
		{/if}
	</div>

	<!-- Statistics Cards -->
	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
		<!-- Total Goals -->
		<div class="rounded-lg border bg-card p-6 shadow-sm" data-testid="total-goals-stat">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Total Goals</p>
					<p class="text-2xl font-bold text-foreground">
						{goalsAnalytics.summary.totalGoals}
					</p>
					<p class="text-sm font-medium text-green-600">+12% from last quarter</p>
				</div>
				<div class="rounded-lg bg-blue-100 p-3">
					<Target class="h-6 w-6 text-blue-600" />
				</div>
			</div>
		</div>

		<!-- Active Goals -->
		<div class="rounded-lg border bg-card p-6 shadow-sm" data-testid="active-goals-stat">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Active Goals</p>
					<p class="text-2xl font-bold text-foreground">
						{goalsAnalytics.summary.activeGoals}
					</p>
					<p class="text-sm font-medium text-green-600">+8% from last quarter</p>
				</div>
				<div class="rounded-lg bg-green-100 p-3">
					<TrendingUp class="h-6 w-6 text-green-600" />
				</div>
			</div>
		</div>

		<!-- Avg Completion -->
		<div class="rounded-lg border bg-card p-6 shadow-sm" data-testid="completion-stat">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Avg Completion</p>
					<p class="text-2xl font-bold text-foreground">{goalsAnalytics.summary.avgCompletion}%</p>
					<p class="text-sm font-medium text-green-600">+5% from last quarter</p>
				</div>
				<div class="rounded-lg bg-purple-100 p-3">
					<BarChart3 class="h-6 w-6 text-purple-600" />
				</div>
			</div>
		</div>

		<!-- Health Score -->
		<div class="rounded-lg border bg-card p-6 shadow-sm" data-testid="health-score-stat">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Health Score</p>
					<p class="text-2xl font-bold text-foreground">{goalsAnalytics.healthScore}</p>
					<p class="text-sm font-medium text-green-600">+15% from last quarter</p>
				</div>
				<div class="rounded-lg bg-indigo-100 p-3">
					<CheckCircle class="h-6 w-6 text-indigo-600" />
				</div>
			</div>
		</div>
	</div>

	<!-- Alerts Section -->
	{#if alerts.length > 0}
		<div class="mb-6 grid grid-cols-1 gap-3">
			{#each alerts as alert}
				{@const colors = getAlertColors(alert.type)}
				{@const AlertIcon = getAlertIcon(alert.type)}
				<div
					class="flex items-center justify-between rounded-lg p-3 {colors.bg} {colors.border}"
					data-testid={alert.testId}
				>
					<div class="flex items-center gap-3">
						<AlertIcon class="h-5 w-5 {colors.icon}" />
						<div>
							<h4 class="font-medium {colors.title}">{alert.title}</h4>
							<p class="text-sm {colors.message}">{alert.message}</p>
						</div>
					</div>
					<a href={alert.href} class="rounded-md px-3 py-1 text-sm font-medium {colors.button}">
						{alert.action}
					</a>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Tabbed Interface -->
	<div class="rounded-lg bg-card shadow">
		<!-- Tab Navigation -->
		<div class="border border-b">
			<nav class="-mb-px flex" data-testid="goals-tabs">
				<button
					class="border-b-2 px-4 py-2 text-sm font-medium {selectedTab === 'goals'
						? 'border-primary text-foreground'
						: 'border-transparent text-muted-foreground hover:border-input hover:text-foreground'} transition-colors"
					onclick={() => (selectedTab = 'goals')}
					data-testid="goals-tab"
				>
					<Target class="mr-2 inline h-4 w-4" />
					Goals ({teamGoals.length})
				</button>
				<button
					class="border-b-2 px-4 py-2 text-sm font-medium {selectedTab === 'analytics'
						? 'border-primary text-foreground'
						: 'border-transparent text-muted-foreground hover:border-input hover:text-foreground'} transition-colors"
					onclick={() => (selectedTab = 'analytics')}
					data-testid="analytics-tab"
				>
					<BarChart3 class="mr-2 inline h-4 w-4" />
					Analytics
				</button>
			</nav>
		</div>

		<!-- Tab Content -->
		<div class="p-6">
			{#if selectedTab === 'goals'}
				<!-- Filters -->
				<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
					<div>
						<label for="search" class="mb-1 block text-sm font-medium text-foreground"
							>Search Goals</label
						>
						<input
							id="search"
							type="text"
							value={data.filters.searchTerm}
							oninput={handleSearch}
							placeholder="Search by title..."
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-search"
						/>
					</div>

					<div>
						<label for="status-filter" class="mb-1 block text-sm font-medium text-foreground"
							>Status</label
						>
						<select
							id="status-filter"
							value={data.filters.statusFilter || 'all'}
							onchange={(e) => handleFilterChange('status', e.currentTarget.value)}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
						<label for="type-filter" class="mb-1 block text-sm font-medium text-foreground"
							>Type</label
						>
						<select
							id="type-filter"
							value={data.filters.typeFilter || 'all'}
							onchange={(e) => handleFilterChange('type', e.currentTarget.value)}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="type-filter"
						>
							<option value="all">All Types</option>
							<option value="okr">OKR</option>
							<option value="kpi">KPI</option>
							<option value="project">Project</option>
						</select>
					</div>

					<div>
						<label for="priority-filter" class="mb-1 block text-sm font-medium text-foreground"
							>Priority</label
						>
						<select
							id="priority-filter"
							value={data.filters.priorityFilter || 'all'}
							onchange={(e) => handleFilterChange('priority', e.currentTarget.value)}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
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
							<div
								class="rounded-lg border p-4 transition-shadow hover:shadow-md"
								data-testid="goal-card"
							>
								<div class="flex items-start justify-between">
									<div class="flex-1">
										<div class="mb-2 flex items-center gap-2">
											<h3 class="text-lg font-semibold text-foreground" data-testid="goal-title">
												{goal.title}
											</h3>
											<span
												class="rounded-full border border-input bg-muted px-2 py-1 text-xs text-foreground"
												data-testid="goal-type"
											>
												{goal.goalType?.toUpperCase()}
											</span>
											<span
												class="rounded-full border border-input bg-muted px-2 py-1 text-xs text-foreground"
												data-testid="goal-priority"
											>
												{goal.priority?.toUpperCase()}
											</span>
											<span
												class="rounded-full border border-input bg-muted px-2 py-1 text-xs text-foreground"
												data-testid="goal-status"
											>
												{goal.status?.toUpperCase()}
											</span>
										</div>

										{#if goal.description}
											<p class="mb-3 text-sm text-muted-foreground">{goal.description}</p>
										{/if}

										<!-- Progress Bar -->
										<div class="mb-3">
											<div
												class="mb-1 flex items-center justify-between text-sm text-muted-foreground"
											>
												<span>Progress</span>
												<span>{calculateProgress(goal)}%</span>
											</div>
											<div class="h-2 w-full rounded-full bg-muted">
												<div
													class="h-2 rounded-full bg-primary transition-all"
													style="width: {calculateProgress(goal)}%"
												></div>
											</div>
										</div>

										<!-- Goal Details -->
										<div class="flex items-center gap-4 text-sm text-muted-foreground">
											<span class="flex items-center gap-1">
												<Calendar class="h-4 w-4" />
												Due: {formatDate(goal.targetDate)}
											</span>
											{#if goal.keyResults?.totalCount}
												<span class="flex items-center gap-1">
													<Users class="h-4 w-4" />
													{goal.keyResults.totalCount} Key Results
												</span>
											{/if}
										</div>
									</div>

									<!-- Action Buttons -->
									<div class="ml-4 flex gap-2">
										<button
											onclick={() => openViewModal(goal)}
											class="rounded p-2 transition-colors hover:bg-accent"
											title="View Goal"
											data-testid="view-goal"
										>
											<Target class="h-4 w-4" />
										</button>
										<button
											onclick={() => openProgressModal(goal)}
											class="rounded p-2 transition-colors hover:bg-accent"
											title="Update Progress"
											data-testid="update-progress"
										>
											<TrendingUp class="h-4 w-4" />
										</button>
										{#if canEditGoals}
											<button
												onclick={() => openEditModal(goal)}
												class="rounded p-2 transition-colors hover:bg-accent"
												title="Edit Goal"
												data-testid="edit-goal"
											>
												<Calendar class="h-4 w-4" />
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="py-12 text-center" data-testid="empty-state">
						<Target class="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
						<h3 class="mb-2 text-lg font-medium text-foreground">No goals found</h3>
						<p class="mb-4 text-muted-foreground">
							Get started by creating your first goal or objective.
						</p>
						{#if canCreateGoals}
							<button
								onclick={openCreateModal}
								class="rounded-md bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Create First Goal
							</button>
						{/if}
					</div>
				{/if}
			{:else if selectedTab === 'analytics'}
				<!-- Analytics Content -->
				<div class="space-y-6" data-testid="analytics-content">
					<h3 class="text-lg font-semibold text-foreground">Goals Analytics Overview</h3>

					<!-- Priority Breakdown -->
					{#if goalsAnalytics.breakdowns.priority.length > 0}
						<div>
							<h4 class="text-md mb-3 font-medium text-foreground">Goals by Priority</h4>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
								{#each goalsAnalytics.breakdowns.priority as priority}
									<div class="rounded-lg border border-input bg-card p-4">
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium text-muted-foreground">{priority.label}</span
											>
											<span class="text-2xl font-bold text-foreground">{priority.count}</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Type Breakdown -->
					{#if goalsAnalytics.breakdowns.type.length > 0}
						<div>
							<h4 class="text-md mb-3 font-medium text-foreground">Goals by Type</h4>
							<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
								{#each goalsAnalytics.breakdowns.type as type}
									<div class="rounded-lg border border-input bg-card p-4">
										<div class="flex items-center justify-between">
											<span class="text-sm font-medium text-muted-foreground">{type.label}</span>
											<span class="text-2xl font-bold text-foreground">{type.count}</span>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Health Score -->
					<div class="rounded-lg border bg-card p-6">
						<h4 class="text-md mb-4 font-medium text-foreground">Overall Health Score</h4>
						<div class="flex items-center gap-4">
							<div class="flex-1">
								<div class="h-4 w-full rounded-full bg-muted">
									<div
										class="h-4 rounded-full bg-primary transition-all"
										style="width: {goalsAnalytics.healthScore}%"
									></div>
								</div>
							</div>
							<div class="text-2xl font-bold text-foreground">{goalsAnalytics.healthScore}%</div>
						</div>
						<p class="mt-2 text-sm text-muted-foreground">
							Based on completion rate, timeliness, and key results coverage
						</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create Goal Modal -->
{#if showCreateModal}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		data-testid="create-goal-modal"
	>
		<div
			class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
		>
			<h2 class="mb-4 text-xl font-bold">Create New Goal</h2>
			<form class="space-y-4">
				<div>
					<label for="goal-title" class="mb-1 block text-sm font-medium text-foreground"
						>Goal Title *</label
					>
					<input
						id="goal-title"
						type="text"
						bind:value={goalForm.title}
						required
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="goal-title-input"
						placeholder="Enter goal title..."
					/>
				</div>

				<div>
					<label for="goal-description" class="mb-1 block text-sm font-medium text-foreground"
						>Description</label
					>
					<textarea
						id="goal-description"
						bind:value={goalForm.description}
						rows="3"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="goal-description-input"
						placeholder="Describe the goal..."
					></textarea>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
					<div>
						<label for="goal-type" class="mb-1 block text-sm font-medium text-foreground"
							>Type</label
						>
						<select
							id="goal-type"
							bind:value={goalForm.goalType}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-type-input"
						>
							<option value="okr">OKR</option>
							<option value="kpi">KPI</option>
							<option value="project">Project</option>
						</select>
					</div>
					<div>
						<label for="goal-priority" class="mb-1 block text-sm font-medium text-foreground"
							>Priority</label
						>
						<select
							id="goal-priority"
							bind:value={goalForm.priority}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-priority-input"
						>
							<option value="low">Low</option>
							<option value="medium">Medium</option>
							<option value="high">High</option>
						</select>
					</div>
					<div>
						<label for="goal-unit" class="mb-1 block text-sm font-medium text-foreground"
							>Unit</label
						>
						<select
							id="goal-unit"
							bind:value={goalForm.unit}
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-unit-input"
						>
							<option value="%">Percentage (%)</option>
							<option value="count">Count</option>
							<option value="hours">Hours</option>
							<option value="revenue">Revenue ($)</option>
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label for="goal-target-value" class="mb-1 block text-sm font-medium text-foreground"
							>Target Value</label
						>
						<input
							id="goal-target-value"
							type="number"
							bind:value={goalForm.targetValue}
							min="0"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-target-input"
						/>
					</div>
					<div>
						<label for="goal-current-value" class="mb-1 block text-sm font-medium text-foreground"
							>Current Value</label
						>
						<input
							id="goal-current-value"
							type="number"
							bind:value={goalForm.currentValue}
							min="0"
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-current-input"
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div>
						<label for="goal-start-date" class="mb-1 block text-sm font-medium text-foreground"
							>Start Date *</label
						>
						<input
							id="goal-start-date"
							type="date"
							bind:value={goalForm.startDate}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-start-date"
						/>
					</div>
					<div>
						<label for="goal-target-date" class="mb-1 block text-sm font-medium text-foreground"
							>Target Date *</label
						>
						<input
							id="goal-target-date"
							type="date"
							bind:value={goalForm.targetDate}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							data-testid="goal-target-date"
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
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
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		data-testid="view-goal-modal"
	>
		<div
			class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
		>
			<div class="mb-6 flex items-center justify-between">
				<div>
					<h2 class="text-xl font-bold">{currentGoal.title}</h2>
					<p class="text-muted-foreground">{currentGoal.team?.name || 'Individual Goal'}</p>
				</div>
				<button
					onclick={closeModals}
					class="text-muted-foreground transition-colors hover:text-muted-foreground"
				>
					✕
				</button>
			</div>

			<div class="space-y-6" data-testid="goal-details">
				<!-- Progress Overview -->
				<div class="grid grid-cols-1 gap-4 text-center md:grid-cols-4">
					<div>
						<p class="text-sm text-muted-foreground">Progress</p>
						<p class="text-2xl font-bold text-foreground">{calculateProgress(currentGoal)}%</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Type</p>
						<p class="text-lg font-medium text-foreground">{currentGoal.goalType?.toUpperCase()}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Priority</p>
						<p class="text-lg font-medium text-foreground">{currentGoal.priority?.toUpperCase()}</p>
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Status</p>
						<p class="text-lg font-medium text-foreground">{currentGoal.status?.toUpperCase()}</p>
					</div>
				</div>

				<!-- Progress Bar -->
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-sm font-medium">Progress</span>
						<span class="text-sm text-muted-foreground"
							>{currentGoal.currentValue}/{currentGoal.targetValue} {currentGoal.unit}</span
						>
					</div>
					<div class="h-3 w-full rounded-full bg-muted">
						<div
							class="h-3 rounded-full bg-primary transition-all"
							style="width: {calculateProgress(currentGoal)}%"
						></div>
					</div>
				</div>

				<!-- Description -->
				{#if currentGoal.description}
					<div>
						<h4 class="mb-2 font-medium text-foreground">Description</h4>
						<p class="rounded-md bg-muted/50 p-3 text-foreground">{currentGoal.description}</p>
					</div>
				{/if}

				<!-- Timeline -->
				<div>
					<h4 class="mb-2 font-medium text-foreground">Timeline</h4>
					<div class="flex items-center gap-4 text-sm text-muted-foreground">
						<span>Start: {formatDate(currentGoal.startDate)}</span>
						<span>•</span>
						<span>Target: {formatDate(currentGoal.targetDate)}</span>
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-between">
				<button
					onclick={() => {
						closeModals();
						openProgressModal(currentGoal);
					}}
					class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
				>
					Update Progress
				</button>
				<button onclick={closeModals} class="rounded-md border px-4 py-2 text-sm hover:bg-accent">
					Close
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Progress Update Modal -->
{#if showProgressModal && currentGoal}
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black"
		data-testid="progress-modal"
	>
		<div class="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
			<h2 class="mb-4 text-xl font-bold">Update Progress</h2>

			<div class="mb-4">
				<h3 class="mb-2 font-medium text-foreground">{currentGoal.title}</h3>
				<p class="text-sm text-muted-foreground">
					Target: {currentGoal.targetValue}
					{currentGoal.unit}
				</p>
			</div>

			<form class="space-y-4">
				<div>
					<label for="progress-current-value" class="mb-1 block text-sm font-medium text-foreground"
						>Current Value</label
					>
					<input
						id="progress-current-value"
						type="number"
						bind:value={progressForm.currentValue}
						min="0"
						max={currentGoal.targetValue}
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="progress-value-input"
					/>
					<div class="mt-2">
						<div class="flex items-center justify-between text-sm text-muted-foreground">
							<span>Progress</span>
							<span>{Math.round((progressForm.currentValue / currentGoal.targetValue) * 100)}%</span
							>
						</div>
						<div class="mt-1 h-2 w-full rounded-full bg-muted">
							<div
								class="h-2 rounded-full bg-primary transition-all"
								style="width: {Math.min(
									(progressForm.currentValue / currentGoal.targetValue) * 100,
									100
								)}%"
							></div>
						</div>
					</div>
				</div>

				<div>
					<label for="progress-notes" class="mb-1 block text-sm font-medium text-foreground"
						>Progress Notes (Optional)</label
					>
					<textarea
						id="progress-notes"
						bind:value={progressForm.notes}
						rows="3"
						class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						data-testid="progress-notes"
						placeholder="Add notes about this progress update..."
					></textarea>
				</div>

				<div class="flex justify-end gap-2 pt-4">
					<button
						type="button"
						onclick={closeModals}
						class="rounded-md border px-4 py-2 text-sm hover:bg-accent"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
						data-testid="update-progress-submit"
					>
						Update Progress
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
