<script lang="ts">
	/**
	 * GoalAssociationTabs Component
	 * Feature: 023-reviews-creation-it
	 * Task: T030
	 *
	 * Tabs component for creating new goals and linking existing goals to reviews
	 */
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Calendar, Plus, Search, Target, X } from '@lucide/svelte';
	import { type CreateGoalInput, CreateGoalSchema } from '$lib/schemas/reviews';
	import type { GoalFilter } from '$lib/schemas/reviews';

	// Props
	let {
		linkedGoalIds = $bindable<string[]>([]),
		newGoals = $bindable<CreateGoalInput[]>([]),
		availableGoals = [],
		employeeId,
		disabled = false
	}: {
		linkedGoalIds?: string[];
		newGoals?: CreateGoalInput[];
		availableGoals?: any[];
		employeeId: string;
		disabled?: boolean;
	} = $props();

	// New goal form state
	let newGoalForm = $state<CreateGoalInput>({
		title: '',
		description: '',
		targetCompletionDate: '',
		successMetrics: ''
	});

	let newGoalErrors = $state<Record<string, string>>({});

	// Search filter for existing goals
	let searchQuery = $state('');

	// Filtered available goals
	const filteredGoals = $derived(
		availableGoals.filter(
			(goal) =>
				goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				goal.description?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Check if goal is already linked
	function isGoalLinked(goalId: string): boolean {
		return linkedGoalIds.includes(goalId);
	}

	// Toggle existing goal selection
	function toggleGoalSelection(goalId: string) {
		if (isGoalLinked(goalId)) {
			linkedGoalIds = linkedGoalIds.filter((id) => id !== goalId);
		} else {
			linkedGoalIds = [...linkedGoalIds, goalId];
		}
	}

	// Validate new goal form
	function validateNewGoal(): boolean {
		const result = CreateGoalSchema.safeParse(newGoalForm);
		if (!result.success) {
			newGoalErrors = {};
			result.error.errors.forEach((err) => {
				if (err.path[0]) {
					newGoalErrors[err.path[0] as string] = err.message;
				}
			});
			return false;
		}
		newGoalErrors = {};
		return true;
	}

	// Add new goal
	function addNewGoal() {
		if (validateNewGoal()) {
			newGoals = [...newGoals, { ...newGoalForm }];
			// Reset form
			newGoalForm = {
				title: '',
				description: '',
				targetCompletionDate: '',
				successMetrics: ''
			};
		}
	}

	// Remove new goal from list
	function removeNewGoal(index: number) {
		newGoals = newGoals.filter((_, i) => i !== index);
	}

	// Remove linked goal
	function removeLinkedGoal(goalId: string) {
		linkedGoalIds = linkedGoalIds.filter((id) => id !== goalId);
	}

	// Get linked goals with details
	const linkedGoalsWithDetails = $derived(
		availableGoals.filter((goal) => linkedGoalIds.includes(goal.id))
	);

	// Total goals count
	const totalGoalsCount = $derived(newGoals.length + linkedGoalIds.length);
</script>

<div class="goal-association-tabs">
	<Tabs.Root value="create" class="w-full">
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="create">
				<Plus class="w-4 h-4 mr-2" />
				Create New Goal
			</Tabs.Trigger>
			<Tabs.Trigger value="link">
				<Target class="w-4 h-4 mr-2" />
				Link Existing Goals ({availableGoals.length})
			</Tabs.Trigger>
		</Tabs.List>

		<!-- Create New Goal Tab -->
		<Tabs.Content value="create" class="space-y-4">
			<div class="space-y-4">
				<div>
					<Label for="goal-title">
						Goal Title <span class="text-destructive">*</span>
					</Label>
					<Input
						id="goal-title"
						bind:value={newGoalForm.title}
						placeholder="e.g., Complete product roadmap"
						maxlength={255}
						{disabled}
						class={newGoalErrors.title ? 'border-destructive' : ''}
					/>
					{#if newGoalErrors.title}
						<p class="text-sm text-destructive mt-1">{newGoalErrors.title}</p>
					{/if}
				</div>

				<div>
					<Label for="goal-description">
						Description <span class="text-destructive">*</span>
					</Label>
					<Textarea
						id="goal-description"
						bind:value={newGoalForm.description}
						placeholder="Describe the goal and what success looks like..."
						rows={3}
						{disabled}
						class={newGoalErrors.description ? 'border-destructive' : ''}
					/>
					{#if newGoalErrors.description}
						<p class="text-sm text-destructive mt-1">{newGoalErrors.description}</p>
					{/if}
				</div>

				<div>
					<Label for="goal-target-date">
						Target Completion Date <span class="text-destructive">*</span>
					</Label>
					<Input
						id="goal-target-date"
						type="date"
						bind:value={newGoalForm.targetCompletionDate}
						{disabled}
						class={newGoalErrors.targetCompletionDate ? 'border-destructive' : ''}
					/>
					{#if newGoalErrors.targetCompletionDate}
						<p class="text-sm text-destructive mt-1">{newGoalErrors.targetCompletionDate}</p>
					{/if}
				</div>

				<div>
					<Label for="goal-metrics">
						Success Metrics <span class="text-destructive">*</span>
					</Label>
					<Textarea
						id="goal-metrics"
						bind:value={newGoalForm.successMetrics}
						placeholder="How will success be measured?"
						rows={2}
						{disabled}
						class={newGoalErrors.successMetrics ? 'border-destructive' : ''}
					/>
					{#if newGoalErrors.successMetrics}
						<p class="text-sm text-destructive mt-1">{newGoalErrors.successMetrics}</p>
					{/if}
				</div>

				<Button onclick={addNewGoal} {disabled} class="w-full">
					<Plus class="w-4 h-4 mr-2" />
					Add Goal to Review
				</Button>
			</div>
		</Tabs.Content>

		<!-- Link Existing Goals Tab -->
		<Tabs.Content value="link" class="space-y-4">
			<div class="relative">
				<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
				<Input
					bind:value={searchQuery}
					placeholder="Search existing goals..."
					class="pl-10"
					{disabled}
				/>
			</div>

			<div class="space-y-2 max-h-[400px] overflow-y-auto">
				{#if filteredGoals.length === 0}
					<div class="text-center py-8 text-muted-foreground">
						{#if availableGoals.length === 0}
							<Target class="w-12 h-12 mx-auto mb-2 opacity-20" />
							<p>No existing goals found for this employee.</p>
							<p class="text-sm">Create new goals in the "Create New Goal" tab.</p>
						{:else}
							<p>No goals match your search.</p>
						{/if}
					</div>
				{:else}
					{#each filteredGoals as goal (goal.id)}
						<Card.Root class="cursor-pointer hover:bg-accent/50 transition-colors">
							<Card.Content class="p-4">
								<div class="flex items-start gap-3">
									<Checkbox
										checked={isGoalLinked(goal.id)}
										onCheckedChange={() => toggleGoalSelection(goal.id)}
										{disabled}
									/>
									<div class="flex-1 min-w-0">
										<h4 class="font-medium text-sm">{goal.title}</h4>
										{#if goal.description}
											<p class="text-sm text-muted-foreground mt-1 line-clamp-2">
												{goal.description}
											</p>
										{/if}
										<div class="flex items-center gap-2 mt-2">
											<Badge variant="outline" class="text-xs">
												{goal.status?.toUpperCase() || 'ACTIVE'}
											</Badge>
											{#if goal.targetDate}
												<span class="text-xs text-muted-foreground flex items-center gap-1">
													<Calendar class="w-3 h-3" />
													{new Date(goal.targetDate).toLocaleDateString()}
												</span>
											{/if}
										</div>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				{/if}
			</div>
		</Tabs.Content>
	</Tabs.Root>

	<!-- Linked Goals Summary -->
	{#if totalGoalsCount > 0}
		<div class="mt-6">
			<h3 class="text-sm font-medium mb-3">
				Goals Associated with Review ({totalGoalsCount})
			</h3>

			<div class="space-y-2">
				<!-- New Goals -->
				{#each newGoals as goal, index (index)}
					<Card.Root class="bg-primary/5 border-primary/20">
						<Card.Content class="p-3">
							<div class="flex items-start justify-between">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<Badge variant="default" class="text-xs">NEW</Badge>
										<h4 class="font-medium text-sm">{goal.title}</h4>
									</div>
									<p class="text-xs text-muted-foreground mt-1 line-clamp-1">
										{goal.description}
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeNewGoal(index)}
									{disabled}
									class="h-8 w-8 p-0"
								>
									<X class="w-4 h-4" />
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}

				<!-- Linked Existing Goals -->
				{#each linkedGoalsWithDetails as goal (goal.id)}
					<Card.Root>
						<Card.Content class="p-3">
							<div class="flex items-start justify-between">
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2">
										<Badge variant="outline" class="text-xs">EXISTING</Badge>
										<h4 class="font-medium text-sm">{goal.title}</h4>
									</div>
									{#if goal.description}
										<p class="text-xs text-muted-foreground mt-1 line-clamp-1">
											{goal.description}
										</p>
									{/if}
								</div>
								<Button
									variant="ghost"
									size="sm"
									onclick={() => removeLinkedGoal(goal.id)}
									{disabled}
									class="h-8 w-8 p-0"
								>
									<X class="w-4 h-4" />
								</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.goal-association-tabs {
		width: 100%;
	}
</style>
