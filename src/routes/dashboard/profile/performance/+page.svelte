<script lang="ts">
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import {
		Award,
		Calendar,
		CheckCircle,
		ChevronRight,
		Clock,
		History,
		ListTodo,
		Plus,
		Star,
		Target,
		TrendingUp,
		User
	} from '@lucide/svelte';
	import { format, parseISO } from 'date-fns';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	const { data } = $props();

	// Extract data properties
	const user = $derived(data.user);
	const userId = $derived(data.userId);
	const goals = $derived(data.goals || []);
	const reviews = $derived(data.reviews || []);
	const averageRating = $derived(data.averageRating);
	const goalStats = $derived(data.goalStats);
	const currentQuarter = $derived(data.currentQuarter);
	const canManageGoals = $derived(data.canManageGoals);
	const isOwnGoals = $derived(data.isOwnGoals);

	// State for new goal form
	let showNewGoalForm = $state(false);
	let newGoal = $state({
		title: '',
		description: '',
		targetDate: data.currentQuarter.end
	});
	let isSubmitting = $state(false);

	// Filter active goals for the list
	const activeGoals = $derived(
		goals.filter((g: any) => g.status !== 'completed' && g.status !== 'cancelled').slice(0, 5)
	);

	function getStatusColor(status: string) {
		switch (status?.toLowerCase()) {
			case 'completed':
				return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
			case 'in_progress':
				return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
			case 'at_risk':
				return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
			case 'blocked':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
			default:
				return 'bg-muted text-muted-foreground border-border';
		}
	}

	function getRatingLabel(rating: number) {
		if (rating >= 4.8) return 'Exceeds';
		if (rating >= 4.0) return 'Strong';
		if (rating >= 3.0) return 'Meets';
		if (rating >= 2.0) return 'Needs Imp.';
		return 'Unsatisfactory';
	}

	function formatDate(dateString: string | null | undefined) {
		if (!dateString) return 'No date';
		try {
			return format(parseISO(dateString), 'MMM dd, yyyy');
		} catch (error) {
			return 'Invalid date';
		}
	}

	async function handleSubmitGoal(event: SubmitEvent) {
		event.preventDefault();
		isSubmitting = true;

		try {
			const targetDateTime = newGoal.targetDate
				? new Date(newGoal.targetDate + 'T23:59:59.999Z').toISOString()
				: null;

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

			if (!response.ok) throw new Error('Failed to create goal');

			await invalidateAll();
			toast.success('Goal Created', { description: 'New performance goal has been set.' });
			showNewGoalForm = false;
			newGoal = { title: '', description: '', targetDate: data.currentQuarter.end };
		} catch (error) {
			toast.error('Creation Failed', { description: 'Could not create goal. Please try again.' });
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Performance - MountainHR</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-6 md:p-10">
	<!-- Header -->
	<div class="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-foreground">Performance</h1>
			<p class="text-muted-foreground">Track goals, skills, and reviews.</p>
		</div>
		<div class="flex items-center gap-3">
			{#if isOwnGoals}
				<Button onclick={() => (showNewGoalForm = true)} class="shadow-lg shadow-primary/20">
					<Plus class="mr-2 h-4 w-4" />
					New Goal
				</Button>
			{/if}
		</div>
	</div>

	<!-- Main Bento Grid -->
	<div class="grid auto-rows-[minmax(160px,auto)] grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
		<!-- 1. Overall Rating (Small) -->
		<div
			class="relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-5"
		>
			<div class="z-10 mb-2 flex items-center gap-2 text-muted-foreground">
				<Star class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Overall Rating</span>
			</div>
			<div class="z-10">
				<span class="text-4xl font-bold text-yellow-500">{averageRating || '-'}</span>
				<span class="text-sm text-muted-foreground">/ 5.0</span>
				<div class="mt-2 flex gap-0.5">
					{#each Array(5) as _, i}
						<Star
							class="h-4 w-4 {i < Math.floor(Number(averageRating) || 0)
								? 'fill-yellow-500 text-yellow-500'
								: 'text-muted-foreground/30'}"
						/>
					{/each}
				</div>
			</div>
			<!-- Decorative -->
			<div class="absolute -bottom-4 -right-4 text-yellow-500/5">
				<Award class="h-32 w-32" />
			</div>
		</div>

		<!-- 2. Goal Completion (Small) -->
		<div class="flex flex-col justify-between rounded-xl border bg-card p-5">
			<div class="mb-2 flex items-center gap-2 text-muted-foreground">
				<Target class="h-4 w-4" />
				<span class="text-xs font-semibold uppercase tracking-wider">Goal Progress</span>
			</div>
			<div>
				<div class="mb-1 flex items-end gap-2">
					<span class="text-3xl font-bold text-blue-500">{goalStats.completionRate}%</span>
				</div>
				<p class="text-xs text-muted-foreground">
					{goalStats.completed} of {goalStats.total} completed
				</p>
			</div>
			<div class="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
				<div
					class="h-full rounded-full bg-blue-500 transition-all duration-500"
					style="width: {goalStats.completionRate}%"
				></div>
			</div>
		</div>

		<!-- 3. Active Goals (Wide List) -->
		<div class="row-span-2 flex flex-col rounded-xl border bg-card p-5 md:col-span-2 lg:col-span-2">
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-2 text-muted-foreground">
					<ListTodo class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Active Goals</span>
				</div>
				<!-- <button class="text-xs text-primary hover:underline">View All</button> -->
			</div>

			<div class="flex-1 space-y-4 overflow-y-auto pr-1">
				{#if activeGoals.length > 0}
					{#each activeGoals as goal}
						<div
							class="group rounded-lg border border-border/50 bg-muted/20 p-3 transition-colors hover:bg-muted/30"
						>
							<div class="mb-2 flex items-start justify-between">
								<h4 class="text-sm font-medium">{goal.title}</h4>
								<Badge
									variant="outline"
									class="rounded px-1.5 py-0.5 text-[10px] {getStatusColor(goal.status)}"
								>
									{goal.status.replace('_', ' ')}
								</Badge>
							</div>
							<div class="mb-1.5 flex justify-between text-xs text-muted-foreground">
								<span>Due: {formatDate(goal.targetDate)}</span>
								<span>{goal.progressPercentage}%</span>
							</div>
							<div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
								<div
									class="h-full rounded-full bg-primary transition-all"
									style="width: {goal.progressPercentage}%"
								></div>
							</div>
						</div>
					{/each}
				{:else}
					<div class="flex h-full items-center justify-center text-center">
						<p class="text-sm text-muted-foreground">No active goals.</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- 4. Review History (Medium List) -->
		<div
			class="row-span-2 flex flex-col overflow-hidden rounded-xl border bg-card md:col-span-1 lg:col-span-2"
		>
			<div class="flex items-center justify-between border-b border-border p-5">
				<div class="flex items-center gap-2 text-muted-foreground">
					<History class="h-4 w-4" />
					<span class="text-xs font-semibold uppercase tracking-wider">Review History</span>
				</div>
			</div>

			<div class="flex-1 overflow-y-auto">
				<div class="divide-y divide-border/50">
					{#if reviews.length > 0}
						{#each reviews as review}
							<div
								class="flex items-center justify-between p-4 transition-colors hover:bg-muted/20"
							>
								<div>
									<p class="text-sm font-medium">{review.reviewPeriod || 'Performance Review'}</p>
									<p class="text-xs text-muted-foreground">
										{formatDate(review.createdAt)} • By {review.reviewer?.displayName || 'Unknown'}
									</p>
								</div>
								<div class="text-right">
									<span class="font-bold text-emerald-500">{review.overallRating || '-'}</span>
									<p class="text-[10px] uppercase text-muted-foreground">
										{review.overallRating ? getRatingLabel(review.overallRating) : 'N/A'}
									</p>
								</div>
							</div>
						{/each}
					{:else}
						<div class="p-8 text-center text-sm text-muted-foreground">No reviews found.</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- New Goal Modal -->
	{#if showNewGoalForm}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
		>
			<div class="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
				<h2 class="mb-4 text-lg font-semibold text-foreground">Create New Goal</h2>
				<form onsubmit={handleSubmitGoal} class="space-y-4">
					<div class="space-y-2">
						<label for="goalTitle" class="text-sm font-medium text-foreground">Goal Title</label>
						<input
							id="goalTitle"
							type="text"
							bind:value={newGoal.title}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							placeholder="Enter goal title..."
						/>
					</div>

					<div class="space-y-2">
						<label for="goalDescription" class="text-sm font-medium text-foreground"
							>Description</label
						>
						<textarea
							id="goalDescription"
							bind:value={newGoal.description}
							rows="3"
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
							placeholder="Describe your goal..."
						></textarea>
					</div>

					<div class="space-y-2">
						<label for="goalTargetDate" class="text-sm font-medium text-foreground"
							>Target Date</label
						>
						<input
							id="goalTargetDate"
							type="date"
							bind:value={newGoal.targetDate}
							required
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
						/>
					</div>

					<div class="flex justify-end gap-3 pt-4">
						<Button
							type="button"
							variant="outline"
							onclick={() => (showNewGoalForm = false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? 'Creating...' : 'Create Goal'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
