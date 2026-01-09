<script lang="ts">
	import { BarChart3, Calendar, Target, TrendingUp, Users } from '@lucide/svelte';

	interface Props {
		open: boolean;
		currentGoal: any;
		canEditGoals: boolean;
		onClose: () => void;
		onEdit: (goal: any) => void;
		onProgress: (goal: any) => void;
	}

	const {
		open = $bindable(),
		currentGoal,
		canEditGoals,
		onClose,
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

{#if open && currentGoal}
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
					onclick={onClose}
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
					onclick={() => onProgress(currentGoal)}
					class="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
				>
					Update Progress
				</button>
				<button onclick={onClose} class="rounded-md border px-4 py-2 text-sm hover:bg-accent">
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
