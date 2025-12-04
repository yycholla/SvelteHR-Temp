<script lang="ts">
	import {
		Search,
		ClipboardCheck,
		Calendar,
		CheckCircle2,
		Clock,
		ChevronRight,
		AlertCircle
	} from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';

	let { data } = $props();

	let searchQuery = $state('');

	let filteredAssignments = $derived(
		(data.assignments || []).filter((a: any) => {
			const title = a.onboardingModule?.title || '';
			const description = a.onboardingModule?.description || '';
			return (
				title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				description.toLowerCase().includes(searchQuery.toLowerCase())
			);
		})
	);

	// Statistics
	let totalAssignments = $derived(data.assignments?.length || 0);
	let completedAssignments = $derived(
		data.assignments?.filter((a: any) => a.isCompleted).length || 0
	);
	let overdueAssignments = $derived(data.assignments?.filter((a: any) => a.isOverdue).length || 0);
	let completionPercentage = $derived(
		totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0
	);

	function formatDate(dateStr: string | null) {
		if (!dateStr) return null;
		return new Date(dateStr).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>My Onboarding - MountainHR</title>
</svelte:head>

<div class="container mx-auto p-6 md:p-10 max-w-7xl space-y-8">
	<!-- Header -->
	<div class="flex flex-col gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">My Onboarding</h1>
			<p class="text-muted-foreground">
				Complete your onboarding modules and required documentation.
			</p>
		</div>

		<!-- Progress Overview -->
		{#if totalAssignments > 0}
			<Card.Root>
				<Card.Content class="p-6">
					<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Overall Progress</p>
							<div class="flex items-baseline gap-2">
								<span class="text-3xl font-bold">{completionPercentage}%</span>
								<span class="text-sm text-muted-foreground"
									>({completedAssignments}/{totalAssignments})</span
								>
							</div>
							<Progress value={completionPercentage} class="h-2" />
						</div>
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Total Modules</p>
							<div class="flex items-center gap-2">
								<ClipboardCheck class="h-5 w-5 text-muted-foreground" />
								<span class="text-2xl font-bold">{totalAssignments}</span>
							</div>
						</div>
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Completed</p>
							<div class="flex items-center gap-2">
								<CheckCircle2 class="h-5 w-5 text-green-500" />
								<span class="text-2xl font-bold text-green-600">{completedAssignments}</span>
							</div>
						</div>
						<div class="space-y-2">
							<p class="text-sm font-medium text-muted-foreground">Overdue</p>
							<div class="flex items-center gap-2">
								<AlertCircle class="h-5 w-5 text-destructive" />
								<span class="text-2xl font-bold text-destructive">{overdueAssignments}</span>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Search -->
		<div class="relative w-full md:w-64">
			<Search class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
			<Input placeholder="Search onboarding..." class="pl-8" bind:value={searchQuery} />
		</div>
	</div>

	<!-- Onboarding Modules Grid -->
	{#if filteredAssignments.length === 0}
		<div
			class="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5"
		>
			<ClipboardCheck class="h-12 w-12 mb-4 opacity-20" />
			<p class="text-lg font-medium">No onboarding modules found</p>
			<p class="text-sm">
				{searchQuery
					? 'Try adjusting your search query'
					: "You don't have any assigned onboarding modules"}
			</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each filteredAssignments as assignment (assignment.id)}
				{@const module = assignment.onboardingModule}
				<Card.Root
					class="flex flex-col h-full transition-all hover:shadow-md {assignment.isOverdue
						? 'border-destructive/50'
						: ''}"
				>
					<Card.Header>
						<div class="flex justify-between items-start gap-2">
							<Card.Title class="text-xl line-clamp-2 leading-tight"
								>{module?.title || 'Untitled Module'}</Card.Title
							>
							{#if assignment.isCompleted}
								<Badge variant="default" class="shrink-0 bg-green-500 hover:bg-green-600">
									<CheckCircle2 class="mr-1 h-3 w-3" />
									Completed
								</Badge>
							{:else if assignment.isOverdue}
								<Badge variant="destructive" class="shrink-0">
									<AlertCircle class="mr-1 h-3 w-3" />
									Overdue
								</Badge>
							{:else}
								<Badge variant="outline" class="shrink-0">In Progress</Badge>
							{/if}
						</div>
						{#if module?.description}
							<Card.Description class="line-clamp-2 mt-2">
								{module.description}
							</Card.Description>
						{/if}
					</Card.Header>

					<Card.Content class="flex-1">
						<div class="space-y-4">
							{#if module?.category}
								<Badge variant="secondary" class="text-xs font-normal">{module.category}</Badge>
							{/if}

							<div class="space-y-2 text-sm text-muted-foreground">
								<div class="flex items-center gap-2">
									<Clock class="h-4 w-4" />
									<span>Assigned: {formatDate(assignment.assignedAt)}</span>
								</div>
								{#if assignment.dueDate}
									<div
										class="flex items-center gap-2 {assignment.isOverdue
											? 'text-destructive font-medium'
											: ''}"
									>
										<Calendar class="h-4 w-4" />
										<span>Due: {formatDate(assignment.dueDate)}</span>
									</div>
								{/if}
								{#if assignment.completedAt}
									<div class="flex items-center gap-2 text-green-600">
										<CheckCircle2 class="h-4 w-4" />
										<span>Completed: {formatDate(assignment.completedAt)}</span>
									</div>
								{/if}
							</div>
						</div>
					</Card.Content>

					<Card.Footer class="pt-4 mt-auto border-t bg-muted/5">
						<Button
							href={`/dashboard/onboarding/${assignment.onboardingModuleId}`}
							class="w-full group"
							disabled={assignment.isCompleted}
						>
							{assignment.isCompleted ? 'Completed' : 'Start Module'}
							{#if !assignment.isCompleted}
								<ChevronRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							{/if}
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
