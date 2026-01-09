<script lang="ts">
	import { BarChart3, Calendar, Target, TrendingUp, Users } from '@lucide/svelte';
	import { goto } from '$app/navigation';

	interface Props {
		teamGoals: any[];
		filters: any;
		canCreateGoals: boolean;
		canEditGoals: boolean;
		onSearch: (event: Event) => void;
		onFilterChange: (key: string, value: string) => void;
		onCreate: () => void;
		onView: (goal: any) => void;
		onEdit: (goal: any) => void;
		onProgress: (goal: any) => void;
	}

	const {
		teamGoals,
		filters,
		canCreateGoals,
		canEditGoals,
		onSearch,
		onFilterChange,
		onCreate,
		onView,
		onEdit,
		onProgress
	}: Props = $props();

	function calculateProgress(goal: any): number {
		if (!goal.targetValue || goal.targetValue === 0) return 0;
		return Math.min(Math.round(((goal.currentValue || 0) / goal.targetValue) * 100), 100);
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<!-- Filters -->
<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
	<div>
		<label for="search" class="mb-1 block text-sm font-medium text-foreground">Search Goals</label>
		<input
			id="search"
			type="text"
			value={filters.searchTerm}
			oninput={onSearch}
			placeholder="Search by title..."
			class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
			data-testid="goal-search"
		/>
	</div>

	<div>
		<label for="status-filter" class="mb-1 block text-sm font-medium text-foreground">Status</label>
		<select
			id="status-filter"
			value={filters.statusFilter || 'all'}
			onchange={(e) => onFilterChange('status', e.currentTarget.value)}
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
		<label for="type-filter" class="mb-1 block text-sm font-medium text-foreground">Type</label>
		<select
			id="type-filter"
			value={filters.typeFilter || 'all'}
			onchange={(e) => onFilterChange('type', e.currentTarget.value)}
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
			value={filters.priorityFilter || 'all'}
			onchange={(e) => onFilterChange('priority', e.currentTarget.value)}
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
			<div class="rounded-lg border p-4 transition-shadow hover:shadow-md" data-testid="goal-card">
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
							<div class="mb-1 flex items-center justify-between text-sm text-muted-foreground">
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
							{#if goal.targetDate}
								<span class="flex items-center gap-1">
									<Calendar class="h-4 w-4" />
									Due: {formatDate(goal.targetDate)}
								</span>
							{/if}
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
							onclick={() => onView(goal)}
							class="rounded p-2 transition-colors hover:bg-accent"
							title="View Goal"
							data-testid="view-goal"
						>
							<Target class="h-4 w-4" />
						</button>
						<button
							onclick={() => onProgress(goal)}
							class="rounded p-2 transition-colors hover:bg-accent"
							title="Update Progress"
							data-testid="update-progress"
						>
							<TrendingUp class="h-4 w-4" />
						</button>
						{#if canEditGoals}
							<button
								onclick={() => onEdit(goal)}
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
		<p class="mb-4 text-muted-foreground">Get started by creating your first goal or objective.</p>
		{#if canCreateGoals}
			<button
				onclick={onCreate}
				class="mx-auto flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Create Goal
			</button>
		{/if}
	</div>
{/if}
